import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test.describe('마이페이지 주문 렌더링', () => {
  test('주문 카드는 배송조회 전체 완료를 기다리지 않고 먼저 렌더한다', () => {
    const page = src('src', 'app', 'mypage', 'page.tsx');

    const ordersLoadBlock = page.match(/getMyOrders\(\)\.then\(\(orders\) => \{[\s\S]*?\n    \}\);/);
    expect(ordersLoadBlock?.[0]).toContain('setOrders(orders)');
    expect(ordersLoadBlock?.[0]).toContain('Promise.all(');
    expect(ordersLoadBlock?.[0].indexOf('setOrders(orders)')).toBeLessThan(
      ordersLoadBlock?.[0].indexOf('Promise.all(') ?? -1,
    );
  });
});
