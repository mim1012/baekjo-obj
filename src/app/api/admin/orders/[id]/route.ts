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
import { isManualPaymentTransitionAllowed } from '@/lib/orders/paymentTransition';
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

/** 주문이 없어 상태를 바꿀 수 없다 → 404. */
class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`order-not-found:${id}`);
    this.name = 'OrderNotFoundError';
  }
}

/** 관리자 수동 결제상태 전이가 화이트리스트에 없다 → 409(현재 상태가 이 전이를 허용하지 않음).
 *  이중 재고복원 재생(취소→'입금대기' 되돌리기)과 증빙 없는 '결제완료' 위조를 여기서 끊는다. */
class PaymentTransitionError extends Error {
  constructor(
    public readonly fromStatus: string,
    public readonly toStatus: string,
  ) {
    super(`invalid-payment-transition:${fromStatus}->${toStatus}`);
    this.name = 'PaymentTransitionError';
  }
}

/** 현재 상태를 읽은 뒤 CAS UPDATE 사이에 다른 요청이 상태를 바꿔 0행 매치 → 409(경합). */
class PaymentStatusConflictError extends Error {
  constructor(id: string) {
    super(`payment-status-conflict:${id}`);
    this.name = 'PaymentStatusConflictError';
  }
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

  if (isCancelRequest) {
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
    return;
  }

  // 비취소 경로: paymentStatus 변경은 조건 없는 UPDATE(updateOrderStatus)로 흘리지 않고 화이트리스트
  // (isManualPaymentTransitionAllowed) + CAS(updatePaymentStatusGuarded)를 반드시 통과시킨다.
  // 이게 이중 재고복원 재생과 증빙 없는 '결제완료' 위조를 막는 지점이다. paymentStatus를 떼어낸
  // 나머지 필드(orderStatus/deliveryStatus/tracking 등)만 updateOrderStatus로 반영한다 — 그래서
  // 수동 결제상태 변경은 이 라우트에서 updateOrderStatus의 무조건 payment_status 쓰기에 절대
  // 도달하지 않는다(그 쓰기는 위 취소 경로 전용).
  const { paymentStatus, ...fields } = updates;

  if (paymentStatus !== undefined) {
    const current = await getOrderById(id);
    if (!current) throw new OrderNotFoundError(id);

    // 무변경(같은 값 재전송 — 상세 패널은 결제상태를 항상 함께 보낸다)은 전이가 아니므로 CAS를
    // 태우지 않고 건너뛴다. 실제로 값이 바뀔 때만 화이트리스트·CAS를 적용한다.
    if (current.paymentStatus !== paymentStatus) {
      if (!isManualPaymentTransitionAllowed(current.paymentStatus, paymentStatus)) {
        throw new PaymentTransitionError(current.paymentStatus, paymentStatus);
      }
      const changed = await updatePaymentStatusGuarded(id, current.paymentStatus, paymentStatus);
      if (changed === 0) throw new PaymentStatusConflictError(id);
    }
  }

  if (Object.keys(fields).length > 0) {
    await updateOrderStatus(id, fields);
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
