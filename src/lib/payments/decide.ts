/**
 * 결제 판단 순수 함수 — confirm/webhook/reconcile 세 라우트가 각자 복제해 구현하던
 * "권위 응답 확보 후 무엇을 할지" 판단을 한 곳으로 모은다(리팩터, 행위 변경 없음).
 * I/O 없음 — DB·토스 호출은 전부 호출부(라우트) 또는 execute.ts 책임.
 *
 * ★불변식(타입으로 강제): PaymentAction 중 재고를 복원하는 변형은 'restoreConfirming' 단
 * 하나뿐이다. 'ignore'·'retryLater'에는 복원 변형이 없으므로 "불명이면 취소 금지"가 이
 * 함수의 반환 타입 수준에서 이미 성립한다 — 호출부가 실수로 취소를 끼워 넣을 방법이 없다.
 *
 * ★스코프 경계(의도적) — 이 함수는 "새로 확보한 권위 payment 정보가 있을 때"만 판단한다.
 * 아래는 애초에 이 함수가 다루지 않는다(호출부에 그대로 남아 있다):
 * - confirm의 사전 멱등 흡수(respondForObservedState) — 토스를 아직 호출하지 않은 시점이라
 *   "권위 payment"가 없다. 클라이언트 재요청에 뭘 응답할지는 순수히 주문 자체 상태 질문이다.
 * - confirm의 ALREADY_PROCESSED_PAYMENT 재조회 — 토스에 새로 묻지 않고 우리 DB를 다시 읽어
 *   경합 승자가 이미 확정했는지만 본다. 이것도 "새 권위 정보"가 아니라 자기 상태 재확인이다.
 */

export type PaymentSource = 'confirm' | 'webhook' | 'reconcile';

/**
 * 판단에 필요한 최소 정보만 추린 표준 형태. status는 토스 원문 문자열
 * (DONE/CANCELED/EXPIRED/ABORTED/기타) 그대로 넘기거나, confirm 라우트가 토스 거절
 * 응답을 분류해 넘기는 합성 상태 'DECLINED'다(진짜 토스 payments API status 값이 아님).
 * amountMatches는 호출부가 이미 order.totalPrice+deliveryFee와 대조를 마친 결과다 —
 * 주문마다 기대금액이 다르므로 이 함수 안에서 재계산하지 않는다.
 */
export interface AuthoritativePayment {
  paymentKey: string;
  status: string;
  amountMatches: boolean;
}

export type IgnoreReason =
  /** DONE+금액일치인데 주문이 확정 불가한 종결 상태(결제취소/환불완료 등)와 상충 */
  | 'conflicting-terminal-state'
  /** 권위 payment의 paymentKey가 주문에 저장된 paymentKey와 다름(위조/재사용 의심) */
  | 'key-mismatch'
  /** source 정책상 이 상태를 처리하지 않음(예: DECLINED가 confirm 외 source로 들어옴) */
  | 'unknown-status';

export type PaymentAction =
  /** setOrderPaid 대상 — order.paymentStatus별 claim 선행 여부는 호출부 책임 */
  | { kind: 'confirm' }
  /** cancelConfirmingAndRestore 대상 — '승인중' 주문 전용, 유일한 재고복원 변형 */
  | { kind: 'restoreConfirming' }
  /** 이미 결제완료 — no-op */
  | { kind: 'settled' }
  /** 취소·확정 어느 쪽도 하지 않음(취소 금지 불변식 대상) */
  | { kind: 'ignore'; reason: IgnoreReason }
  /** 결과 불명 — 지금은 아무것도 하지 않고 다음 기회에 재확인(취소 금지) */
  | { kind: 'retryLater'; reason: string };

const RESTORABLE_TOSS_STATUSES = new Set(['CANCELED', 'EXPIRED', 'ABORTED']);

/**
 * 주문의 현재 paymentStatus/paymentKey와 방금 확보한 권위 payment 정보로 다음 행동을 정한다.
 * @param orderPaymentStatus 판단 시점의 주문 payment_status(결제대기/승인중/결제완료/결제취소 등)
 * @param orderPaymentKey    주문에 저장된 payment_key(없으면 undefined)
 * @param payment            권위 payment 정보(토스 조회/승인 결과, 또는 confirm의 합성 DECLINED)
 * @param source              호출 라우트 — source별 정책 차이(취소 허용 범위 등)를 여기서 분기한다
 */
export function decidePaymentAction(
  orderPaymentStatus: string,
  orderPaymentKey: string | undefined,
  payment: AuthoritativePayment,
  source: PaymentSource,
): PaymentAction {
  const keyMatches = orderPaymentKey === payment.paymentKey;

  // 승인 거절(confirm 전용 합성 상태) — 토스 confirm API가 4xx로 명시 거절했다는 뜻이다.
  // claim이 이미 '결제대기'→'승인중'으로 배타 전이시킨 뒤에만 도달하므로(confirm 라우트가
  // 그 순서를 보장), 주문 상태를 다시 물을 필요 없이 무조건 복원 대상이다. webhook·reconcile은
  // 이 합성 상태를 만들 일이 없다(방어적으로 도달 시 unknown-status로 무시).
  if (payment.status === 'DECLINED') {
    return source === 'confirm' ? { kind: 'restoreConfirming' } : { kind: 'ignore', reason: 'unknown-status' };
  }

  if (payment.status === 'DONE' && payment.amountMatches) {
    if (orderPaymentStatus === '결제완료') return { kind: 'settled' };
    if (orderPaymentStatus === '결제대기') return { kind: 'confirm' };
    if (orderPaymentStatus === '승인중') {
      if (!keyMatches) return { kind: 'ignore', reason: 'key-mismatch' };
      return { kind: 'confirm' };
    }
    // 결제취소/환불완료 등 이미 종결된 상태인데 DONE 신호가 옴 — 상충하는 신호이므로 확정하지
    // 않는다(호출부가 로그로 사람에게 알린다).
    return { kind: 'ignore', reason: 'conflicting-terminal-state' };
  }

  if (RESTORABLE_TOSS_STATUSES.has(payment.status)) {
    if (orderPaymentStatus === '승인중') {
      if (!keyMatches) return { kind: 'ignore', reason: 'key-mismatch' };
      return { kind: 'restoreConfirming' };
    }
    // ★CRITICAL 불변식 — '결제대기' 주문은 이 경로로 절대 취소하지 않는다. orderId/paymentKey는
    // 위조 가능한 값(webhook 페이로드·reconcile의 고아 목록 모두 외부/과거 상태에서 유래)이라,
    // '결제대기'를 취소 대상에 포함시키면 공격자가 피해자의 정상 주문을 취소시키는 벡터가 열린다
    // (webhook route.ts CRITICAL 수정 이력 참고). reconcile은 애초에 승인중 주문만 순회하므로
    // 이 분기에 결제대기로 도달하지 않는다 — source 무관하게 안전한 공통 규칙으로 둔다.
    return { kind: 'ignore', reason: 'conflicting-terminal-state' };
  }

  // 그 외(DONE인데 금액 불일치, WAITING_FOR_DEPOSIT 등 미처리 상태, 알 수 없는 status) — 불명
  // 취급. 취소도 확정도 하지 않는다(불변식 — 반환 타입에 이 경로의 재고복원 변형이 없음).
  return { kind: 'retryLater', reason: `unexpected-toss-status:${payment.status}` };
}
