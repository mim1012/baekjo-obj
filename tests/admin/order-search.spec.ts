import { test, expect } from '@playwright/test';
import { matchesOrderSearch } from '../../src/components/admin-new/orders/orderSearch';
import type { Order, OrderItem } from '../../src/types';

/**
 * wave-4 발견: 스테이징에 items.productName이 undefined인 레거시 주문 4건이 실재했고,
 * 관리자가 /admin/orders 검색창에 아무 문자나 입력하는 순간 item.productName.toLowerCase()가
 * undefined에서 터져 목록 전체가 렌더 크래시로 백지 화면이 됐다. 이 스펙은 malformed 행이
 * 있어도 절대 throw하지 않고 "매칭 안 됨"으로만 처리되는지 브라우저·DB 없이 고정한다.
 */

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerName: '홍길동',
    phone: '010-1111-2222',
    address: '서울시 강남구',
    items: [],
    totalPrice: 10000,
    deliveryFee: 3000,
    paymentMethod: '카드',
    orderStatus: '주문접수',
    paymentStatus: '결제완료',
    deliveryStatus: '배송전',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

test.describe('matchesOrderSearch — 레거시/기형 주문 검색 크래시 방지 (wave-4)', () => {
  test('productName이 undefined인 아이템이 있어도 throw하지 않는다', () => {
    const malformedItem = { productId: 'p1', quantity: 1, price: 1000 } as OrderItem;
    const order = baseOrder({ items: [malformedItem] });

    expect(() => matchesOrderSearch(order, 'anything')).not.toThrow();
    expect(matchesOrderSearch(order, 'anything')).toBe(false);
  });

  test('items 배열 자체가 undefined/null이어도 throw하지 않는다', () => {
    const order = baseOrder({ items: undefined as unknown as OrderItem[] });
    expect(() => matchesOrderSearch(order, 'x')).not.toThrow();
    expect(matchesOrderSearch(order, 'x')).toBe(false);
  });

  test('customerName/phone/id가 undefined여도 throw하지 않는다', () => {
    const order = baseOrder({
      customerName: undefined as unknown as string,
      phone: undefined as unknown as string,
      id: undefined as unknown as string,
    });
    expect(() => matchesOrderSearch(order, '아무거나')).not.toThrow();
    expect(matchesOrderSearch(order, '아무거나')).toBe(false);
  });

  test('정상 데이터는 기존과 동일하게 매칭된다(회귀 없음)', () => {
    const order = baseOrder({
      customerName: '김철수',
      phone: '010-9999-8888',
      items: [{ productId: 'p1', productName: '강아지 사료', quantity: 1, price: 20000 }],
    });

    expect(matchesOrderSearch(order, '김철수')).toBe(true);
    expect(matchesOrderSearch(order, '9999')).toBe(true);
    expect(matchesOrderSearch(order, '사료')).toBe(true);
    expect(matchesOrderSearch(order, order.id.toLowerCase())).toBe(true);
    expect(matchesOrderSearch(order, '전혀-매칭-안됨')).toBe(false);
  });

  test('malformed 항목과 정상 항목이 섞여 있어도 정상 항목으로는 매칭된다', () => {
    const malformedItem = { productId: 'p1', quantity: 1, price: 1000 } as OrderItem;
    const order = baseOrder({
      items: [malformedItem, { productId: 'p2', productName: '고양이 캔', quantity: 1, price: 5000 }],
    });

    expect(() => matchesOrderSearch(order, '캔')).not.toThrow();
    expect(matchesOrderSearch(order, '캔')).toBe(true);
  });
});
