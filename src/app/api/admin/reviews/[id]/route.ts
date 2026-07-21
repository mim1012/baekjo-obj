import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { setProductReviewStatus, adminDeleteProductReview } from '@/lib/reviews/repo';
import { logServerError } from '@/lib/logServerError';

const VALID_STATUSES = ['published', 'hidden'] as const;

function isValidStatus(value: unknown): value is (typeof VALID_STATUSES)[number] {
  return typeof value === 'string' && (VALID_STATUSES as readonly string[]).includes(value);
}

/**
 * PATCH /api/admin/reviews/[id] — 구매평 노출/숨김 전환. 별점 재집계는 U19 DB 트리거가 자동
 * 처리한다(이 라우트는 status만 갱신). requireAdmin이 role+DB 이중 가드(§10-3).
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  const status = (body as Record<string, unknown> | null)?.status;
  if (!isValidStatus(status)) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const updated = await setProductReviewStatus(id, status);
    if (!updated) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/admin/reviews/[id]] 상태 변경 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/** DELETE /api/admin/reviews/[id] — 악성/부적절 구매평 관리자 삭제. 소유자 확인 없이 admin 권한만 필요. */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  try {
    const deleted = await adminDeleteProductReview(id);
    if (!deleted) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[DELETE /api/admin/reviews/[id]] 삭제 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
