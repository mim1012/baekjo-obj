import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById } from '@/lib/members/repo';
import { updateOrderStatus, type OrderStatusUpdate } from '@/lib/orders/repo';
import { logServerError } from '@/lib/logServerError';
import { ORDER_STATUSES, type OrderStatus } from '@/types';

// paymentStatus/deliveryStatus는 Order 타입에서 자유 text라 서버가 별도 화이트리스트로 좁힌다.
// 실제 쓰이는 값만 담았다 — admin/orders/page.tsx의 select 옵션 + POST /api/orders 가 생성 시
// 부여하는 값(입금대기/배송준비) 기준(src/data/orders.ts는 미사용 목업이라 제외).
const PAYMENT_STATUSES = ['결제대기', '결제완료', '결제취소', '환불완료', '입금대기'] as const;
const DELIVERY_STATUSES = ['배송전', '배송준비', '배송중', '배송완료'] as const;
// Order.carrier는 자유 text라 서버가 화이트리스트로 좁힌다(PAYMENT_STATUSES/DELIVERY_STATUSES와 동일 패턴).
const CARRIERS = ['cj', 'hanjin', 'lotte', 'post', 'logen'] as const;
const MAX_TRACKING = 100;
const MAX_CARRIER = 40;

/** 허용 필드(orderStatus/paymentStatus/deliveryStatus/trackingNumber/carrier)만 추려낸다. 하나도 없으면 null. */
function validate(body: unknown): OrderStatusUpdate | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const updates: OrderStatusUpdate = {};

  if (b.orderStatus !== undefined) {
    if (typeof b.orderStatus !== 'string') return null;
    if (!ORDER_STATUSES.includes(b.orderStatus as OrderStatus)) return null;
    updates.orderStatus = b.orderStatus as OrderStatus;
  }
  if (b.paymentStatus !== undefined) {
    if (typeof b.paymentStatus !== 'string') return null;
    if (!PAYMENT_STATUSES.includes(b.paymentStatus as (typeof PAYMENT_STATUSES)[number])) return null;
    updates.paymentStatus = b.paymentStatus;
  }
  if (b.deliveryStatus !== undefined) {
    if (typeof b.deliveryStatus !== 'string') return null;
    if (!DELIVERY_STATUSES.includes(b.deliveryStatus as (typeof DELIVERY_STATUSES)[number])) return null;
    updates.deliveryStatus = b.deliveryStatus;
  }
  if (b.trackingNumber !== undefined) {
    if (typeof b.trackingNumber !== 'string' || b.trackingNumber.length > MAX_TRACKING) return null;
    updates.trackingNumber = b.trackingNumber;
  }
  if (b.carrier !== undefined) {
    if (typeof b.carrier !== 'string' || b.carrier.length > MAX_CARRIER) return null;
    if (!CARRIERS.includes(b.carrier as (typeof CARRIERS)[number])) return null;
    updates.carrier = b.carrier;
  }

  if (Object.keys(updates).length === 0) return null;
  return updates;
}

/**
 * PATCH /api/admin/orders/[id] — 관리자 주문 상태 변경.
 * proxy 1차 가드 + 라우트 내부 DB 재검증(admin && !inactive). 허용 필드만 반영한다.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json(
      { error: session?.user ? 'forbidden' : 'unauthorized' },
      { status: session?.user ? 403 : 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const updates = validate(body);
  if (!updates) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  try {
    const requester = session.user.memberId ? await findMemberById(session.user.memberId) : null;
    if (!requester || requester.role !== 'admin' || requester.status === 'inactive') {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    await updateOrderStatus(id, updates);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/admin/orders/[id]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
