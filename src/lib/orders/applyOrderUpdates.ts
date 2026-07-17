// 관리자 주문 상태 변경 오케스트레이션(순수 로직 — Supabase/next-auth 직접 의존 없음).
// 협력자(repo 함수)를 ports 로 주입받아, PATCH /api/admin/orders/[id] 라우트와 단위 테스트가
// **같은 결정·순서 로직**을 태우게 한다(codex 지적: 회귀 테스트가 RPC/CAS 격리가 아니라 이
// applyOrderUpdates 경로를 실제로 태워야 한다). server-only 를 import 하지 않으므로 node 테스트에서
// 그대로 import 해 fake ports 로 구동할 수 있다.
import type { OrderFieldsUpdate, OrderStatusUpdate } from './repo';
import {
  isManualPaymentTransitionAllowed,
  resolveCancelFallbackPaymentWrite,
} from './paymentTransition';

/** 주문이 없어 상태를 바꿀 수 없다 → 404. */
export class OrderNotFoundError extends Error {
  constructor(id: string) {
    super(`order-not-found:${id}`);
    this.name = 'OrderNotFoundError';
  }
}

/** 관리자 수동 결제상태 전이가 화이트리스트에 없다 → 409(현재 상태가 이 전이를 허용하지 않음).
 *  이중 재고복원 재생(취소→'입금대기' 되돌리기)과 증빙 없는 '결제완료' 위조를 여기서 끊는다. */
export class PaymentTransitionError extends Error {
  constructor(
    public readonly fromStatus: string,
    public readonly toStatus: string,
  ) {
    super(`invalid-payment-transition:${fromStatus}->${toStatus}`);
    this.name = 'PaymentTransitionError';
  }
}

/** 현재 상태를 읽은 뒤 CAS UPDATE 사이에 다른 요청이 상태를 바꿔 0행 매치 → 409(경합). */
export class PaymentStatusConflictError extends Error {
  constructor(id: string) {
    super(`payment-status-conflict:${id}`);
    this.name = 'PaymentStatusConflictError';
  }
}

/** applyOrderUpdates 가 의존하는 협력자. 라우트는 실제 repo 함수를, 테스트는 fake 를 넣는다. */
export interface OrderUpdatePorts {
  cancelReservationAndRestore: (id: string) => Promise<boolean>;
  getOrderById: (id: string) => Promise<{ paymentStatus: string } | null>;
  updateOrderStatus: (id: string, fields: OrderFieldsUpdate) => Promise<void>;
  updatePaymentStatusGuarded: (
    id: string,
    fromStatus: string,
    toStatus: string,
    extraFields?: OrderFieldsUpdate,
  ) => Promise<number>;
  /** 취소 fallback(RPC 미복원) 발생 로깅. */
  onCancelFallback?: (id: string) => void;
}

/**
 * 관리자 주문 상태 변경을 적용한다.
 *
 * ① 취소 요청(orderStatus='취소완료' 또는 paymentStatus='결제취소')
 *    → cancelReservationAndRestore RPC 로 배선(재고 복원 동반, 멱등). DO NOT CHANGE.
 *    - RPC true: RPC 가 취소완료/결제취소를 세팅했으므로 나머지 비결제 필드만 반영.
 *    - RPC false: 비결제 필드만 반영하고, payment_status 는 **조건 없이 쓰지 않는다** — '결제완료'
 *      확정 주문의 취소 기록('결제취소')만 CAS(from='결제완료')로 쓴다(리플레이 우회 봉합, opus/codex).
 * ② 비취소 결제상태 전이 → 화이트리스트 검증 후, 전이 + 동반 필드를 하나의 CAS 로 원자 반영
 *    (부분 쓰기 방지, codex MEDIUM). 무변경 재전송은 no-op 스킵.
 * ③ 결제상태 없이 필드만 → updateOrderStatus.
 */
export async function applyOrderUpdates(
  id: string,
  updates: OrderStatusUpdate,
  ports: OrderUpdatePorts,
): Promise<void> {
  const isCancelRequest =
    updates.orderStatus === '취소완료' || updates.paymentStatus === '결제취소';

  if (isCancelRequest) {
    const restored = await ports.cancelReservationAndRestore(id);
    if (!restored) {
      ports.onCancelFallback?.(id);
      // ⚠️ 리플레이 봉합: fallback 은 payment_status 를 조건 없이 쓰지 않는다. 비결제 필드만
      // 반영하고, 결제상태는 '결제완료' 확정 주문의 취소 기록('결제취소')만 CAS(from='결제완료')로.
      const { paymentStatus: reqPayment, ...cancelFields } = updates;
      if (Object.keys(cancelFields).length > 0) {
        await ports.updateOrderStatus(id, cancelFields);
      }
      const write = resolveCancelFallbackPaymentWrite(reqPayment);
      if (write) {
        await ports.updatePaymentStatusGuarded(id, write.from, write.to);
      }
      return;
    }

    // RPC가 이미 orderStatus/paymentStatus를 세팅했으므로 나머지 필드만 반영한다.
    const { orderStatus: _orderStatus, paymentStatus: _paymentStatus, ...rest } = updates;
    if (Object.keys(rest).length > 0) {
      await ports.updateOrderStatus(id, rest);
    }
    return;
  }

  // 비취소 경로: paymentStatus 변경은 화이트리스트 + CAS 를 반드시 통과시킨다.
  const { paymentStatus, ...fields } = updates;

  if (paymentStatus !== undefined) {
    const current = await ports.getOrderById(id);
    if (!current) throw new OrderNotFoundError(id);

    if (current.paymentStatus !== paymentStatus) {
      if (!isManualPaymentTransitionAllowed(current.paymentStatus, paymentStatus)) {
        throw new PaymentTransitionError(current.paymentStatus, paymentStatus);
      }
      // 전이 + 동반 필드를 하나의 CAS 로 원자 반영 — 부분 쓰기 없음.
      const changed = await ports.updatePaymentStatusGuarded(
        id,
        current.paymentStatus,
        paymentStatus,
        fields,
      );
      if (changed === 0) throw new PaymentStatusConflictError(id);
      return;
    }
    // current === paymentStatus 면 무변경 no-op — 결제상태는 건드리지 않고 나머지 필드만 반영한다.
  }

  if (Object.keys(fields).length > 0) {
    await ports.updateOrderStatus(id, fields);
  }
}
