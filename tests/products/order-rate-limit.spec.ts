import { test, expect } from '@playwright/test';
import {
  checkOrderRateLimit,
  ORDER_RATE_LIMIT_MAX,
  ORDER_RATE_LIMIT_WINDOW_MS,
} from '@/lib/orders/rateLimit';

// 주문 생성 레이트리밋 순수 함수 스펙 — DB/브라우저/네트워크 불필요.
// 회귀 배경(W2): 회원 전용 POST /api/orders 에도 자동화 주문 루프가 들어오면 재고를 순식간에
// 고갈시킬 수 있다. 정밀 제한이 아니라 남용 '댐핑'이 목적(서버리스 다중 인스턴스 주의 —
// 인스턴스별 카운터).

test(`창 안에서 ${ORDER_RATE_LIMIT_MAX}건까지 허용하고 그 다음 건을 차단한다`, () => {
  const key = `test-block-${Date.now()}-${Math.random()}`;
  const t0 = 1_000_000;
  for (let i = 1; i <= ORDER_RATE_LIMIT_MAX; i += 1) {
    expect(checkOrderRateLimit(key, t0)).toBe(true);
  }
  // N+1번째는 같은 창 안이므로 차단.
  expect(checkOrderRateLimit(key, t0)).toBe(false);
});

test('창이 지나면 카운터가 리셋되어 다시 허용한다', () => {
  const key = `test-reset-${Date.now()}-${Math.random()}`;
  const t0 = 2_000_000;
  for (let i = 1; i <= ORDER_RATE_LIMIT_MAX; i += 1) {
    checkOrderRateLimit(key, t0);
  }
  expect(checkOrderRateLimit(key, t0)).toBe(false); // 창 안 초과
  const afterWindow = t0 + ORDER_RATE_LIMIT_WINDOW_MS + 1;
  expect(checkOrderRateLimit(key, afterWindow)).toBe(true); // 창 경과 → 리셋
});

test('많은 서로 다른 키(>prune 주기)를 훑어도 스윕이 정상 동작하고 계속 제한한다', () => {
  // prune 경로(200회마다 만료 엔트리 정리) 실행 커버 — 만료된 키 300개를 유입시켜 스윕을 태운
  // 뒤에도 새 키는 정상적으로 허용, 초과 시 차단되는지 확인한다(스윕이 카운터를 깨지 않음).
  const base = t0Unique();
  for (let i = 0; i < 300; i += 1) {
    // 각 키를 서로 다른 오래된 창(만료됨)에 넣어 다음 스윕 대상이 되게 한다.
    checkOrderRateLimit(`prune-${base}-${i}`, i);
  }
  const fresh = `prune-fresh-${base}`;
  const now = 10_000_000;
  for (let i = 1; i <= ORDER_RATE_LIMIT_MAX; i += 1) {
    expect(checkOrderRateLimit(fresh, now)).toBe(true);
  }
  expect(checkOrderRateLimit(fresh, now)).toBe(false);
});

function t0Unique(): string {
  return `${Date.now()}-${Math.random()}`;
}

test('키가 다르면 서로 독립적으로 카운트한다', () => {
  const a = `test-a-${Date.now()}-${Math.random()}`;
  const b = `test-b-${Date.now()}-${Math.random()}`;
  const t0 = 3_000_000;
  for (let i = 1; i <= ORDER_RATE_LIMIT_MAX; i += 1) checkOrderRateLimit(a, t0);
  expect(checkOrderRateLimit(a, t0)).toBe(false); // a 초과
  expect(checkOrderRateLimit(b, t0)).toBe(true); // b 는 영향 없음
});
