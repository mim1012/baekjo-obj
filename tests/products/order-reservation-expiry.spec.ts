import { test, expect } from '@playwright/test';
import {
  reservationExpiryIso,
  BANK_TRANSFER_RESERVATION_MS,
  CARD_RESERVATION_MS,
} from '@/lib/orders/reservationExpiry';

// 재고 선점 만료 정책 순수 함수 스펙 — DB/브라우저/네트워크 불필요.
// 정책(2026-07-18): 무통장 자동취소는 기본 **미사용** — TTL 이 null 이면 무통장 주문은 만료(null)를
// 받아 expires_at 없이 생성되고 reclaim-stock cron 스캔에서 제외된다(입금 확인 전까지 입금대기 유지).
// 관리자가 자동취소를 켠 경우에만 숫자 TTL 이 주입돼 유한 만료를 받는다.
// 카드(10분)는 이 설정과 무관하게 그대로여야 한다(결제 승인 재고 회수 안전망 — 회귀 금지).

const NOW = Date.UTC(2026, 6, 18, 0, 0, 0); // 2026-07-18T00:00:00Z 고정 기준

test('무통장 + TTL null(자동취소 미사용) → null(만료 없음, expiresAt 미기록)', () => {
  expect(reservationExpiryIso('무통장입금', NOW, null)).toBeNull();
});

test('카드 + TTL null 이어도 카드는 항상 10분 만료를 받는다(안전망 불변)', () => {
  const iso = reservationExpiryIso('신용카드', NOW, null);
  expect(iso).not.toBeNull();
  const deltaMs = new Date(iso as string).getTime() - NOW;
  expect(deltaMs).toBe(CARD_RESERVATION_MS);
  expect(deltaMs).toBe(10 * 60 * 1000);
});

test('무통장 + 숫자 TTL(자동취소 활성) → 주입된 TTL 의 만료 ISO 를 받는다(기존 동작)', () => {
  const customTtlMs = 24 * 60 * 60 * 1000; // 관리자가 24시간으로 설정한 경우
  const iso = reservationExpiryIso('무통장입금', NOW, customTtlMs);
  expect(iso).not.toBeNull();
  expect(new Date(iso as string).getTime() - NOW).toBe(customTtlMs);
});

test('무통장 + 활성 기본 TTL(BANK_TRANSFER_RESERVATION_MS) → 72시간 만료', () => {
  const iso = reservationExpiryIso('무통장입금', NOW, BANK_TRANSFER_RESERVATION_MS);
  expect(iso).not.toBeNull();
  const deltaMs = new Date(iso as string).getTime() - NOW;
  expect(deltaMs).toBe(BANK_TRANSFER_RESERVATION_MS);
  expect(deltaMs).toBe(72 * 60 * 60 * 1000);
});

test('카드 경로는 주입된 무통장 TTL 을 무시하고 10분을 유지한다(설정이 카드에 새면 안 됨)', () => {
  const customTtlMs = 24 * 60 * 60 * 1000;
  const iso = reservationExpiryIso('신용카드', NOW, customTtlMs);
  const deltaMs = new Date(iso as string).getTime() - NOW;
  expect(deltaMs).toBe(CARD_RESERVATION_MS);
});

test('무통장 이외 결제수단은 TTL null 과 무관하게 항상 10분 만료(카카오페이 등)', () => {
  const iso = reservationExpiryIso('카카오페이', NOW, null);
  expect(iso).not.toBeNull();
  expect(new Date(iso as string).getTime() - NOW).toBe(CARD_RESERVATION_MS);
});
