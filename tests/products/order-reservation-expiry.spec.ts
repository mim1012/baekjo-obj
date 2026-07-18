import { test, expect } from '@playwright/test';
import {
  reservationExpiryIso,
  BANK_TRANSFER_RESERVATION_MS,
  CARD_RESERVATION_MS,
} from '@/lib/orders/reservationExpiry';

// 재고 선점 만료 정책 순수 함수 스펙 — DB/브라우저/네트워크 불필요.
// 회귀 배경(W2): 무통장입금('입금대기') 주문이 expires_at 없이 생성돼 재고가 무기한 선점되고,
// reclaim-stock cron 이 스캔조차 못 해 익명 주문 루프로 재고 DoS 가 가능했다. 이제 무통장도
// 유한(72h) 만료를 받는다. 카드(10분)는 회귀 없이 그대로여야 한다.

const NOW = Date.UTC(2026, 6, 18, 0, 0, 0); // 2026-07-18T00:00:00Z 고정 기준

test('무통장입금 주문은 약 72시간 뒤 만료를 받는다', () => {
  const iso = reservationExpiryIso('무통장입금', NOW);
  const deltaMs = new Date(iso).getTime() - NOW;
  expect(deltaMs).toBe(BANK_TRANSFER_RESERVATION_MS);
  expect(deltaMs).toBe(72 * 60 * 60 * 1000);
});

test('카드결제 주문은 기존과 동일하게 10분 만료를 유지한다(회귀 방지)', () => {
  const iso = reservationExpiryIso('신용카드', NOW);
  const deltaMs = new Date(iso).getTime() - NOW;
  expect(deltaMs).toBe(CARD_RESERVATION_MS);
  expect(deltaMs).toBe(10 * 60 * 1000);
});

test('관리자 설정 TTL(bankTransferTtlMs)을 주입하면 무통장 만료가 그 값을 따른다', () => {
  const customTtlMs = 24 * 60 * 60 * 1000; // 관리자가 24시간으로 줄인 경우
  const iso = reservationExpiryIso('무통장입금', NOW, customTtlMs);
  const deltaMs = new Date(iso).getTime() - NOW;
  expect(deltaMs).toBe(customTtlMs);
});

test('카드 경로는 주입된 무통장 TTL 을 무시하고 10분을 유지한다(설정이 카드에 새면 안 됨)', () => {
  const customTtlMs = 24 * 60 * 60 * 1000;
  const iso = reservationExpiryIso('신용카드', NOW, customTtlMs);
  const deltaMs = new Date(iso).getTime() - NOW;
  expect(deltaMs).toBe(CARD_RESERVATION_MS);
});

test('무통장 만료가 카드 만료보다 확실히 길다(무기한 선점 제거의 핵심)', () => {
  const bank = new Date(reservationExpiryIso('무통장입금', NOW)).getTime();
  const card = new Date(reservationExpiryIso('카카오페이', NOW)).getTime();
  expect(bank).toBeGreaterThan(card);
});
