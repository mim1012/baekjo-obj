// 주문 정책(무통장입금 예약 TTL) 타입 + 기본값 + 정규화. 서버(API route·repo)와 클라이언트
// (관리자 화면) 양쪽에서 안전하게 import 할 수 있도록 'use client' 없는 순수 모듈로 둔다
// (categorySettings/config.ts 와 동일 이유 — client-reference 프록시 치환 방지).

export interface OrderPolicyConfig {
  /** 무통장입금 주문의 재고 선점 유효시간(시간 단위). 만료되면 reclaim-stock cron 이 취소·재고복원. */
  bankTransferTtlHours: number;
}

// TTL 허용 범위 — 0/음수는 생성 즉시 만료(주문 불능), 과도한 값은 무기한 선점(W2 재고 DoS)과
// 다를 바 없으므로 1시간~720시간(30일)로 못 박는다.
export const ORDER_POLICY_TTL_MIN_HOURS = 1;
export const ORDER_POLICY_TTL_MAX_HOURS = 720;

// 기본 72시간 — 입금 기한을 넉넉히 덮되(3영업일 가정) 무한 선점은 막는 값.
// reservationExpiry.ts 의 BANK_TRANSFER_RESERVATION_MS 가 이 값에서 파생된다(단일 소스).
export const defaultOrderPolicyConfig: OrderPolicyConfig = { bankTransferTtlHours: 72 };

/**
 * jsonb 저장값(unknown)을 안전한 OrderPolicyConfig 로 정규화한다. 절대 throw 하지 않는다 —
 * 깨진 저장값이 주문 생성 경로(POST /api/orders)를 죽이면 안 되기 때문이다.
 * 객체가 아니거나 숫자가 아니면(NaN/Infinity 포함) 기본 72시간, 소수는 반올림,
 * 범위 밖은 [MIN, MAX]로 클램프한다.
 */
export function normalizeOrderPolicyConfig(value: unknown): OrderPolicyConfig {
  if (!value || typeof value !== 'object') return { ...defaultOrderPolicyConfig };
  const raw = (value as Record<string, unknown>).bankTransferTtlHours;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return { ...defaultOrderPolicyConfig };
  const rounded = Math.round(raw);
  const clamped = Math.min(ORDER_POLICY_TTL_MAX_HOURS, Math.max(ORDER_POLICY_TTL_MIN_HOURS, rounded));
  return { bankTransferTtlHours: clamped };
}
