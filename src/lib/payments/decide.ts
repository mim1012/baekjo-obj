/**
 * 결제 판단 순수 함수 — confirm/webhook/reconcile 세 라우트가 각자 복제해 구현하던
 * "무엇을 관찰했고 그래서 무엇을 할지" 판단을 한 곳으로 모은다(리팩터, 행위 변경 없음).
 * I/O 없음 — DB·토스 호출은 전부 호출부(라우트) 또는 execute.ts 책임.
 *
 * ★불변식 ①(반환 타입) — PaymentAction 중 재고를 복원하는 변형은 'restoreConfirming' 단
 * 하나뿐이다. 'ignore'·'retryLater'에는 복원 변형이 없으므로 "불명이면 취소 금지"가 이
 * 함수의 반환 타입 수준에서 이미 성립한다.
 * ★불변식 ②(구성 불가능) — PaymentAction은 비공개 심볼(PAYMENT_ACTION_BRAND)을 가진 값만
 * 이 타입을 만족한다. 그 심볼은 이 파일 밖으로 export되지 않으므로, 다른 모듈이
 * `{ kind: 'restoreConfirming', paymentKey: 'x' }` 같은 리터럴을 직접 써도 타입이 맞지
 * 않아 컴파일에서 막힌다 — decidePaymentAction을 거치지 않고는 PaymentAction을 만들 수
 * 없다(codex HIGH 지적 — "아무나 restoreConfirming을 만들어 실행기에 넘길 수 있다" 방어).
 *
 * ★관찰(observation)이 판단을 대체하지 않는다 — 이 함수는 "무엇을 관찰했는지"(observation)와
 * "주문이 지금 어떤 상태인지"(order)를 함께 받아 하나의 매트릭스로 판단한다. 예전엔 confirm의
 * 사전 멱등 흡수(respondForObservedState)가 이 매트릭스의 절반(주문상태×키일치)을 별도로
 * 복제하고 있었다 — observation.kind==='none'(토스를 아직 호출하지 않은 시점)으로 흡수해
 * 매트릭스를 한 벌로 만든다.
 */

export type PaymentSource = 'confirm' | 'webhook' | 'reconcile';

/** 판단 시점의 주문 최소 정보. 이 함수는 order.totalPrice 등 금액을 모른다 — 금액 대조는
 *  호출부가 이미 끝내고 observation.payment.amountMatches로 넘긴다. */
export interface OrderPaymentSnapshot {
  paymentStatus: string;
  paymentKey?: string;
}

/**
 * 이번 호출에서 확보한 관찰 — 네 가지뿐이다.
 * - 'none': 토스를 아직 호출/조회하지 않은 시점(confirm의 사전 멱등 흡수 전용). "권위 payment"가
 *   없으므로 주문 자체 상태(order)와 submittedKey만으로 판단한다.
 * - 'authoritative': 토스 조회/승인 응답을 확보함(웹훅·reconcile의 재조회, confirm의 승인 성공).
 * - 'declined': 토스 confirm API가 4xx로 명시 거절함(ALREADY_PROCESSED_PAYMENT 제외). confirm
 *   전용 — claim이 이미 '승인중'으로 배타 전이시킨 뒤에만 발생한다.
 * - 'unknown': 네트워크/타임아웃/5xx/응답 필드 불일치 등 "토스가 실제로 뭘 했는지 불명".
 */
export type PaymentObservation =
  | { kind: 'none' }
  | { kind: 'authoritative'; payment: { paymentKey: string; status: string; amountMatches: boolean } }
  | { kind: 'declined' }
  | { kind: 'unknown'; reason: string };

export type IgnoreReason =
  /** 권위 payment 또는 사전 요청의 paymentKey가 주문에 저장된 paymentKey와 다름(위조/재사용 의심) */
  | 'key-mismatch'
  /** DONE+금액일치인데 주문이 확정 불가한 종결 상태(결제취소/환불완료 등)와 상충 */
  | 'conflicting-terminal-state'
  /** 사전 관찰(observation:'none') 시점에 주문이 이미 '결제취소'로 종결됨 */
  | 'canceled'
  /** source 정책상 이 관찰을 처리하지 않음(예: declined가 confirm 외 source로 들어옴) */
  | 'unknown-status';

const PAYMENT_ACTION_BRAND = Symbol('PaymentAction');
interface Branded {
  readonly [PAYMENT_ACTION_BRAND]: true;
}

type PaymentActionShape =
  /** setOrderPaid 대상 — order.paymentStatus별 claim 선행 여부는 호출부 책임 */
  | { kind: 'confirm' }
  /** cancelConfirmingAndRestore 대상 — 증거로 paymentKey를 싣는다(0028: WHERE payment_key=?
   *  바인딩에 실제로 쓰인다 — codex 지적: 예전엔 실행기가 이 키를 무시하고 orderId만으로 복원
   *  RPC를 돌렸다). '승인중' 전용, 유일한 재고복원 변형. */
  | { kind: 'restoreConfirming'; paymentKey: string }
  /** 이미 결제완료 — no-op */
  | { kind: 'settled' }
  /** 취소·확정 어느 쪽도 하지 않음(취소 금지 불변식 대상) */
  | { kind: 'ignore'; reason: IgnoreReason }
  /** 결과 불명 또는 "아직 확정 전이니 기다려라" — 지금은 아무것도 하지 않는다(취소 금지) */
  | { kind: 'retryLater'; reason: string };

export type PaymentAction = PaymentActionShape & Branded;

/** decidePaymentAction 내부에서만 호출 — 이 파일 밖에는 PAYMENT_ACTION_BRAND가 없으므로
 *  다른 모듈은 이 함수를 우회해 PaymentAction을 만들 수 없다. */
function brand(action: PaymentActionShape): PaymentAction {
  return action as PaymentAction;
}

const RESTORABLE_TOSS_STATUSES = new Set(['CANCELED', 'EXPIRED', 'ABORTED']);

/**
 * 주문 상태 + 관찰 결과로 다음 행동을 정한다.
 * @param order        판단 시점의 주문 스냅샷(paymentStatus/paymentKey)
 * @param observation  이번 호출에서 확보한 관찰(위 PaymentObservation 참고)
 * @param submittedKey 이번 관찰과 결부된 paymentKey — 사전 관찰(none)이면 요청/페이로드의 키,
 *                      권위 관찰(authoritative)이면 그 조회/승인 응답의 paymentKey. order.paymentKey와
 *                      대조해 keyMatches를 이 함수 안에서 한 번만 계산한다.
 * @param source       호출 라우트 — source별 정책 차이(declined의 취소 허용 범위 등)를 여기서 분기
 */
export function decidePaymentAction(
  order: OrderPaymentSnapshot,
  observation: PaymentObservation,
  submittedKey: string,
  source: PaymentSource,
): PaymentAction {
  const keyMatches = order.paymentKey === submittedKey;

  if (observation.kind === 'none') {
    // 사전 멱등 흡수(구 respondForObservedState) — 토스를 아직 호출하지 않은 시점이므로 주문
    // 자체 상태와 요청이 제시한 키만으로 판단한다. ★ paymentStatus만으로 갈라야 한다 — 키가
    // 남아있다는 이유만으로 취소된 주문에 거짓 200을 돌려주는 경로가 생기면 안 된다.
    if (order.paymentStatus === '결제완료') {
      return keyMatches ? brand({ kind: 'settled' }) : brand({ kind: 'ignore', reason: 'key-mismatch' });
    }
    if (order.paymentStatus === '승인중') {
      // 같은 paymentKey로 이미 '승인중'인 재진입(재시도/경합) — 아직 확정 전이므로 취소 금지,
      // 클라이언트에는 "확인 중"으로 응답(retryLater)한다.
      return keyMatches
        ? brand({ kind: 'retryLater', reason: 'already-confirming' })
        : brand({ kind: 'ignore', reason: 'key-mismatch' });
    }
    if (order.paymentStatus === '결제취소') {
      // 취소된 주문은 키 일치 여부와 무관하게 흡수하면 안 된다(거짓 성공 방지).
      return brand({ kind: 'ignore', reason: 'canceled' });
    }
    if (order.paymentStatus === '결제대기') {
      // 정상 흐름이면 호출부가 결제대기 주문에는 observation:'none'을 쓰지 않는다(claim으로
      // 넘어간다) — 방어적으로 confirm 진행 가능 신호만 준다.
      return brand({ kind: 'confirm' });
    }
    // 그 외 비정상 조합(환불완료·입금대기 등 예상 밖 상태) — 조용히 흡수하지 않고 거부 신호.
    return brand({ kind: 'ignore', reason: 'unknown-status' });
  }

  if (observation.kind === 'declined') {
    // claim이 이미 '결제대기'→'승인중'으로 배타 전이시킨 뒤에만 도달하므로(confirm 라우트가
    // 그 순서를 보장), 주문 상태를 다시 물을 필요 없이 무조건 복원 대상이다. webhook·reconcile은
    // 이 관찰을 만들 일이 없다(방어적으로 도달 시 무시).
    return source === 'confirm'
      ? brand({ kind: 'restoreConfirming', paymentKey: order.paymentKey ?? submittedKey })
      : brand({ kind: 'ignore', reason: 'unknown-status' });
  }

  if (observation.kind === 'unknown') {
    // 네트워크/타임아웃/시크릿키 설정 오류/토스 5xx/응답 필드 불일치 — 토스가 이미 결제를
    // 캡처했을 가능성을 배제할 수 없으므로 취소·복원하지 않는다(불변식 — retryLater엔 재고
    // 복원 변형이 없음).
    return brand({ kind: 'retryLater', reason: observation.reason });
  }

  // observation.kind === 'authoritative' — 토스 조회/승인 응답을 확보한 시점.
  const { payment } = observation;

  if (payment.status === 'DONE' && payment.amountMatches) {
    if (order.paymentStatus === '결제완료') return brand({ kind: 'settled' });
    if (order.paymentStatus === '결제대기') return brand({ kind: 'confirm' });
    if (order.paymentStatus === '승인중') {
      if (!keyMatches) return brand({ kind: 'ignore', reason: 'key-mismatch' });
      return brand({ kind: 'confirm' });
    }
    // 결제취소/환불완료 등 이미 종결된 상태인데 DONE 신호가 옴 — 상충하는 신호이므로 확정하지
    // 않는다(호출부가 로그로 사람에게 알린다).
    return brand({ kind: 'ignore', reason: 'conflicting-terminal-state' });
  }

  if (RESTORABLE_TOSS_STATUSES.has(payment.status)) {
    if (order.paymentStatus === '승인중') {
      if (!keyMatches) return brand({ kind: 'ignore', reason: 'key-mismatch' });
      return brand({ kind: 'restoreConfirming', paymentKey: order.paymentKey ?? submittedKey });
    }
    // ★CRITICAL 불변식 — '결제대기' 주문은 이 경로로 절대 취소하지 않는다. orderId/paymentKey는
    // 위조 가능한 값(webhook 페이로드·reconcile의 고아 목록 모두 외부/과거 상태에서 유래)이라,
    // '결제대기'를 취소 대상에 포함시키면 공격자가 피해자의 정상 주문을 취소시키는 벡터가 열린다
    // (webhook route.ts CRITICAL 수정 이력 참고). reconcile은 애초에 승인중 주문만 순회하므로
    // 이 분기에 결제대기로 도달하지 않는다 — source 무관하게 안전한 공통 규칙으로 둔다.
    return brand({ kind: 'ignore', reason: 'conflicting-terminal-state' });
  }

  // 그 외(DONE인데 금액 불일치, WAITING_FOR_DEPOSIT 등 미처리 상태, 알 수 없는 status) — 불명
  // 취급. 취소도 확정도 하지 않는다.
  return brand({ kind: 'retryLater', reason: `unexpected-toss-status:${payment.status}` });
}
