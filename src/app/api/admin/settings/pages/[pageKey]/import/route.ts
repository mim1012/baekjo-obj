import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { CmsSourceImportConflictError, publishCmsPageFromSource } from '@/lib/cms/importPublished';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { getCmsSourceBuilder, type CmsSourceRow } from '@/lib/cms/source/registry';
import { getSupabase } from '@/lib/supabase/server';
import { logServerError } from '@/lib/logServerError';

// 범용 소스 결속 "현재 값 가져오기(최초 활성화)" 라우트(D1). 기존 audit 전용
// /api/admin/settings/pages/audit/import-publish 는 그대로 두고(D2), 이 라우트는 모든
// CMS_PAGE_DEFINITIONS 키에 대해 동작한다 — 단, 소스 매퍼가 아직 실 데이터에 연결되지 않은
// 페이지(bootstrapReady:false, U3~U9 이전)는 409로 거절한다. 콘텐츠는 항상 서버가 현재
// site_settings 원본으로 계산한다 — 클라이언트가 보낸 content 는 절대 받지 않는다.
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

    const published = await publishCmsPageFromSource({
      pageKey,
      expectedRevision,
      sources,
      actorId: admin.requester.id,
    });
    revalidateCmsRoute(pageKey, definition.route);
    return NextResponse.json({ ok: true, ...published });
  } catch (error) {
    if (error instanceof CmsSourceImportConflictError) {
      return NextResponse.json(
        { error: 'source-or-revision-conflict', message: '원본 데이터 또는 CMS 상태가 변경되어 가져오지 못했습니다.' },
        { status: 409 },
      );
    }
    logServerError(`[POST /api/admin/settings/pages/${pageKey}/import] 초기 가져오기 실패`, error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
