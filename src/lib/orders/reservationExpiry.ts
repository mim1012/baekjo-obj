// 재고 선점(reservation) 만료 정책 — POST /api/orders 가 주문 생성 시 expires_at 을 정하는 단일 소스.
// reclaim-stock cron(만료 스캔·취소·복원)과 정책이 두 벌로 갈라지지 않도록 상수·계산을 한 곳에 모은다.

export const BANK_TRANSFER_METHOD = '무통장입금';

// 카드결제(토스) PENDING 주문의 재고 선점 유효시간. repo.ts claimOrderForConfirmation 의
// CLAIM_EXTENSION_MS(10분)와 동일 폭 — 승인 착수 시 "처음부터 다시 10분"으로 통일한다.
export const CARD_RESERVATION_MS = 10 * 60 * 1000;

// 무통장입금 예약 유효시간 — ⚠️ 비즈니스 정책 기본값(클라이언트가 조정 가능). 입금 기한을 넉넉히
// 덮되(3영업일 가정) 무한 선점은 막는 값으로 72시간을 기본으로 둔다. 만료되면 reclaim-stock cron 이
// '입금대기' 주문을 취소·재고복원한다. 입금이 확인돼 '결제완료'가 된 주문은 스캔 필터(payment_status)
// 와 취소 RPC guard(0031: payment_status in ('결제대기','입금대기'))가 이중으로 제외하므로 절대
// 만료 대상이 되지 않는다.
export const BANK_TRANSFER_RESERVATION_MS = 72 * 60 * 60 * 1000;

/**
 * paymentMethod 에 따른 재고 선점 만료 시각(ISO 8601 문자열).
 * 카드·무통장 모두 유한 만료를 부여해 미결제·이탈 시 cron 이 재고를 회수할 수 있게 한다
 * (예전엔 무통장만 expiresAt 없이 생성돼 재고가 무기한 선점됐다 — W2 재고 DoS 원인).
 * now 주입 가능(순수 함수 테스트).
 */
export function reservationExpiryIso(paymentMethod: string, nowMs: number = Date.now()): string {
  const ttl = paymentMethod === BANK_TRANSFER_METHOD ? BANK_TRANSFER_RESERVATION_MS : CARD_RESERVATION_MS;
  return new Date(nowMs + ttl).toISOString();
}
