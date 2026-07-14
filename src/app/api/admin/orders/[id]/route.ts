import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById } from '@/lib/members/repo';
import {
  updateOrderStatus,
  cancelReservationAndRestore,
  type OrderStatusUpdate,
} from '@/lib/orders/repo';
import { logServerError } from '@/lib/logServerError';
import { ORDER_STATUSES, PAYMENT_STATUSES as ALL_PAYMENT_STATUSES, type OrderStatus, type PaymentStatus } from '@/types';

// paymentStatus/deliveryStatus는 Order 타입에서 자유 text라 서버가 별도 화이트리스트로 좁힌다.
// 실제 쓰이는 값만 담았다 — admin/orders/page.tsx의 select 옵션 + POST /api/orders 가 생성 시
// 부여하는 값(입금대기/배송준비) 기준.
//
// '승인중'은 도메인 전체 상태값(PAYMENT_STATUSES)에는 있지만 관리자가 수동으로 세팅할 수 없다 —
// claim 보호 상태라서다(토스 결제 승인 RPC가 `WHERE payment_status='승인중' AND payment_key=?`로
// 잠그는 중간 상태, orders/repo.ts). 타입 부분집합으로 파생시켜, 도메인에 상태가 추가돼도
// 컴파일러가 이 화이트리스트를 다시 검토하도록 강제한다(LOW-1). 파생 결과는 기존 리터럴 배열과
// 정확히 같은 집합이어야 한다: ['결제대기','입금대기','결제완료','결제취소','환불완료'].
const PAYMENT_STATUSES: readonly PaymentStatus[] = ALL_PAYMENT_STATUSES.filter((s) => s !== '승인중');
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
 * 관리자 취소 요청이면 재고 복원을 취소 RPC(cancelReservationAndRestore)로 배선한다
 * (재고 유실 버그 수정 — 이전엔 관리자 취소가 상태만 바꾸고 복원 RPC를 전혀 호출하지 않았다).
 *
 * ⚠️ 이중 복원 금지가 최상위 불변식이다. cancelReservationAndRestore(0031 rpc)는
 * `WHERE payment_status in ('결제대기','입금대기')` 상태 조건 UPDATE라 호출 자체가 멱등하다
 * (매치되면 취소+복원을 한 트랜잭션으로 수행하고 true, 이미 취소·확정된 주문이면 0행 매치로
 * false) — 그래서 "상태를 먼저 바꾸고 나중에 복원"하는 2단계 방식은 절대 쓰지 않고, 이 RPC를
 * 상태 변경의 진실 소스로 그대로 재사용한다.
 * - RPC가 true(복원 수행)면 orderStatus='취소완료'/paymentStatus='결제취소'는 이미 RPC가
 *   세팅했으므로 updateOrderStatus에서 그 두 필드를 제외한 나머지(trackingNumber 등)만 반영한다.
 * - RPC가 false면(이미 결제완료로 확정된 주문을 취소하는 경우 등 — 환불은 별도 절차이므로
 *   의도적으로 복원하지 않는다. 또는 이미 취소된 주문에 대한 멱등 재호출) 기존과 동일하게
 *   updateOrderStatus로 요청된 모든 필드를 그대로 반영한다. 복원이 일어나지 않았음을 로그로
 *   남긴다.
 */
async function applyOrderUpdates(id: string, updates: OrderStatusUpdate): Promise<void> {
  const isCancelRequest =
    updates.orderStatus === '취소완료' || updates.paymentStatus === '결제취소';

  if (!isCancelRequest) {
    await updateOrderStatus(id, updates);
    return;
  }

  const restored = await cancelReservationAndRestore(id);
  if (!restored) {
    logServerError(
      `[PATCH /api/admin/orders/[id]] 관리자 취소 요청이나 재고 복원 RPC 미매치(이미 결제완료로 ` +
        `확정됐거나 이미 취소된 주문일 수 있음 — 환불은 별도 절차) orderId=${id}`,
      {},
    );
    await updateOrderStatus(id, updates);
    return;
  }

  // RPC가 이미 orderStatus/paymentStatus를 세팅했으므로 나머지 필드만 반영한다.
  const { orderStatus: _orderStatus, paymentStatus: _paymentStatus, ...rest } = updates;
  if (Object.keys(rest).length > 0) {
    await updateOrderStatus(id, rest);
  }
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

    await applyOrderUpdates(id, updates);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logServerError('[PATCH /api/admin/orders/[id]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
