import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test.describe('마이페이지 주문 렌더링', () => {
  // 2026-07-24 개정 — 원 단언은 "setOrders가 주문별 getOrderShipments Promise.all보다 먼저"라는
  // 옛 N+1 코드 모양이었다. desync 재조사에서 그 N+1 자체가 결함으로 판정돼(주문 261건 계정에서
  // 요청 폭풍→개별 fetch 실패가 '운송장 없음' 오표시 — memory wishlist-desync-repro-2026-07-23)
  // 배치 콘센트 1회 호출(getMyOrderShipments)로 교체됐다. 취지(주문 카드는 배송조회를 기다리지
  // 않고 먼저 렌더)는 분리된 로드로 더 강하게 만족되므로, 단언을 새 계약으로 바꾼다.
  test('주문 카드는 배송조회를 기다리지 않고 먼저 렌더하고, 배송조회는 배치 1회로 읽는다(N+1 금지)', () => {
    const page = src('src', 'app', 'mypage', 'page.tsx');

    // 주문 로드 블록은 setOrders만 한다 — 배송조회를 이 블록 안에서 기다리지 않는다.
    const ordersLoadBlock = page.match(/getMyOrders\(\)\.then\(\(orders\) => \{[\s\S]*?\n    \}\);/);
    expect(ordersLoadBlock?.[0]).toContain('setOrders(orders)');
    expect(ordersLoadBlock?.[0]).not.toContain('getOrderShipments');

    // 배송조회는 배치 콘센트 1회 호출 — 주문별 개별 fetch(N+1) 재도입 금지.
    expect(page).toContain('getMyOrderShipments()');
    expect(page).not.toMatch(/orders\.map\([\s\S]{0,120}getOrderShipments\(/);
  });
});
