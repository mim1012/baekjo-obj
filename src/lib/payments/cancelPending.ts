import { cancelReservationAndRestore, type OrderRecord } from '@/lib/orders/repo';
import { queryTossPaymentByOrderId, TossConfirmError } from '@/lib/payments/toss';
import { decidePaymentAction } from '@/lib/payments/decide';
import { applyAuthoritativeAction, type ConfirmPaymentResult } from '@/lib/payments/confirmPayment';
import { logServerError } from '@/lib/logServerError';

export type CancelPendingSource = 'cancel-route' | 'reclaim-cron';

/** 취소 전 조회에서 "결제가 완전히 끝나지 않았다"고 확정할 수 있는 종결 상태만 화이트리스트에
 *  올린다(Codex 최종 재검증 CRITICAL-1). IN_PROGRESS/READY/WAITING_FOR_DEPOSIT 같은 과도기
 *  상태는 여기 없다 — "지금 결제가 안 됐다"의 증거가 아니라 "아직 진행 중"일 뿐이라, 조회 직후
 *  사용자가 결제를 마치면 취소가 먼저 이겨 결제된 주문이 취소되는 레이스가 생긴다. */
const CANCELLABLE_TOSS_STATUSES = new Set(['CANCELED', 'EXPIRED', 'ABORTED']);

export type CancelPendingOutcome =
  /** 취소·재고복원을 이번 호출이 실제로 수행함. */
  | { kind: 'canceled' }
  /** 이미 처리된 주문(취소/확정 등)이라 취소 RPC가 no-op — 취소할 것도 확정할 것도 없다. */
  | { kind: 'already-settled' }
  /** 권위 DONE(+금액일치) 확인 — claim-먼저 규칙으로 확정을 시도했다. result.status===200이면
   *  실제로 확정 완료, 그 외는 경합 등으로 이번 호출에선 못 끝났다(다음 회차/웹훅이 마저 수렴). */
  | { kind: 'confirmed'; result: ConfirmPaymentResult }
  /** 과도기 상태(IN_PROGRESS/READY/WAITING_FOR_DEPOSIT 등) 또는 조회 자체가 불명(네트워크·5xx·
   *  스키마 불량)이거나 신원이 안 맞음 — 취소도 확정도 하지 않는다. 호출부가 나중에 재시도한다. */
  | { kind: 'pending' }
  /** ★재무 예외 — DONE인데 금액이 우리 계산과 다르다. 취소·확정 둘 다 하지 않고 사람이 봐야 한다. */
  | { kind: 'financial-exception' };

async function cancelViaRpc(orderId: string): Promise<CancelPendingOutcome> {
  const didCancel = await cancelReservationAndRestore(orderId);
  return didCancel ? { kind: 'canceled' } : { kind: 'already-settled' };
}

/**
 * '결제대기' 주문을 취소하기 전에 실제로 결제가 안 됐는지 확인하는 단일 진입점(R4 최종
 * 라운드, Codex 최종 재검증 CRITICAL-1·CRITICAL-2). `/api/payments/cancel` 라우트와
 * `reclaim-stock` cron **둘 다 이 함수만** 호출한다 — 취소 정책이 두 벌로 갈라지면 한쪽만
 * 고치고 다른 쪽을 놓치는 사고가 난다(R2에서 겪은 교훈과 동일한 이유로 여기서도 단일화한다).
 *
 * 예전엔 두 호출부 다 토스에 묻지 않고 곧장 `cancelReservationAndRestore`를 불렀다: 사용자가
 * 결제를 마쳤는데 브라우저가 죽어 successUrl에 도달 못 하거나, stale failUrl 핸들러가 뒤늦게
 * 오거나, cron이 만료 스캔에 걸리면 — 돈은 실제로 빠져나갔는데 주문은 '결제대기'로 남아 있어
 * 그대로 취소돼버렸다(돈 손실).
 *
 * 판단 순서:
 * 1. 무통장입금 — 토스와 무관, 기존 로직 그대로(즉시 취소 가능).
 * 2. TOSS_SECRET_KEY 미설정(계약 전) — 조회 자체가 불가능하다. 카드 결제 캡처 자체가 이 키
 *    없이는 불가능하므로(confirm도 이 키 없인 항상 실패) 취소가 돈을 잃을 수 없다 — 기존
 *    동작(취소)으로 안전하게 폴백한다(재고를 영구히 묶는 게 더 나쁘다). 키를 등록하는 순간
 *    자동으로 아래 3~5의 권위 검증 경로가 켜진다.
 * 3. `queryTossPaymentByOrderId`로 권위 조회 → status 화이트리스트:
 *    - DONE + 금액일치 → **취소 금지**, claim-먼저 규칙으로 확정.
 *    - DONE + 금액 불일치 → ★재무 예외, 취소·확정 둘 다 금지.
 *    - CANCELED/EXPIRED/ABORTED → 안전하게 취소.
 *    - 그 외(IN_PROGRESS/READY/WAITING_FOR_DEPOSIT 등 과도기) → **취소 금지**, pending.
 *    - 404(결제 기록 없음) → 안전하게 취소.
 *    - 조회 불명/신원 불일치 → **취소 금지**, pending.
 */
export async function cancelPendingOrderIfUnpaid(
  order: OrderRecord,
  source: CancelPendingSource,
  timeoutMs?: number,
): Promise<CancelPendingOutcome> {
  if (order.paymentMethod === '무통장입금') {
    return cancelViaRpc(order.id);
  }

  if (!process.env.TOSS_SECRET_KEY) {
    logServerError(
      `[cancelPendingOrderIfUnpaid] TOSS_SECRET_KEY 미설정(source=${source}) — 취소 전 조회를 건너뛰고 ` +
        `기존 동작(취소)으로 폴백 orderId=${order.id} — 키 등록 시 자동으로 권위 검증이 켜진다`,
      {},
    );
    return cancelViaRpc(order.id);
  }

  let observation;
  try {
    observation = await queryTossPaymentByOrderId(order.id, timeoutMs);
  } catch (queryError) {
    if (queryError instanceof TossConfirmError && queryError.httpStatus === 404) {
      // 토스에 이 orderId로 결제 기록 자체가 없음 — 정상 미결제. 안전하게 취소.
      return cancelViaRpc(order.id);
    }
    // 조회 불명(네트워크·타임아웃·5xx·스키마 불량) — 취소 금지. 돈이 이미 빠져나갔을 가능성을
    // 배제할 수 없으므로 이번엔 손대지 않는다.
    logServerError(`[cancelPendingOrderIfUnpaid] 취소 전 토스 조회 실패(불명, source=${source}) orderId=${order.id}`, queryError);
    return { kind: 'pending' };
  }

  const identityMatches = observation.orderId === order.id;
  if (!identityMatches) {
    logServerError(
      `[cancelPendingOrderIfUnpaid] 토스 응답 신원 불일치(source=${source}) orderId=${order.id} tossOrderId=${observation.orderId}`,
      {},
    );
    return { kind: 'pending' };
  }

  const expectedAmount = order.totalPrice + order.deliveryFee;

  if (observation.status === 'DONE') {
    if (observation.totalAmount !== expectedAmount) {
      logServerError(
        `[cancelPendingOrderIfUnpaid] ★재무 예외 — DONE인데 금액 불일치(source=${source}) orderId=${order.id} ` +
          `tossAmount=${observation.totalAmount} expected=${expectedAmount}`,
        {},
      );
      return { kind: 'financial-exception' };
    }
    // 돈이 이미 빠져나간 결제 — ★취소 절대 금지. claim-먼저 규칙으로 정식 확정한다. decide.ts는
    // order.paymentStatus==='결제대기'에서 DONE+금액일치를 항상 'confirm'으로 판정하므로 그대로
    // 재사용한다(정책 복제 0 — 새 취소/확정 로직을 만들지 않는다).
    const action = decidePaymentAction(
      order,
      { kind: 'authoritative', payment: { paymentKey: observation.paymentKey, status: observation.status, amountMatches: true } },
      observation.paymentKey,
      'reconcile',
    );
    const result = await applyAuthoritativeAction(action, order, order.id, observation.paymentKey, false, true);
    return { kind: 'confirmed', result };
  }

  if (CANCELLABLE_TOSS_STATUSES.has(observation.status)) {
    // 실제 결제가 종결·미완료로 확정됨 — 안전하게 취소·재고복원.
    // ★decide.ts의 "결제대기 주문은 절대 취소하지 않는다" 불변식을 여기서는 적용하지 않는다
    // (의도적 예외 — 정책 복제 아님). 그 불변식은 공개 confirm/return 엔드포인트가 "공격자가
    // 제시한 신뢰 불가 paymentKey"로 남의 정상 주문을 잘못 취소시키는 걸 막기 위한 것이다.
    // 이 함수는 이미 우리 DB의 orderId를 그 orderId로 직접 조회한 결과라(외부 입력으로 대상을
    // 못 바꿈) 그 위협 모델이 적용되지 않는다 — 오히려 여기서 취소를 막으면 이 함수의 존재
    // 목적(미결제 확정건의 재고 회수)이 무력화된다.
    return cancelViaRpc(order.id);
  }

  // IN_PROGRESS/READY/WAITING_FOR_DEPOSIT 등 과도기 상태 — "지금 결제가 안 됐다"의 증거가
  // 아니라 "아직 진행 중"일 뿐이다. 취소 금지 — 다음 재시도 때 토스가 결국 EXPIRED로 바꾸면
  // 그때 취소된다(재고 회수가 늦어질 뿐 돈은 안 잃는다).
  return { kind: 'pending' };
}
