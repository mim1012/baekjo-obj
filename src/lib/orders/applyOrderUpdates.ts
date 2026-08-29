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
import { TossConfirmError, isTossClientRejection, isFullyCanceledToss } from '@/lib/payments/toss';

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

/** 취소(orderStatus='취소완료')와 환불(paymentStatus='환불완료')이 한 요청에 섞이면 의미가
 *  충돌한다 — 두 분기 모두 orderStatus/paymentStatus 를 보고 갈라지는데, 취소 분기가 먼저
 *  매치되면 환불 요청이 조용히 무시된 채 취소로만 처리된다(§8-6 codex LOW-2, resolveCancelFallback
 *  PaymentWrite 는 '결제취소'만 인식해 '환불완료'를 기록하지 않는다). 방어적으로 400 거절한다. */
export class ConflictingOrderUpdateRequestError extends Error {
  constructor() {
    super('conflicting-cancel-refund-request');
    this.name = 'ConflictingOrderUpdateRequestError';
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
  /** 환불(U4) 전용 — 결제완료 주문의 현재 payment_key(카드=문자열, 무통장=null)를 조회한다.
   *  getOrderById 와 별개 port 로 둔 이유: 환불 분기는 paymentKey 유무로 Toss 호출 여부를
   *  가르는데, 이는 취소·전이 판정과는 다른 관심사라서다. */
  getOrderPaymentInfo: (
    id: string,
  ) => Promise<{ paymentStatus: string; paymentKey: string | null } | null>;
  /** 카드 결제(paymentKey 있음) 환불 시 Toss 취소 API 호출 — "돈 먼저". 실패 시 예외를 던져야
   *  하고(TossConfirmError 등), 이 예외가 그대로 위(route.ts)로 전파돼 DB 상태·재고가 전혀
   *  바뀌지 않은 채 요청이 실패해야 한다. */
  cancelTossPayment: (paymentKey: string, cancelReason: string) => Promise<void>;
  /** 크래시 윈도우 재조정(§8-6 codex HIGH) 전용 — cancelTossPayment가 4xx(TossConfirmError,
   *  httpStatus<500)로 거절됐을 때만 호출해 Toss의 실제 현재 상태를 재조회한다. 이전 시도에서
   *  취소는 실제로 성공했는데 refundOrderAndRestore 호출 전에 프로세스가 죽어 DB가 '결제완료'로
   *  남아있으면, 재시도의 cancelTossPayment는 이미 CANCELED라 토스에게 4xx로 거절당한다 —
   *  이 조회가 없으면 그 사실을 확인할 방법이 없어 영구 409 데드락이 된다. 조회 자체가 실패하면
   *  null(불명 — 정합 복구를 시도하지 않고 원래 에러를 그대로 전파). */
  queryTossCancelStatus: (
    paymentKey: string,
  ) => Promise<{ status: string; balanceAmount: number | null } | null>;
  /** 결제완료 → 환불완료 전이 + 재고 복원(0050 rpc, "라벨 나중"). true = 수행됨, false = 이미
   *  처리됐거나 결제완료가 아니라 no-op(호출부가 409로 분기). */
  refundOrderAndRestore: (id: string) => Promise<boolean>;
}

/**
 * 관리자 주문 상태 변경을 적용한다.
 *
 * ⓪ 취소+환불 동시 요청({orderStatus:'취소완료', paymentStatus:'환불완료'})은 즉시 400 거절
 *    (§8-6 codex LOW-2) — 아래 취소 분기가 먼저 매치돼 환불이 조용히 무시되는 것을 막는다.
 * ① 취소 요청(orderStatus='취소완료' 또는 paymentStatus='결제취소')
 *    → cancelReservationAndRestore RPC 로 배선(재고 복원 동반, 멱등). DO NOT CHANGE.
 *    - RPC true: RPC 가 취소완료/결제취소를 세팅했으므로 나머지 비결제 필드만 반영.
 *    - RPC false: 비결제 필드만 반영하고, payment_status 는 **조건 없이 쓰지 않는다** — '결제완료'
 *      확정 주문의 취소 기록('결제취소')만 CAS(from='결제완료')로 쓴다(리플레이 우회 봉합, opus/codex).
 * ①-b 환불 요청(paymentStatus='환불완료') → "돈 먼저, 라벨 나중"(§ 카드 환불 실연동).
 *    결제완료가 아니면 즉시 거절(409). 카드 결제(paymentKey 있음)면 Toss 취소 API가 **먼저** 성공해야
 *    하고, 실패하면 예외가 그대로 전파돼 DB 상태·재고가 전혀 바뀌지 않는다(무통장은 Toss 호출 없이
 *    바로 RPC로) — 단, 4xx 거절이면 크래시 윈도우 재조정(아래 참고)을 먼저 시도한다. Toss 성공
 *    (또는 재조정으로 이미 취소됐음이 확인됨, 또는 애초에 무통장이라 불필요) 후에만
 *    refundOrderAndRestore RPC로 결제상태 전이 + 재고 복원을 한 트랜잭션으로 커밋한다.
 *
 *    ⚠️ 크래시 윈도우 재조정(§8-6 codex HIGH): cancelTossPayment 성공 직후, refundOrderAndRestore
 *    호출 전에 프로세스가 죽으면 DB는 '결제완료'로 남고 재고는 미복원인 채 요청이 재시도될 수
 *    있다. 이때 Toss에 다시 취소를 요청하면 이미 CANCELED라 4xx로 거절한다 — 그대로 에러를
 *    전파하면 재시도할 때마다 다시 4xx가 나는 영구 409 데드락이 생긴다. 그래서 4xx 거절
 *    (isTossClientRejection)일 때만 queryTossCancelStatus로 실제 상태를 재조회해, 이미 전액
 *    취소돼 있으면(isFullyCanceledToss) 에러 대신 refundOrderAndRestore로 넘어가 정합을 복구한다
 *    (멱등 재시도 성립). 네트워크/타임아웃/5xx(결과 불명)는 재조회하지 않고 원래 에러를 그대로
 *    전파한다 — "돈 먼저" 원칙상 불명일 땐 진행하지 않는다.
 * ② 비취소·비환불 결제상태 전이 → 화이트리스트 검증 후, 전이 + 동반 필드를 하나의 CAS 로 원자 반영
 *    (부분 쓰기 방지, codex MEDIUM). 무변경 재전송은 no-op 스킵.
 * ③ 결제상태 없이 필드만 → updateOrderStatus.
 */
export async function applyOrderUpdates(
  id: string,
  updates: OrderStatusUpdate,
  ports: OrderUpdatePorts,
): Promise<void> {
  if (updates.orderStatus === '취소완료' && updates.paymentStatus === '환불완료') {
    throw new ConflictingOrderUpdateRequestError();
  }

  const isCancelRequest =
    updates.orderStatus === '취소완료' || updates.paymentStatus === '결제취소';
  const isRefundRequest = !isCancelRequest && updates.paymentStatus === '환불완료';

  if (isRefundRequest) {
    const current = await ports.getOrderPaymentInfo(id);
    if (!current) throw new OrderNotFoundError(id);

    if (current.paymentStatus !== '결제완료') {
      // 이미 환불됐거나 결제완료가 아닌 주문의 환불 요청 — 화이트리스트 위반과 같은 409로 통일한다.
      throw new PaymentTransitionError(current.paymentStatus, '환불완료');
    }

    if (current.paymentKey) {
      // 카드 결제 — Toss 취소가 실패하면(TossConfirmError 등) 아래 catch가 재조정을 시도하고,
      // 그래도 실패로 판단되면 다시 던져져 refundOrderAndRestore 호출부에는 절대 도달하지
      // 않는다 → DB 상태·재고 불변 보장.
      try {
        await ports.cancelTossPayment(current.paymentKey, '관리자 환불');
      } catch (cancelError) {
        const isClientRejection =
          cancelError instanceof TossConfirmError && isTossClientRejection(cancelError.httpStatus);
        const reconciled = isClientRejection
          ? await ports.queryTossCancelStatus(current.paymentKey).catch(() => null)
          : null;
        if (!reconciled || !isFullyCanceledToss(reconciled)) {
          throw cancelError;
        }
        // else: 재조회 결과 이미 전액 취소돼 있었다(크래시 윈도우 재시도) — 아래로 진행해
        // refundOrderAndRestore 로 DB 정합(라벨+재고)을 마저 복구한다.
      }
    }
    // 무통장(paymentKey 없음)은 Toss에 청구된 적이 없으므로 취소 호출 없이 바로 아래로 진행.

    const refunded = await ports.refundOrderAndRestore(id);
    if (!refunded) {
      // WHERE payment_status='결제완료' 불일치(경합) — 방금 확인했지만 그 사이 다른 요청이 상태를
      // 바꿨을 가능성. Toss 취소는 이미 커밋됐을 수 있으니(호출부가 로그로 감사) 409로 재시도 유도.
      throw new PaymentStatusConflictError(id);
    }

    // RPC가 이미 payment_status를 세팅했으므로 동반 비결제 필드(배송메모 등)만 반영.
    const { paymentStatus: _paymentStatus, ...rest } = updates;
    if (Object.keys(rest).length > 0) {
      await ports.updateOrderStatus(id, rest);
    }
    return;
  }

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
