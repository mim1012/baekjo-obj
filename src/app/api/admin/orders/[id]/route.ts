import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById } from '@/lib/members/repo';
import {
  updateOrderStatus,
  updatePaymentStatusGuarded,
  cancelReservationAndRestore,
  getOrderById,
  type OrderStatusUpdate,
} from '@/lib/orders/repo';
import {
  applyOrderUpdates,
  OrderNotFoundError,
  PaymentTransitionError,
  PaymentStatusConflictError,
} from '@/lib/orders/applyOrderUpdates';
import { logServerError, logServerWarn } from '@/lib/logServerError';
import { isCarrierCode } from '@/lib/carriers';
import {
  DELIVERY_STATUSES,
  ORDER_STATUSES,
  PAYMENT_STATUSES as ALL_PAYMENT_STATUSES,
  type DeliveryStatus,
  type OrderStatus,
  type PaymentStatus,
} from '@/types';

// paymentStatus는 Order 타입에서 자유 text라 서버가 별도 화이트리스트로 좁힌다.
// deliveryStatus는 src/types/index.ts DELIVERY_STATUSES를 클라이언트 옵션과 서버 검증의 진실 소스로 공유한다.
//
// '승인중'은 도메인 전체 상태값(PAYMENT_STATUSES)에는 있지만 관리자가 수동으로 세팅할 수 없다 —
// claim 보호 상태라서다(토스 결제 승인 RPC가 `WHERE payment_status='승인중' AND payment_key=?`로
// 잠그는 중간 상태, orders/repo.ts). 타입 부분집합으로 파생시켜, 도메인에 상태가 추가돼도
// 컴파일러가 이 화이트리스트를 다시 검토하도록 강제한다(LOW-1). 파생 결과는 기존 리터럴 배열과
// 정확히 같은 집합이어야 한다: ['결제대기','입금대기','결제완료','결제취소','환불완료'].
const PAYMENT_STATUSES: readonly PaymentStatus[] = ALL_PAYMENT_STATUSES.filter((s) => s !== '승인중');
// Order.deliveryStatus 화이트리스트는 @/types 의 DELIVERY_STATUSES 로 단일화 — 로컬 사본을 두면
// 도메인에 상태가 추가돼도 이 검증만 조용히 뒤처진다(§4.6).
// Order.carrier 화이트리스트는 @/lib/carriers 로 단일화(CARRIER_CODES) — 클라이언트(관리자 select)와
// 여기 서버 검증이 각자 배열을 들면 드리프트가 난다(§4).
const MAX_TRACKING = 100;
const MAX_CARRIER = 40;
// 관리자 메모(자유 서술)라 화이트리스트가 없고 길이만 제한한다.
const MAX_MEMO = 1000;

/** 허용 필드(orderStatus/paymentStatus/deliveryStatus/trackingNumber/carrier/deliveryMemo)만
 * 추려낸다. 하나도 없으면 null. */
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
    if (!DELIVERY_STATUSES.includes(b.deliveryStatus as DeliveryStatus)) return null;
    updates.deliveryStatus = b.deliveryStatus;
  }
  if (b.trackingNumber !== undefined) {
    if (typeof b.trackingNumber !== 'string' || b.trackingNumber.length > MAX_TRACKING) return null;
    updates.trackingNumber = b.trackingNumber;
  }
  if (b.carrier !== undefined) {
    if (typeof b.carrier !== 'string' || b.carrier.length > MAX_CARRIER) return null;
    // ''는 택배사 해제 신호다 — 화이트리스트 검사를 건너뛰고 그대로 통과시킨다.
    // 그 외 문자열은 여전히 화이트리스트(CARRIER_CODES)에 없으면 400.
    if (b.carrier !== '' && !isCarrierCode(b.carrier)) return null;
    updates.carrier = b.carrier;
  }
  if (b.deliveryMemo !== undefined) {
    if (typeof b.deliveryMemo !== 'string' || b.deliveryMemo.length > MAX_MEMO) return null;
    updates.deliveryMemo = b.deliveryMemo;
  }

  if (Object.keys(updates).length === 0) return null;
  return updates;
}

// 관리자 주문 상태 변경 오케스트레이션은 src/lib/orders/applyOrderUpdates.ts(순수 로직, port 주입)로
// 분리했다 — 라우트와 단위 테스트가 같은 결정·순서 로직을 태우게 하기 위함(codex 지적). 여기서는 실제
// repo 함수를 port 로 주입한다.
const orderUpdatePorts = {
  cancelReservationAndRestore,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatusGuarded,
  onCancelFallback: (id: string) =>
    logServerError(
      `[PATCH /api/admin/orders/[id]] 관리자 취소 요청이나 재고 복원 RPC 미매치(이미 결제완료로 ` +
        `확정됐거나 이미 취소된 주문일 수 있음 — 환불은 별도 절차) orderId=${id}`,
      {},
    ),
};

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

    await applyOrderUpdates(id, updates, orderUpdatePorts);
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof OrderNotFoundError) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    // 아래 둘은 정상적인 거절(공격/경합)이라 error 레벨이 아니라 감사용 warn 으로 남긴다.
    if (error instanceof PaymentTransitionError) {
      logServerWarn(
        `[PATCH /api/admin/orders/[id]] 결제상태 전이 거부 orderId=${id}`,
        { message: `${error.fromStatus}->${error.toStatus}` },
      );
      return NextResponse.json({ error: 'invalid-payment-transition' }, { status: 409 });
    }
    if (error instanceof PaymentStatusConflictError) {
      logServerWarn(`[PATCH /api/admin/orders/[id]] 결제상태 경합(CAS 0행) orderId=${id}`, {});
      return NextResponse.json({ error: 'payment-status-conflict' }, { status: 409 });
    }
    logServerError('[PATCH /api/admin/orders/[id]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
