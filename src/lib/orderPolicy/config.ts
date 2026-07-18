// 주문 정책(무통장입금 자동취소 on/off + 예약 TTL) 타입 + 기본값 + 정규화. 서버(API route·repo)와
// 클라이언트(관리자 화면) 양쪽에서 안전하게 import 할 수 있도록 'use client' 없는 순수 모듈로 둔다
// (categorySettings/config.ts 와 동일 이유 — client-reference 프록시 치환 방지).

export interface OrderPolicyConfig {
  /**
   * 무통장입금 주문 자동취소(TTL 만료 시 취소·재고복원) 사용 여부.
   * 기본 **false**(2026-07-18 결정: 무통장 자동취소 기능 미사용) — 끄면 무통장 주문이
   * expires_at 없이 생성되어 reclaim-stock cron 스캔에서 아예 제외된다(입금 확인 전까지 입금대기 유지).
   * 카드결제의 10분 TTL 은 이 설정과 무관하게 항상 유지된다(결제 승인 클레임 안전망).
   */
  bankTransferAutoCancelEnabled: boolean;
  /** 자동취소 활성 시 무통장입금 주문의 재고 선점 유효시간(시간 단위). 만료되면 reclaim-stock cron 이 취소·재고복원. */
  bankTransferTtlHours: number;
}

// TTL 허용 범위 — 0/음수는 생성 즉시 만료(주문 불능), 과도한 값은 무기한 선점(W2 재고 DoS)과
// 다를 바 없으므로 1시간~720시간(30일)로 못 박는다.
export const ORDER_POLICY_TTL_MIN_HOURS = 1;
export const ORDER_POLICY_TTL_MAX_HOURS = 720;

// 기본: 자동취소 **비활성**(2026-07-18, 무통장 자동취소 미사용 결정). ttlHours 72 는 재활성화 대비
// 보존값 — 입금 기한을 넉넉히 덮되(3영업일 가정) 무한 선점은 막는 값이며, 활성 상태에서만 의미가 있다.
// reservationExpiry.ts 의 BANK_TRANSFER_RESERVATION_MS("활성 시 기본 TTL")가 이 값에서 파생된다(단일 소스).
export const defaultOrderPolicyConfig: OrderPolicyConfig = {
  bankTransferAutoCancelEnabled: false,
  bankTransferTtlHours: 72,
};

/**
 * jsonb 저장값(unknown)을 안전한 OrderPolicyConfig 로 정규화한다. 절대 throw 하지 않는다 —
 * 깨진 저장값이 주문 생성 경로(POST /api/orders)를 죽이면 안 되기 때문이다.
 * - bankTransferAutoCancelEnabled: 저장값이 `=== true` 일 때만 true. 누락·비불리언·truthy 문자열
 *   전부 false(기본 비활성) — 깨진 값이 자동취소를 되살리는 방향으로 접히면 안 된다.
 * - bankTransferTtlHours: enabled 와 무관하게 항상 정규화해 보존한다(재활성화 대비).
 *   객체가 아니거나 숫자가 아니면(NaN/Infinity 포함) 기본 72시간, 소수는 반올림,
 *   범위 밖은 [MIN, MAX]로 클램프한다.
 */
export function normalizeOrderPolicyConfig(value: unknown): OrderPolicyConfig {
  if (!value || typeof value !== 'object') return { ...defaultOrderPolicyConfig };
  const record = value as Record<string, unknown>;
  const enabled = record.bankTransferAutoCancelEnabled === true;
  const raw = record.bankTransferTtlHours;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return { ...defaultOrderPolicyConfig, bankTransferAutoCancelEnabled: enabled };
  }
  const rounded = Math.round(raw);
  const clamped = Math.min(ORDER_POLICY_TTL_MAX_HOURS, Math.max(ORDER_POLICY_TTL_MIN_HOURS, rounded));
  return { bankTransferAutoCancelEnabled: enabled, bankTransferTtlHours: clamped };
}
