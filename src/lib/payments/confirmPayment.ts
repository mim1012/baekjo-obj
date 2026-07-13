import {
  getOrderById,
  claimOrderForConfirmation,
  ClaimPaymentKeyConflictError,
  type OrderRecord,
} from '@/lib/orders/repo';
import { confirmTossPayment, queryTossPayment, TossConfirmError } from '@/lib/payments/toss';
import { decidePaymentAction, type PaymentAction } from '@/lib/payments/decide';
import { applyPaymentAction } from '@/lib/payments/execute';
import { logServerError } from '@/lib/logServerError';
import type { ConfirmedOrderSummary } from '@/types';

export const MAX_PAYMENT_KEY = 200;
export const MAX_ORDER_ID = 100;

export interface ConfirmPaymentParams {
  paymentKey: string;
  orderId: string;
  amount: number;
  /** 토스 confirm 호출의 타임아웃(ms). 미지정 시 toss.ts 기본값(10초). 사용자가 브라우저에서
   *  기다리는 경로(GET /api/payments/return)는 더 짧은 값을 넘긴다. */
  timeoutMs?: number;
}

/** POST /api/payments/confirm 과 GET /api/payments/return 이 공유하는 결과 타입 — 각 라우트가
 *  자기 프로토콜(JSON body vs 302 리다이렉트)로 매핑한다. HTTP 정책은 여기 안 샌다. */
export type ConfirmPaymentResult =
  | { status: 200; order: ConfirmedOrderSummary }
  | { status: 202; error: 'payment-confirming' }
  | { status: 400; error: 'amount-mismatch' }
  | { status: 402; error: 'payment-declined' }
  | { status: 404; error: 'order-not-found' }
  | {
      status: 409;
      error:
        | 'reservation-expired'
        | 'payment-key-mismatch'
        | 'payment-not-confirmable'
        | 'payment-key-already-bound'
        | 'payment-binding-mismatch';
    }
  | { status: 500; error: 'server-error' }
  | { status: 502; error: 'payment-unconfirmed' };

/** 응답 최소화 — 무인증 공개 엔드포인트라 PII(customerName/phone/address/items)를 내려주지 않는다. */
function toSummary(order: OrderRecord): ConfirmedOrderSummary {
  return {
    id: order.id,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    totalPrice: order.totalPrice,
    deliveryFee: order.deliveryFee,
    paidAt: order.paidAt,
  };
}

/**
 * decidePaymentAction(observation:'none')의 결과를 결과 타입으로 매핑하는 얇은 표(구
 * respondForObservedState — 판단 매트릭스는 decide.ts로 이전됨). ③ 멱등 흡수와 ③-b claim
 * 패자 재조회(경합) 두 호출부가 공유.
 */
function respondToAction(
  action: PaymentAction,
  order: OrderRecord,
  orderId: string,
  submittedKey: string,
): ConfirmPaymentResult {
  switch (action.kind) {
    case 'settled':
      return { status: 200, order: toSummary(order) };

    case 'retryLater':
      return { status: 202, error: 'payment-confirming' }; // 아직 확정 전 — 취소 금지

    case 'confirm':
    case 'proceedToClaim':
    case 'restoreConfirming':
      // observation:'none'에서 이 헬퍼가 도달하는 조건(order.paymentStatus!=='결제대기') 위에서는
      // decide가 이 셋을 반환하지 않는다 — 'confirm'은 observation:'authoritative' 전용(decide.ts
      // PaymentActionShape 주석 참고), 'proceedToClaim'은 order.paymentStatus==='결제대기' 전용,
      // 'restoreConfirming'은 observation:'declined'/'authoritative' 전용. 정상 흐름이면 도달 불가.
      logServerError(`[confirmPayment] respondToAction 예상 밖 action orderId=${orderId} kind=${action.kind}`, {});
      return { status: 500, error: 'server-error' };

    case 'ignore':
      if (action.reason === 'canceled') {
        return { status: 409, error: 'reservation-expired' }; // 거짓 성공 금지
      }
      if (action.reason === 'key-mismatch') {
        logServerError(
          `[confirmPayment] 멱등 흡수 키 불일치(대체 시도 의심) orderId=${orderId} submittedKey=${submittedKey} storedKey=${order.paymentKey}`,
          {},
        );
        return { status: 409, error: 'payment-key-mismatch' };
      }
      // 그 외 예상 밖 상태(환불완료·입금대기 등)에서 재요청 — 조용히 흡수하지 않고 로그 후 거부한다.
      logServerError(
        `[confirmPayment] 예상 밖 주문 상태에서 confirm 재요청 orderId=${orderId} paymentStatus=${order.paymentStatus}`,
        {},
      );
      return { status: 409, error: 'payment-not-confirmable' };

    default: {
      const exhaustiveCheck: never = action;
      throw new Error(`[confirmPayment] respondToAction 처리되지 않은 action.kind: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}

/**
 * observation:'authoritative'(토스 조회/승인 응답을 확보한 시점)의 decide 결과를 적용한다.
 * confirmPayment ⑤(승인 성공 직후)와 reconcilePendingPayment(불명 재조회 후)가 공유한다 —
 * "권위 관찰을 얻은 뒤 무엇을 하는지"는 그 관찰을 confirm으로 얻었든 재조회로 얻었든 동일해야
 * 하므로 한 곳에 둔다(reconcile cron U6과 동일 판단 경로, 정책 복제 0 유지).
 */
async function applyAuthoritativeAction(
  action: PaymentAction,
  order: OrderRecord,
  orderId: string,
  submittedKey: string,
  /** 호출부가 claim(③-b, '결제대기'→'승인중' 배타 전이)이 실제로 성공했음을 보장하는지 여부.
   *  confirmPayment ⑤(승인 성공 직후 — claim이 바로 이 함수 호출 안에서 이미 성공했다)는 항상
   *  true. reconcilePendingPayment와 ③-a(바인딩 검증에서 IN_PROGRESS가 아닌 상태를 만난 경우)는
   *  claim을 거치지 않은 신선한 order 스냅샷을 넘기므로, 그 스냅샷의 실제 paymentStatus로 판단한다.
   *  false인데 action.kind==='confirm'이면 아래 'confirm' 분기가 claim을 먼저 시도한다(claim-먼저
   *  규칙, Codex 재검증 HIGH-1) — 그냥 202로 넘기면 claim 없이 도달한 진짜 DONE 결제가 영구
   *  pending에 머무는 사고가 난다. claim 성공/실패 각 경로 끝에 이 함수를 true로 재귀 호출하거나
   *  직접 결과를 반환한다. */
  claimConfirmed: boolean,
): Promise<ConfirmPaymentResult> {
  switch (action.kind) {
    case 'settled': {
      const latest = await getOrderById(orderId);
      return { status: 200, order: toSummary(latest ?? order) };
    }

    case 'confirm': {
      if (!claimConfirmed) {
        // ★claim-먼저 규칙(Codex 재검증 HIGH-1 — repo.ts JSDoc·webhook U5와 동일 불변식) —
        // claim 없이 도달한 'confirm'을 곧장 202로 넘기면(예전 수정) 특정 경로(바인딩 조회가
        // 502로 claim 이전에 끊긴 뒤 reconcile이 뒤늦게 DONE을 발견하는 경우)에서 실제로는 결제가
        // 끝났는데 주문이 영구히 pending에 머무는 사고가 난다 — 읽기 전용 폴링으로도 복구 불가.
        // webhook의 '결제대기'+'confirm' 분기와 동일하게 여기서 claim을 먼저 시도한다.
        let claimed: number;
        try {
          claimed = await claimOrderForConfirmation(orderId, submittedKey);
        } catch (claimError) {
          if (claimError instanceof ClaimPaymentKeyConflictError) {
            logServerError(
              `[confirmPayment] authoritative claim payment_key 충돌 orderId=${orderId} paymentKey=${submittedKey}`,
              claimError,
            );
            return { status: 409, error: 'payment-key-already-bound' };
          }
          throw claimError;
        }
        if (claimed === 0) {
          // 경합 패자 — 다른 경로(confirm/webhook/reconcile)가 그 사이 먼저 처리했을 수 있다.
          // 재조회해 상태별로 수렴한다(webhook의 동일 케이스와 대칭 패턴).
          const latest = await getOrderById(orderId);
          if (!latest) {
            logServerError(
              `[confirmPayment] authoritative claim 실패 후 재조회에서도 주문을 찾지 못함 orderId=${orderId}`,
              {},
            );
            return { status: 409, error: 'reservation-expired' };
          }
          if (latest.paymentStatus === '결제완료') {
            return { status: 200, order: toSummary(latest) };
          }
          if (latest.paymentStatus === '승인중' && latest.paymentKey === submittedKey) {
            // 승자가 이미 같은 키로 '승인중' 전이시킴 — 그 상태를 이어받아 확정을 마저 진행한다.
            return applyAuthoritativeAction(action, latest, orderId, submittedKey, true);
          }
          logServerError(
            `[confirmPayment] authoritative claim 실패 후에도 확정 불가 orderId=${orderId} paymentKey=${submittedKey} latestStatus=${latest.paymentStatus}`,
            {},
          );
          return { status: 202, error: 'payment-confirming' };
        }
        // claim 성공(1행) — '결제대기'→'승인중' 배타 전이가 실제로 일어났다. 이제 setOrderPaid의
        // WHERE(승인중+키)가 맞을 것이 보장되므로 claimConfirmed=true로 이어서 확정한다.
        return applyAuthoritativeAction(action, order, orderId, submittedKey, true);
      }
      // WHERE payment_status='승인중' AND payment_key=?로 claim이 발급한 시도만 확정한다(이중승인 방어).
      const result = await applyPaymentAction(action, orderId, submittedKey);
      const affected = result.applied === 'confirm' ? result.affected : 0;
      if (affected === 0) {
        // 토스 승인 성공·DB 확정 0행(극단적 경합) — 웹훅 없이는 완전히 닫을 수 없는 잔존 리스크(R6).
        logServerError(
          `[confirmPayment] R6 승인성공·확정0행 orderId=${orderId} paymentKey=${submittedKey} — 웹훅 후속 필요`,
          {},
        );
        return { status: 202, error: 'payment-confirming' };
      }
      const confirmedOrder = await getOrderById(orderId);
      return { status: 200, order: toSummary(confirmedOrder ?? order) };
    }

    case 'restoreConfirming':
      // 진짜 취소/만료(CANCELED/EXPIRED/ABORTED) — 재고를 즉시 회수한다.
      await applyPaymentAction(action, orderId).catch((restoreError) => {
        logServerError(`[confirmPayment] authoritative 취소 후 재고 복원 실패 orderId=${orderId}`, restoreError);
      });
      return { status: 402, error: 'payment-declined' };

    case 'ignore':
      if (action.reason === 'key-mismatch') {
        logServerError(
          `[confirmPayment] authoritative 키 불일치 orderId=${orderId} submittedKey=${submittedKey} storedKey=${order.paymentKey}`,
          {},
        );
        return { status: 409, error: 'payment-key-mismatch' };
      }
      // conflicting-terminal-state(결제취소/환불완료 등과 DONE 신호가 상충) — 확정도 취소도 안 함.
      logServerError(
        `[confirmPayment] authoritative 상충 상태 orderId=${orderId} paymentStatus=${order.paymentStatus} reason=${action.reason}`,
        {},
      );
      return { status: 409, error: 'payment-not-confirmable' };

    case 'retryLater':
      return { status: 202, error: 'payment-confirming' }; // 아직 확정 전 — 취소 금지

    case 'proceedToClaim':
      // observation:'authoritative'에서는 반환되지 않는다(decide.ts 참고) — 방어적으로만 도달.
      logServerError(`[confirmPayment] applyAuthoritativeAction 예상 밖 action orderId=${orderId} kind=proceedToClaim`, {});
      return { status: 500, error: 'server-error' };

    default: {
      const exhaustiveCheck: never = action;
      throw new Error(`[confirmPayment] applyAuthoritativeAction 처리되지 않은 action.kind: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}

/**
 * 결제 승인 확정 코어 — POST /api/payments/confirm(클라이언트 재확인)과
 * GET /api/payments/return(토스 successUrl, 서버 리다이렉트 처리)이 공유한다.
 * (R4: successUrl을 서버 라우트로 옮기며 confirm/route.ts POST 핸들러 본문에서 추출 — 행위 변경 없음)
 *
 * 게스트 결제도 있어 세션 불요(주문 소유권은 orderId를 아는 사람만 확인 가능한 결제 흐름이므로
 * checkout→successUrl 리다이렉트 경로 밖에서는 orderId를 알 수 없다 — order-complete 스냅샷과 동일 전제).
 * 순서가 이중승인·금액조작·crash window 방어의 핵심이라 재배치 금지(§ 리뷰 인계사항).
 */
export async function confirmPayment(params: ConfirmPaymentParams): Promise<ConfirmPaymentResult> {
  const { paymentKey, orderId, amount } = params;

  try {
    // ① 주문 존재 확인.
    const order = await getOrderById(orderId);
    if (!order) {
      return { status: 404, error: 'order-not-found' };
    }

    // ② 금액검증 — successUrl 쿼리(amount)는 위조 가능하므로 DB 총액과 대조 후 거부.
    //    승인 요청(④)은 요청 amount가 아니라 이 expectedAmount만 토스에 보낸다.
    const expectedAmount = order.totalPrice + order.deliveryFee;
    if (!Number.isSafeInteger(expectedAmount) || expectedAmount <= 0) {
      logServerError(
        `[confirmPayment] 주문 금액 데이터 이상 orderId=${orderId} expectedAmount=${expectedAmount}`,
        {},
      );
      return { status: 500, error: 'server-error' };
    }
    if (expectedAmount !== amount) {
      return { status: 400, error: 'amount-mismatch' };
    }

    // ③ 멱등 흡수 — 이미 '결제대기'를 벗어난 주문은 decide(observation:'none')가 상태별로 분기한다.
    //    claim보다 먼저 둬야 한다: 순서가 바뀌면 정상 결제완료건 재확인이 claim=0 → 409로 오분류된다.
    if (order.paymentStatus !== '결제대기') {
      const action = decidePaymentAction(order, { kind: 'none' }, paymentKey, 'confirm');
      return respondToAction(action, order, orderId, paymentKey);
    }

    // ③-a 클레임 전 바인딩 검증 — successUrl이 GET이 되면서(R4) 봇으로 자동화 가능해졌다:
    //    공격자가 피해자의 orderId·금액만 알면 임의의(미사용) paymentKey로 이 함수를 호출할 수
    //    있는데, 검증 없이 claim부터 하면 공격자 키가 저장되고 주문이 '승인중'으로 전이된 뒤
    //    이어지는 토스 confirm이 4xx(잘못된 키)로 거절돼 "진짜 카드 거절"로 오분류 → 피해자의
    //    정상 주문이 취소되고 재고가 복원되는 벡터가 열린다. claim보다 먼저 토스 권위 조회로
    //    이 paymentKey가 실제로 이 orderId·금액에 대한 결제인지 확인한다(비용: 승인당 조회 1회
    //    추가·수백ms — 돈이 걸린 경로라 정당하다). 이 검증을 통과한 뒤에는 토스 4xx 거절을 진짜
    //    카드 거절로 신뢰할 수 있다(위조 키가 여기까지 못 옴 — 아래 ④의 거절 분기 전제).
    let bindingCheck;
    try {
      bindingCheck = await queryTossPayment(paymentKey, params.timeoutMs);
    } catch (bindingError) {
      if (bindingError instanceof TossConfirmError && bindingError.httpStatus === 404) {
        // 토스에 이 paymentKey로 결제 기록 자체가 없음 — 위조 또는 아직 미존재. 주문은
        // 건드리지 않는다(claim 안 함 — 불명확한 상태에서 손대지 않는 게 안전).
        logServerError(
          `[confirmPayment] 바인딩 검증 실패(토스 404) orderId=${orderId} paymentKey=${paymentKey}`,
          bindingError,
        );
        return { status: 409, error: 'payment-binding-mismatch' };
      }
      // 조회 자체가 불명(네트워크/설정오류/5xx) — claim 이전이므로 주문은 여전히 결제대기 그대로다.
      // 취소할 것도 없으니 그대로 "불명"으로 응답해 재시도를 유도한다(불변식: 불명이면 손대지 않음).
      logServerError(
        `[confirmPayment] 바인딩 검증 조회 실패(불명) orderId=${orderId} paymentKey=${paymentKey}`,
        bindingError,
      );
      return { status: 502, error: 'payment-unconfirmed' };
    }
    // paymentKey도 검증한다(Codex 재검증 HIGH-2) — orderId·금액만 맞으면 통과시키면, 조회 응답의
    // paymentKey가 우리가 물어본 값과 실제로 같은지 확인하지 않은 채 그 값을 신뢰하게 된다.
    const bindingMatches =
      bindingCheck.orderId === orderId &&
      bindingCheck.paymentKey === paymentKey &&
      bindingCheck.totalAmount === expectedAmount;
    if (!bindingMatches) {
      logServerError(
        `[confirmPayment] 바인딩 불일치(위조/재사용 의심) orderId=${orderId} paymentKey=${paymentKey} ` +
          `tossOrderId=${bindingCheck.orderId} tossPaymentKey=${bindingCheck.paymentKey} tossAmount=${bindingCheck.totalAmount} expected=${expectedAmount}`,
        {},
      );
      return { status: 409, error: 'payment-binding-mismatch' };
    }

    // orderId·금액이 맞아도 "승인 대기(IN_PROGRESS)"가 아니면 claim하지 않는다(opus 재검증 HIGH).
    // 공격 형태: 공격자가 피해자의 orderId·금액으로 자기 페이지에서 결제를 띄워 paymentKey만 얻고
    // 승인은 하지 않는다(가상계좌 미입금=WAITING_FOR_DEPOSIT, 카드 방치=EXPIRED — 비용 0). 그 키로
    // 여기까지 오면 orderId·금액은 일치하므로 위 바인딩 검증은 통과한다. IN_PROGRESS만 claim을
    // 허가해야, 뒤이은 토스 confirm의 4xx 거절을 "이 키로 실제 인증까지 마친 뒤 진짜로 거절된
    // 카드"로 신뢰할 수 있다(아래 ④ 주석의 전제 — status 검사가 없으면 승인 불가 키의 4xx와
    // 구분이 안 돼 그 전제가 성립하지 않는다). IN_PROGRESS가 아니면 claim 대신 이미 확보한 관찰을
    // decidePaymentAction(observation:'authoritative')에 그대로 넘긴다 — decide의 ★CRITICAL
    // 불변식('결제대기' 주문은 RESTORABLE_TOSS_STATUSES로 절대 취소하지 않음, decide.ts 참고)이
    // 위조 키로 인한 취소를 구조적으로 막는다. 신선한 재조회로 판단해야 정확하므로 order를
    // 다시 읽는다(①의 스냅샷은 여기까지 오는 동안 stale해졌을 수 있음).
    if (bindingCheck.status !== 'IN_PROGRESS') {
      const latest = (await getOrderById(orderId)) ?? order;
      const action = decidePaymentAction(
        latest,
        { kind: 'authoritative', payment: { paymentKey: bindingCheck.paymentKey, status: bindingCheck.status, amountMatches: bindingCheck.totalAmount === expectedAmount } },
        bindingCheck.paymentKey,
        'confirm',
      );
      return applyAuthoritativeAction(action, latest, orderId, bindingCheck.paymentKey, latest.paymentStatus === '승인중');
    }

    // ③-b 승인 착수 선언 — 토스 API 호출 전에 반드시 claim. '결제대기'→'승인중' 배타적 전이이므로
    //    claimed=0이면 이미 다른 요청이 먼저 승인중으로 전이시켰거나(경합 패자) 취소/만료된
    //    주문이라 토스 승인 API를 호출하면 안 된다(승인해봐야 확정 못 함 = 이중 리스크만 증가).
    let claimed: number;
    try {
      claimed = await claimOrderForConfirmation(orderId, paymentKey);
    } catch (claimError) {
      if (claimError instanceof ClaimPaymentKeyConflictError) {
        // 이 paymentKey가 이미 다른 주문에 묶여 있음(0022 unique 충돌) — 위조/재사용 의심.
        logServerError(
          `[confirmPayment] claim payment_key 충돌 orderId=${orderId} paymentKey=${paymentKey}`,
          claimError,
        );
        return { status: 409, error: 'payment-key-already-bound' };
      }
      throw claimError;
    }
    if (claimed === 0) {
      // 경합 패자 — 무조건 409로 뭉뚱그리지 않고 재조회해 decide(observation:'none')로 정확히
      // 안내한다(승자가 confirm 중이면 202, 이미 확정됐으면 200, 취소됐으면 409 등).
      const latest = await getOrderById(orderId);
      if (latest) {
        const action = decidePaymentAction(latest, { kind: 'none' }, paymentKey, 'confirm');
        return respondToAction(action, latest, orderId, paymentKey);
      }
      logServerError(`[confirmPayment] claim 실패 후 재조회에서도 주문을 찾지 못함 orderId=${orderId}`, {});
      return { status: 409, error: 'reservation-expired' };
    }

    // ④ 토스 승인 API 호출 — expectedAmount(DB 값)만 보낸다. 클라이언트가 보낸 amount 변수는
    //    ②에서 이미 expectedAmount와 동일함이 확인됐지만, 요청 필드 자체를 서버 값으로 고정해
    //    "클라이언트 변수가 실제로 무엇을 승인시켰는지"에 대한 여지를 남기지 않는다.
    let tossResult;
    try {
      tossResult = await confirmTossPayment({ paymentKey, orderId, amount: expectedAmount }, params.timeoutMs);
    } catch (tossError) {
      // ALREADY_PROCESSED_PAYMENT는 4xx+코드가 실려 있어도 "다른 confirm 요청이 이미 캡처했다"는
      // 신호다 — 확정 거절로 잘못 묶으면 이중 confirm 패자가 승자의 완료 주문을 취소시킬 수 있다.
      const alreadyProcessed =
        tossError instanceof TossConfirmError && tossError.tossCode === 'ALREADY_PROCESSED_PAYMENT';

      // 확정 거절 = tossCode 있음 && httpStatus 4xx(토스가 응답 완료) && ALREADY_PROCESSED 아님.
      // 5xx는 캡처 여부가 불확실하므로 tossCode가 있어도 "불명" 경로로 보낸다.
      // ★이 4xx를 "진짜 카드 거절"로 신뢰할 수 있는 전제는 위 ③-a 바인딩 검증이 status를
      //   IN_PROGRESS로 확인했다는 것이다(승인 대기 상태의 키만 여기까지 옴) — status 검사가
      //   없었다면(구버전) WAITING_FOR_DEPOSIT/EXPIRED 등 승인 자체가 불가능한 위조 키의 4xx와
      //   구분이 안 돼, 이 분기가 피해자의 정상 주문을 취소시키는 벡터였다(opus 재검증 HIGH).
      const isConfirmedDecline =
        tossError instanceof TossConfirmError &&
        tossError.tossCode !== null &&
        tossError.httpStatus !== null &&
        tossError.httpStatus < 500 &&
        !alreadyProcessed;

      if (isConfirmedDecline) {
        // 진짜 토스 거절(카드사 거부 등) — 재고를 즉시 회수해 다음 구매자가 기다리지 않게 한다.
        // claim이 이미 '승인중'으로 전이시켰으므로 0024는 no-op — 반드시 0028을 호출한다.
        // observation:'declined'는 source==='confirm'에서만 곧장 restoreConfirming으로 판정된다
        // (claim의 배타성이 보증하므로 재확인 불필요). order는 ①의 claim-이전 스냅샷이라 그대로
        // 넘기지 않고 claim(③-b)이 전이시킨 현재 상태('승인중')를 넘긴다.
        const action = decidePaymentAction({ paymentStatus: '승인중', paymentKey }, { kind: 'declined' }, paymentKey, 'confirm');
        await applyPaymentAction(action, orderId).catch((restoreError) => {
          logServerError(
            `[confirmPayment] 토스 승인 거부 후 재고 복원 실패 orderId=${orderId}`,
            restoreError,
          );
        });
        logServerError(`[confirmPayment] 토스 승인 거부 orderId=${orderId}`, tossError);
        return { status: 402, error: 'payment-declined' };
      }

      if (alreadyProcessed) {
        // 취소·복원 금지 — 다른 confirm 요청이 승자로 처리했다. 재조회해 승자 확정이 끝났으면
        // 멱등 수렴, 아직이면(레이스 윈도우) 확인 중으로 응답한다.
        const latest = await getOrderById(orderId);
        if (latest && latest.paymentStatus === '결제완료') {
          return { status: 200, order: toSummary(latest) };
        }
        logServerError(
          `[confirmPayment] ALREADY_PROCESSED_PAYMENT — 승자 확정 대기 orderId=${orderId} paymentKey=${paymentKey}`,
          {},
        );
        return { status: 202, error: 'payment-confirming' };
      }

      if (tossError instanceof TossConfirmError) {
        // 불명(네트워크/타임아웃/설정오류/5xx) — 토스가 이미 캡처했을 가능성을 배제 못 하므로
        // 취소·복원 금지. 결제대기로 남겨두면 재시도 멱등 재확정 또는 만료 cron 회수로 수렴한다.
        // decide는 observation:'unknown'에서 항상 retryLater(order 매트릭스 분기 없음)이므로
        // 호출을 생략해도 결과가 같다 — 직접 응답한다.
        logServerError(
          `[confirmPayment] 토스 승인 응답 불명(네트워크/설정/5xx) orderId=${orderId} paymentKey=${paymentKey} httpStatus=${tossError.httpStatus}`,
          tossError,
        );
        return { status: 502, error: 'payment-unconfirmed' };
      }
      throw tossError;
    }

    // ④-b 토스 2xx 성공 응답 런타임 검증 — orderId·paymentKey·금액·상태 넷 다 일치해야 승인 인정.
    //    하나라도 어긋나면 성공/취소 어느 쪽도 아닌 불명 경로(취소 금지·502)로 보낸다.
    const tossResponseValid =
      tossResult.orderId === orderId &&
      tossResult.paymentKey === paymentKey &&
      tossResult.totalAmount === expectedAmount &&
      tossResult.status === 'DONE';

    if (!tossResponseValid) {
      logServerError(
        `[confirmPayment] 토스 성공응답 필드 불일치 orderId=${orderId} paymentKey=${paymentKey} ` +
          `tossOrderId=${tossResult.orderId} tossPaymentKey=${tossResult.paymentKey} tossAmount=${tossResult.totalAmount} tossStatus=${tossResult.status}`,
        {},
      );
      return { status: 502, error: 'payment-unconfirmed' };
    }

    // ⑤ 승인 확정 — tossResponseValid가 이미 DONE·금액일치를 확인했으므로 decide는 항상 'confirm'을
    //    반환한다(applyAuthoritativeAction의 'confirm' 분기가 WHERE payment_status='승인중' AND
    //    payment_key=? 이중승인 방어를 담당). order는 claim-이전 스냅샷이라 claim이 전이시킨 현재
    //    상태를 넘긴다.
    const action = decidePaymentAction(
      { paymentStatus: '승인중', paymentKey },
      { kind: 'authoritative', payment: { paymentKey: tossResult.paymentKey, status: tossResult.status, amountMatches: tossResult.totalAmount === expectedAmount } },
      tossResult.paymentKey,
      'confirm',
    );
    return applyAuthoritativeAction(action, order, orderId, tossResult.paymentKey, true);
  } catch (error) {
    logServerError('[confirmPayment] 승인 처리 실패', error);
    return { status: 500, error: 'server-error' };
  }
}

/**
 * 승인 상태가 '확인 중/불명'으로 남았을 때 서버가 토스 권위 조회로 직접 재수렴시키는 경로 —
 * GET /api/payments/return(R4)이 202(payment-confirming)·502(payment-unconfirmed) 후속 처리
 * 전용으로 호출한다. confirmPayment를 단순 재시도하는 것으로는 수렴하지 않는다: 1차 호출에서
 * claim이 이미 '결제대기'→'승인중'으로 전이시킨 뒤라, 재호출은 ③ 멱등 흡수(order.paymentStatus
 * !=='결제대기')에 걸려 202만 반복 반환할 뿐 토스를 다시 부르지 않는다. 그래서 여기서는
 * confirmPayment가 아니라 reconcile cron(U6)과 동일한 패턴 — queryTossPayment(권위 조회) →
 * 신원(orderId·paymentKey) 검증 → decidePaymentAction(observation:'authoritative') →
 * applyAuthoritativeAction — 을 재사용해 실제로 상태를 진전시킨다. 판단/적용 로직은 전부
 * decide.ts·applyAuthoritativeAction을 그대로 호출할 뿐 새로 만들지 않는다(정책 복제 0).
 */
export async function reconcilePendingPayment(
  params: Pick<ConfirmPaymentParams, 'paymentKey' | 'orderId'>,
  timeoutMs: number,
): Promise<ConfirmPaymentResult> {
  const { paymentKey, orderId } = params;

  try {
    const order = await getOrderById(orderId);
    if (!order) {
      return { status: 404, error: 'order-not-found' };
    }
    const expectedAmount = order.totalPrice + order.deliveryFee;

    let tossResult;
    try {
      tossResult = await queryTossPayment(paymentKey, timeoutMs);
    } catch (queryError) {
      if (queryError instanceof TossConfirmError && queryError.httpStatus === 404) {
        // 토스에 결제 기록 자체가 없음 — reconcile cron(5분 뒤 재확인, U6)과 달리 여기서는
        // claim 직후라 토스 쪽 기록 반영이 아직 안 됐을 수도 있다(eventual consistency).
        // 성급히 복원하지 않는다 — 최종 회수는 reconcile cron이 담당(불변식: 불명이면 취소 금지).
        logServerError(`[reconcilePendingPayment] 토스 404(기록 없음) orderId=${orderId} paymentKey=${paymentKey}`, queryError);
        return { status: 502, error: 'payment-unconfirmed' };
      }
      logServerError(`[reconcilePendingPayment] 권위 재조회 실패(불명) orderId=${orderId} paymentKey=${paymentKey}`, queryError);
      return { status: 502, error: 'payment-unconfirmed' };
    }

    // 신원 바인딩 — 조회 결과를 쓰기 전에 orderId·paymentKey가 물어본 대상과 일치하는지 확인한다
    // (reconcile cron과 동일). 하나라도 어긋나면 신뢰할 수 없으므로 확정도 취소도 하지 않는다.
    const identityMatches = tossResult.orderId === orderId && tossResult.paymentKey === paymentKey;
    if (!identityMatches) {
      logServerError(
        `[reconcilePendingPayment] 토스 응답 신원 불일치 orderId=${orderId} paymentKey=${paymentKey} ` +
          `tossOrderId=${tossResult.orderId} tossPaymentKey=${tossResult.paymentKey}`,
        {},
      );
      return { status: 502, error: 'payment-unconfirmed' };
    }

    const action = decidePaymentAction(
      order,
      { kind: 'authoritative', payment: { paymentKey: tossResult.paymentKey, status: tossResult.status, amountMatches: tossResult.totalAmount === expectedAmount } },
      tossResult.paymentKey,
      'confirm',
    );
    // claim이 실제로 성공했었는지(order.paymentStatus==='승인중')는 이 함수 최상단의 신선한
    // getOrderById로 이미 확인했다 — claim 없이 도달했으면(예: confirmPayment의 바인딩 검증
    // 502로 claim 이전에 끊긴 경우) false로 넘긴다. applyAuthoritativeAction이 그 경우 claim을
    // 먼저 시도해 실제로 확정까지 마친다(claim-먼저 규칙, Codex 재검증 HIGH-1) — 예전엔 여기서
    // false가 곧장 202로 귀결돼, claim 이전에 끊긴 뒤 뒤늦게 DONE을 발견한 주문이 읽기 전용
    // 폴링으로도 복구 불가능한 영구 pending에 머무는 결함이 있었다.
    return applyAuthoritativeAction(action, order, orderId, tossResult.paymentKey, order.paymentStatus === '승인중');
  } catch (error) {
    logServerError('[reconcilePendingPayment] 재조회 처리 실패', error);
    return { status: 500, error: 'server-error' };
  }
}
