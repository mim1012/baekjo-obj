import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { defaultShowcaseReviewsConfig, type ShowcaseReviewsConfig } from '@/lib/reviews/showcaseConfig';
import { getShowcaseReviewsConfig, saveShowcaseReviewsConfig } from '@/lib/reviews/repo';
import { isShowcaseReviewShape, normalizeShowcaseReview } from '@/lib/reviews/showcaseValidate';
import { logServerError } from '@/lib/logServerError';

/**
 * 본문이 ShowcaseReviewsConfig 모양인지 검증한다. item 단위 형상은 repo 와 공용인
 * isShowcaseReviewShape(showcaseValidate.ts)로 검사하고, 아래는 관리자 저장에만 있는 추가 규칙이다:
 * - id 는 관리자 화면의 편집 키라 중복을 거부한다.
 * - items 최소 1건 요구는 두지 않는다(notices 와의 차이) — 실제 구매평이 쌓인 뒤 전시 후기를
 *   전부 삭제하는 것도 정당한 운영 상태라 빈 배열 저장을 허용한다.
 */
function isShowcaseReviewsConfig(body: unknown): body is ShowcaseReviewsConfig {
  if (!body || typeof body !== 'object') return false;
  const { items } = body as { items?: unknown };
  if (!Array.isArray(items) || !items.every(isShowcaseReviewShape)) return false;
  const ids = items.map((review) => review.id);
  return new Set(ids).size === ids.length;
}

/**
 * GET /api/admin/showcase-reviews — 관리자 전시 후기 config 조회.
 * 저장된 행이 있으면 그 값을, 없으면 defaultShowcaseReviewsConfig 를 반환한다. 조회 실패는 500 으로 드러낸다.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let config: ShowcaseReviewsConfig = defaultShowcaseReviewsConfig;
  try {
    const saved = await getShowcaseReviewsConfig();
    if (saved) config = saved;
  } catch (error) {
    logServerError('[GET /api/admin/showcase-reviews] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
  return NextResponse.json({ items: config.items }, { status: 200 });
}

/** PUT /api/admin/showcase-reviews — 관리자 전시 후기 config 저장. requireAdmin 이 role+DB 이중 가드. */
export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  if (!isShowcaseReviewsConfig(body)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    // optional 필드 null 은 검증을 통과하므로 저장 전 undefined 로 정규화한다(showcaseValidate.ts 주석).
    await saveShowcaseReviewsConfig({ items: body.items.map(normalizeShowcaseReview) });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PUT /api/admin/showcase-reviews] 저장 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
