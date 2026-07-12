import { NextResponse, type NextRequest } from 'next/server';
import { cancelReservationAndRestore } from '@/lib/orders/repo';
import { logServerError } from '@/lib/logServerError';

const MAX_ORDER_ID = 100;

function validate(body: unknown): string | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.orderId !== 'string' || b.orderId.length < 1 || b.orderId.length > MAX_ORDER_ID) return null;
  return b.orderId;
}

/**
 * POST /api/payments/cancel — 결제창 취소(failUrl)·이탈 시 재고 선점 즉시 복원.
 * 게스트 호출이라 세션 불요 — cancelReservationAndRestore가 '결제대기'건에만 작동하고
 * 확정건은 no-op이라 악용 여지가 최소화된다(§ 리뷰 인계사항: 단일 원자 RPC 호출만 사용).
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const orderId = validate(body);
  if (!orderId) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    // 반환 true=이번 호출이 취소·복원을 수행, false=이미 처리된 주문(확정/취소)이라 no-op.
    // 취소+복원이 단일 DB 트랜잭션(0024)이라 cron·다른 cancel 호출과 경합해도 이중 복원이 없다
    // — 둘 다 200으로 응답(idempotent).
    await cancelReservationAndRestore(orderId);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[POST /api/payments/cancel] 취소·복원 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
