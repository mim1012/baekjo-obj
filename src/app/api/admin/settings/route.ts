import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { saveSiteSettings } from '@/lib/settings/repo';
import { normalizeHomeSettings, type HomeSettings } from '@/data/homeContent';
import { EXPIRE_PUBLIC_READ_CACHE, PUBLIC_READ_CACHE_TAGS } from '@/lib/public-read-cache';
import { logServerError } from '@/lib/logServerError';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  CmsRevisionConflictError,
  getCmsPageState,
  publishCmsPage,
  saveCmsPageDraft,
} from '@/lib/cms/repo';
import {
  HOME_CMS_PAGE_KEY,
  homeContentWithFallback,
  normalizeCmsHomeContent,
} from '@/lib/cms/home';

/**
 * 본문이 HomeSettings 모양인지 최소 검증한다. 값은 관리자만 저장하는 신뢰 입력이지만,
 * 통째로 jsonb 로 들어가므로 최상위 섹션 키가 모두 객체로 존재하는지만 확인해
 * 깨진 페이로드가 저장돼 화면이 조용히 깨지는 것을 막는다(§4). 통과한 본문은 저장 직전
 * normalizeHomeSettings 로 현재 스키마 모양으로 정규화해 저장한다(부분 입력도 안전하게 채움).
 */
function readExpectedRevision(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null;
  const revision = (body as { expectedRevision?: unknown }).expectedRevision;
  return typeof revision === 'number' && Number.isSafeInteger(revision) && revision > 0
    ? revision
    : null;
}

async function revalidateHome() {
  revalidateTag(PUBLIC_READ_CACHE_TAGS.siteSettings, EXPIRE_PUBLIC_READ_CACHE);
  revalidatePath('/');
}

function conflictResponse() {
  return NextResponse.json(
    { error: 'revision-conflict', message: '다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 시도해 주세요.' },
    { status: 409 },
  );
}

/** GET — 관리자가 편집할 draft와 현재 게시 revision을 함께 조회한다. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  try {
    const page = await getCmsPageState<unknown>(HOME_CMS_PAGE_KEY);
    if (!page) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({
      settings: homeContentWithFallback(page.draftContent),
      draftRevision: page.draftRevision,
      publishedRevision: page.publishedRevision,
      publishedAt: page.publishedAt,
      hasUnpublishedChanges: page.draftRevision !== page.publishedRevision,
    });
  } catch (error) {
    logServerError('[GET /api/admin/settings] CMS draft 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/** PATCH — 공개본을 건드리지 않고 draft만 저장한다. */
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  const expectedRevision = readExpectedRevision(body);
  const settings = normalizeCmsHomeContent((body as { settings?: unknown })?.settings);
  if (expectedRevision === null || !settings) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  try {
    const page = await saveCmsPageDraft({
      pageKey: HOME_CMS_PAGE_KEY,
      content: settings,
      expectedRevision,
      actorId: admin.requester.id,
    });
    return NextResponse.json({ ok: true, draftRevision: page.draftRevision });
  } catch (error) {
    if (error instanceof CmsRevisionConflictError) return conflictResponse();
    logServerError('[PATCH /api/admin/settings] CMS draft 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/** POST — 현재 draft를 원자적으로 게시하고 공개 홈 캐시를 무효화한다. */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  const expectedRevision = readExpectedRevision(body);
  if (expectedRevision === null) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  try {
    const published = await publishCmsPage({
      pageKey: HOME_CMS_PAGE_KEY,
      expectedRevision,
      actorId: admin.requester.id,
    });
    await revalidateHome();
    return NextResponse.json({ ok: true, ...published });
  } catch (error) {
    if (error instanceof CmsRevisionConflictError) return conflictResponse();
    logServerError('[POST /api/admin/settings] CMS 게시 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/settings — 관리자 홈 CMS 설정 저장.
 * proxy.ts가 /api/admin/* 을 이미 가드하지만 JWT의 role은 로그인 시점 스냅샷이라, DB에서
 * 강등/비활성화돼도 세션 만료 전까지 admin 권한이 남는다. 매 요청마다 DB에서 재조회해
 * 실제로 admin이고 active인지 다시 확인한다(admin/orders·admin/insurance와 동일 방어).
 */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  const settings = normalizeCmsHomeContent(body);
  if (!settings) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    // 전환기 호환: 기존 클라이언트의 PUT은 draft 저장과 게시를 연속 수행한다.
    const page = await getCmsPageState<HomeSettings>(HOME_CMS_PAGE_KEY);
    if (!page) {
      await saveSiteSettings(normalizeHomeSettings(body));
    } else {
      const saved = await saveCmsPageDraft({
        pageKey: HOME_CMS_PAGE_KEY,
        content: settings,
        expectedRevision: page.draftRevision,
        actorId: admin.requester.id,
      });
      await publishCmsPage({
        pageKey: HOME_CMS_PAGE_KEY,
        expectedRevision: saved.draftRevision,
        actorId: admin.requester.id,
      });
    }
    await revalidateHome();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof CmsRevisionConflictError) return conflictResponse();
    logServerError('[PUT /api/admin/settings] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
