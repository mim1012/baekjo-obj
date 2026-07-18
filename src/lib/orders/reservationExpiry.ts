// 재고 선점(reservation) 만료 정책 — POST /api/orders 가 주문 생성 시 expires_at 을 정하는 단일 소스.
// reclaim-stock cron(만료 스캔·취소·복원)과 정책이 두 벌로 갈라지지 않도록 상수·계산을 한 곳에 모은다.
// 무통장입금 자동취소는 기본 **비활성**(2026-07-18 결정) — 비활성이면 무통장 주문은 expires_at 없이
// 생성되어 cron 스캔에서 제외된다(입금 확인 전까지 입금대기 유지). 카드 10분 TTL 은 항상 유지.

import { defaultOrderPolicyConfig } from '@/lib/orderPolicy/config';

export const BANK_TRANSFER_METHOD = '무통장입금';

// 카드결제(토스) PENDING 주문의 재고 선점 유효시간. repo.ts claimOrderForConfirmation 의
// CLAIM_EXTENSION_MS(10분)와 동일 폭 — 승인 착수 시 "처음부터 다시 10분"으로 통일한다.
// 무통장 자동취소 설정과 무관하게 항상 적용된다(결제 승인 재고 회수 안전망 — 건드리지 말 것).
export const CARD_RESERVATION_MS = 10 * 60 * 1000;

// 무통장입금 예약 유효시간 — **자동취소 활성 시** 정책 "기본값"(72시간). 기본 설정이 비활성이므로
// 평소에는 쓰이지 않으며, 관리자가 /admin/order-policy 에서 자동취소를 켰을 때 resolveBankTransferTtlMs
// 가 읽는 저장값(order_policy_config)의 기본치 의미다. 단일 소스는 orderPolicy/config.ts 의
// defaultOrderPolicyConfig — 여기서 파생만 한다. 활성 상태에서 만료되면 reclaim-stock cron 이
// '입금대기' 주문을 취소·재고복원한다. 입금이 확인돼 '결제완료'가 된 주문은 스캔 필터(payment_status)
// 와 취소 RPC guard(0031: payment_status in ('결제대기','입금대기'))가 이중으로 제외하므로 절대
// 만료 대상이 되지 않는다.
export const BANK_TRANSFER_RESERVATION_MS = defaultOrderPolicyConfig.bankTransferTtlHours * 60 * 60 * 1000;

/**
 * paymentMethod 에 따른 재고 선점 만료 시각(ISO 8601 문자열) — 또는 **null(만료 없음)**.
 * - 카드: 항상 CARD_RESERVATION_MS(10분) 만료 ISO 를 돌려준다(미결제·이탈 시 cron 재고 회수).
 * - 무통장: bankTransferTtlMs 가 숫자면 그 TTL 의 ISO, **null 이면 null**(자동취소 미사용 —
 *   expiresAt 미기록, cron 스캔 제외).
 * now 주입 가능(순수 함수 테스트). bankTransferTtlMs 는 관리자 설정 해석값 주입용 —
 * 설정 조회는 비동기(repo)라 호출부(async 핸들러)가 resolveBankTransferTtlMs 로 미리 해석해
 * 넘기고, 이 함수는 순수하게 유지한다. 기본 인자를 두지 않는 이유: 기본 정책이 "비활성(null)"인데
 * 상수 기본 인자가 남아 있으면 호출부가 주입을 빼먹었을 때 조용히 자동취소가 되살아난다.
 * 카드 TTL 은 결제 승인 클레임 폭과 묶여 있어 설정 대상이 아니다(CARD_RESERVATION_MS 고정).
 */
export function reservationExpiryIso(
  paymentMethod: string,
  nowMs: number,
  bankTransferTtlMs: number | null,
): string | null {
  if (paymentMethod === BANK_TRANSFER_METHOD) {
    if (bankTransferTtlMs === null) return null;
    return new Date(nowMs + bankTransferTtlMs).toISOString();
  }
  return new Date(nowMs + CARD_RESERVATION_MS).toISOString();
}
