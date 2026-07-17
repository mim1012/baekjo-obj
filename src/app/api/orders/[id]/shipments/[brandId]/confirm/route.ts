import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById } from '@/lib/members/repo';
import { getOrderById } from '@/lib/orders/repo';
import { confirmShipmentIfDelivered, listShipmentsByOrder } from '@/lib/shipments/repo';
import { decideShipmentConfirm } from '@/lib/shipments/derive';
import { logServerError } from '@/lib/logServerError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/orders/[id]/shipments/[brandId]/confirm — 고객 구매확정(마이페이지 배송 모달).
 * 소유자 또는 admin(대행 확정 허용)일 때만 처리. 그 외는 주문 존재를 은폐하기 위해 404
 * (GET /api/orders/[id]와 동일 패턴). '배송완료' 송장만 '구매확정'으로 전이한다(조건부 UPDATE).
 */
export async function POST(_request: Request, context: { params: Promise<{ id: string; brandId: string }> }) {
  const { id, brandId } = await context.params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  try {
    const session = await auth();
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    const memberId = session?.user?.memberId;
    const isOwner = Boolean(memberId) && order.memberId === memberId;

    let isAdmin = false;
    if (!isOwner && session?.user?.role === 'admin' && session.user.memberId) {
      const requester = await findMemberById(session.user.memberId);
      isAdmin = requester !== null && requester.role === 'admin' && requester.status !== 'inactive';
    }

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    // brandId가 그 주문의 items에 실제로 스냅샷된 브랜드가 아니면 404 — 고객 표면이라 존재를 은폐한다.
    if (!order.items.some((it) => it.brandId === brandId)) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    // 결제·멱등 사전 판정. 미결제 주문의 구매확정을 막는다(정산이 구매확정을 소비하게 되면 HIGH) —
    // 단 이미 '구매확정'된 송장의 재확정은 비파괴 멱등이라 결제상태와 무관하게 200으로 통과시킨다.
    const current = (await listShipmentsByOrder(id)).find((s) => s.brandId === brandId);
    const decision = decideShipmentConfirm(order.paymentStatus, current);
    if (decision === 'idempotent-ok') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    if (decision === 'blocked-unpaid') {
      return NextResponse.json({ error: 'order-not-paid' }, { status: 409 });
    }

    const confirmed = await confirmShipmentIfDelivered(id, brandId, new Date().toISOString());
    if (confirmed) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // 조건부 UPDATE가 0행 — current는 위에서 읽은 뒤라 경합으로 이미 확정됐을 수 있으니 재조회로 판별한다.
    // '구매확정'이면 멱등(경합 확정)으로 보고 200, 그 외(아직 배송완료가 아니거나 행 자체가 없음)는
    // 409로 "아직 확정할 수 없음"을 알린다.
    const row = (await listShipmentsByOrder(id)).find((s) => s.brandId === brandId);
    if (row?.deliveryStatus === '구매확정') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    return NextResponse.json({ error: 'not-deliverable' }, { status: 409 });
  } catch (error) {
    logServerError('[POST /api/orders/[id]/shipments/[brandId]/confirm] 확정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
