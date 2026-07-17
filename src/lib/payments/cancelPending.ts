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
  /** 과도기 상태(IN_PROGRESS/READY/WAITING_FOR_DEPOSIT 등) — 토스가 아직 결론을 안 냈을 뿐,
   *  "결제 안 됨"의 증거가 아니다. 취소하지 않는다. ★실패가 아니다 — 호출부는 이걸 재시도
   *  카운터(recordReclaimAttempt)에 넣으면 안 된다(넣으면 25분 만에 dead-letter로 영구 제외돼,
   *  가상계좌처럼 입금 기한이 며칠인 정상 결제가 재고를 무기한 묶는 DoS가 성립한다 — opus 최종
   *  재검증 MEDIUM). 다음 회차에 그냥 재조회한다. */
  | { kind: 'transitional' }
  /** 조회 자체가 불명(네트워크·5xx·스키마 불량)이거나 신원이 안 맞음 — 진짜 판단 불가 상태라
   *  취소도 확정도 하지 않는다. transitional과 달리 이건 재시도 카운터 대상이다(5회 계속
   *  불명이면 사람이 봐야 하는 이상 상태). */
  | { kind: 'unclear' }
  /** ★재무 예외 — DONE인데 금액이 우리 계산과 다르다. 취소·확정 둘 다 하지 않고 사람이 봐야 한다. */
  | { kind: 'financial-exception' };

async function cancelViaRpc(orderId: string): Promise<CancelPendingOutcome> {
  const didCancel = await cancelReservationAndRestore(orderId);
  if (!didCancel) {
    // 취소 RPC가 0행 매치(no-op)했다는 뜻 — 이 무음 no-op이 "취소 안 됐는데 200 응답"을 만든
    // 원인이었다(무통장입금 주문이 '입금대기'로 생성되는데 0024 RPC는 '결제대기'만 봐서 항상
    // 여기로 빠졌던 실제 프로덕션 결함). 라우트의 200 응답 계약(멱등)은 그대로 두되, 최소한
    // 서버 로그에는 남긴다.
    logServerError(
      `[cancelPendingOrderIfUnpaid] 취소 RPC 미매치(already-settled) orderId=${orderId}`,
      {},
    );
  }
  return didCancel ? { kind: 'canceled' } : { kind: 'already-settled' };
}

// TOSS_SECRET_KEY 미설정 경고를 배치당(≈초 단위로 끝나는 cron 1회 실행) 1회로 억제한다 —
// reclaim-stock이 만료 목록(최대 100건)을 순회하며 이 함수를 주문마다 부르므로, 억제가 없으면
// 같은 로그가 최대 100줄 반복돼 신호가 파묻힌다. 다음 cron 실행(5분 뒤)에서는 다시 로그된다.
const SECRET_MISSING_LOG_INTERVAL_MS = 60_000;
let lastSecretMissingLogAt = 0;

function logSecretMissingOnce(source: CancelPendingSource, orderId: string): void {
  const now = Date.now();
  if (now - lastSecretMissingLogAt < SECRET_MISSING_LOG_INTERVAL_MS) return;
  lastSecretMissingLogAt = now;
  logServerError(
    `[cancelPendingOrderIfUnpaid] TOSS_SECRET_KEY 미설정 — 카드 주문 취소를 보류한다(source=${source} ` +
      `orderId=${orderId}). 키를 등록하면 자동으로 검증·회수가 재개된다.`,
    {},
  );
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
 * 2. TOSS_SECRET_KEY 미설정 → ★취소 금지(`unclear`), 기존 동작(취소) 폴백 아님(R4 진짜 최종
 *    라운드, Codex 라운드5 — team-lead 판단 정정). 이전엔 "카드 결제 캡처 자체가 이 키 없이는
 *    불가능하니 취소해도 안전"이라고 판단했는데, 그건 "이 배포가 한 번도 키를 가진 적 없을
 *    때만" 참이다. 키가 있던 시절 결제된 주문이 나중에 키 유실(로테이션 실수·환경변수 스코프
 *    사고·롤링 배포 중 일부 인스턴스 누락)과 겹치면 그 결제된 주문이 취소된다. "불명이면
 *    취소하지 않는다"는 이 함수(그리고 confirmPayment.ts 전체)의 최상위 불변식이고, 설정
 *    부재도 불명의 한 형태다 — 설정 상태에 따라 안전 불변식이 뒤집히면 안 된다. 배치당 1회만
 *    시끄러운 로그를 남긴다(주문마다 반복하면 신호가 파묻힌다). 비용은 거의 0이다 — 현재
 *    프로덕션은 이 키가 없어 카드 결제 자체가 비활성(checkout이 NEXT_PUBLIC 클라이언트 키
 *    없으면 카드 옵션을 disabled 처리)이라, 모든 실제 주문이 무통장입금이라서 이 분기를 안
 *    탄다 — 키가 등록되는 순간 자동으로 아래 3~5의 권위 검증 경로가 켜진다.
 * 3. `queryTossPaymentByOrderId`로 권위 조회 → status 화이트리스트:
 *    - DONE + 금액일치 → **취소 금지**, claim-먼저 규칙으로 확정.
 *    - DONE + 금액 불일치 → ★재무 예외, 취소·확정 둘 다 금지.
 *    - CANCELED/EXPIRED/ABORTED → 안전하게 취소.
 *    - 그 외(IN_PROGRESS/READY/WAITING_FOR_DEPOSIT 등 과도기) → **취소 금지**, `transitional`
 *      (실패 아님 — 호출부가 재시도 카운터에 넣으면 안 됨, opus 최종 재검증 MEDIUM).
 *    - 404(결제 기록 없음) → 안전하게 취소.
 *    - 조회 불명/신원 불일치 → **취소 금지**, `unclear`(진짜 판단 불가 — 재시도 카운터 대상).
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
    // ★fail-closed(HIGH-1, Codex 라운드5) — 조회 자체가 불가능하니 "불명"과 동일하게 취소를
    // 보류한다. 위 doc 주석의 근거(키 유실 시나리오) 참고 — 절대 취소로 폴백하지 않는다.
    logSecretMissingOnce(source, order.id);
    return { kind: 'unclear' };
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
    // 배제할 수 없으므로 이번엔 손대지 않는다. 이건 과도기가 아니라 진짜 판단 불가라 재시도
    // 카운터 대상이다.
    logServerError(`[cancelPendingOrderIfUnpaid] 취소 전 토스 조회 실패(불명, source=${source}) orderId=${order.id}`, queryError);
    return { kind: 'unclear' };
  }

  const identityMatches = observation.orderId === order.id;
  if (!identityMatches) {
    logServerError(
      `[cancelPendingOrderIfUnpaid] 토스 응답 신원 불일치(source=${source}) orderId=${order.id} tossOrderId=${observation.orderId}`,
      {},
    );
    return { kind: 'unclear' };
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
  // 그때 취소된다(재고 회수가 늦어질 뿐 돈은 안 잃는다). ★실패가 아니므로 재시도 카운터에
  // 넣지 않는다(호출부 책임 — 이 kind를 recordReclaimAttempt로 보내면 안 됨).
  return { kind: 'transitional' };
}
