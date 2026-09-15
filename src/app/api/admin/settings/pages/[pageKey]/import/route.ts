import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  CmsSourceImportConflictError,
  deriveCmsPageContentFromSources,
  publishCmsPageFromSource,
} from '@/lib/cms/importPublished';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { CmsRevisionConflictError, getCmsPageState, saveCmsPageDraft } from '@/lib/cms/repo';
import { getCmsSourceBuilder, type CmsSourceRow } from '@/lib/cms/source/registry';
import { getSupabase } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logServerError';

// 범용 소스 결속 "현재 값 가져오기(최초 활성화)" 라우트(D1). 기존 audit 전용
// /api/admin/settings/pages/audit/import-publish 는 그대로 두고(D2), 이 라우트는 모든
// CMS_PAGE_DEFINITIONS 키에 대해 동작한다 — 단, 소스 매퍼가 아직 실 데이터에 연결되지 않은
// 페이지(bootstrapReady:false, U3~U9 이전)는 409로 거절한다. 콘텐츠는 항상 서버가 현재
// site_settings 원본으로 계산한다 — 클라이언트가 보낸 content 는 절대 받지 않는다.
//
// publish_cms_page_from_source(0166, 적용됨·불변)는 draft_content == p_expected_content를
// 요구하고 그렇지 않으면 PT409(cms-content-conflict)로 거절한다. staging의 관리되지 않은(managed
// 아님) 페이지 다수는 PR311 시절 draft_content를 그대로 갖고 있어, 현재 소스에서 새로 계산한
// 콘텐츠와 다르다 — 그래서 이 라우트는 곧바로 publish를 부르지 않고, audit importer(core.mjs의
// runImport)와 같은 순서를 따른다: 1) 소스 읽기 2) 페이지 상태 조회 후 이미 관리 중(managed)이거나
// 게시되지 않은 초안이 있으면(draftRevision !== publishedRevision) 아무 것도 쓰지 않고 409
// 3) 파생 콘텐츠를 새 draft로 저장(saveCmsPageDraft, CAS) 4) 그 새 revision으로 guarded publish.
//
// public-read-cache.ts의 EXPIRE_PUBLIC_READ_CACHE와 값은 같지만 여기서 직접 정의한다 — 그 파일을
// import하면 브랜드/상품 등 무관한 리포지토리 그래프 전체가 따라 들어와, transpile-and-stub 패턴의
// 단위테스트(scripts/cms-import/*.test.mjs)가 재귀 로더로 그 그래프를 전부 태우려다 실패한다
// (2026-09-15 실측: source-guard.test.mjs가 'next/cache' unstub 에러로 깨짐).
const EXPIRE_CMS_PUBLIC_READ_CACHE = { expire: 0 } as const;

interface Context {
  readonly params: Promise<{ readonly pageKey: string }>;
}

/** body는 { expectedRevision } 하나만 허용한다 — 다른 키가 섞여 있으면 400. */
function readExpectedRevision(body: unknown): number | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const keys = Object.keys(body as Record<string, unknown>);
  if (keys.length !== 1 || keys[0] !== 'expectedRevision') return null;
  const value = (body as { readonly expectedRevision?: unknown }).expectedRevision;
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function revalidateCmsRoute(pageKey: string, route: string): void {
  revalidatePath(route === '/_site-shell' ? '/' : route);
  if (pageKey === 'site-shell') revalidatePath('/', 'layout');
  revalidateTag('cmsPages', EXPIRE_CMS_PUBLIC_READ_CACHE);
}

export async function POST(request: Request, context: Context) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  const { pageKey } = await context.params;
  const definition = getCmsPageDefinition(pageKey);
  const builder = getCmsSourceBuilder(pageKey);
  if (!definition || !builder) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  const expectedRevision = readExpectedRevision(body);
  if (expectedRevision === null) return NextResponse.json({ error: 'invalid-input' }, { status: 400 });

  if (!builder.bootstrapReady) {
    return NextResponse.json(
      { error: 'source-mapper-not-ready', message: '이 페이지의 현재 값 가져오기는 아직 준비되지 않았습니다.' },
      { status: 409 },
    );
  }

  try {
    const sources: Record<string, CmsSourceRow> = {};
    for (const id of builder.siteSettingIds) {
      const { data, error } = await getSupabase()
        .from('site_settings')
        .select('value, updated_at')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return NextResponse.json(
          { error: 'source-missing', message: '원본 데이터를 찾을 수 없어 가져오지 못했습니다.' },
          { status: 409 },
        );
      }
      sources[id] = { value: data.value, updated_at: String(data.updated_at) };
    }

    // 소스는 읽었지만 아직 아무 것도 쓰지 않았다 — 여기서부터 상태를 보고 거절할 수 있다.
    const state = await getCmsPageState<unknown>(pageKey);
    if (!state) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    if (state.managed) {
      return NextResponse.json(
        { error: 'already-managed', message: '이미 활성화된 페이지입니다.' },
        { status: 409 },
      );
    }
    if (state.draftRevision !== state.publishedRevision) {
      return NextResponse.json(
        {
          error: 'dirty-draft',
          message: '게시되지 않은 초안이 있어 현재 값 가져오기를 중단했습니다. 초안을 게시하거나 이전 게시본으로 복원한 뒤 다시 시도하세요.',
        },
        { status: 409 },
      );
    }

    // 0166의 draft_content == p_expected_content 가드를 만족시키려면 발행 전에 파생 콘텐츠를 먼저
    // draft로 저장해 그 새 revision으로 발행해야 한다(Audit importer와 동일 순서).
    const expectedContent = deriveCmsPageContentFromSources(pageKey, sources);
    const draft = await saveCmsPageDraft({
      pageKey,
      content: expectedContent,
      expectedRevision,
      actorId: admin.requester.id,
    });

    const published = await publishCmsPageFromSource({
      pageKey,
      expectedRevision: draft.draftRevision,
      sources,
      expectedContent,
      actorId: admin.requester.id,
    });
    revalidateCmsRoute(pageKey, definition.route);
    return NextResponse.json({ ok: true, ...published });
  } catch (error) {
    if (error instanceof CmsRevisionConflictError || error instanceof CmsSourceImportConflictError) {
      return NextResponse.json(
        { error: 'source-or-revision-conflict', message: '원본 데이터 또는 CMS 상태가 변경되어 가져오지 못했습니다.' },
        { status: 409 },
      );
    }
    logServerError(`[POST /api/admin/settings/pages/${pageKey}/import] 초기 가져오기 실패`, error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
