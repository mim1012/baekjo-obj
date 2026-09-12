import { expect, test } from '@playwright/test';
import { sortProductsByDisplayOrder } from '../../src/lib/products/displayOrder';
import { validateProductFields } from '../../src/lib/products/validate';
import type { Product } from '../../src/types';

function product(id: string, order: Partial<Pick<Product, 'homeDisplayOrder' | 'dailyPickDisplayOrder' | 'storeDisplayOrder'>> = {}): Product {
  return {
    id,
    brandId: 'brand-1',
    name: id,
    price: 10_000,
    rating: 0,
    reviewCount: 0,
    category: 'food',
    lifestyleCategory: 'daily',
    concernTags: [],
    petType: 'dog',
    ageGroup: 'all',
    image: '/product.png',
    stock: 10,
    description: '',
    isVisible: true,
    isBest: true,
    isRecommended: true,
    ...order,
  };
}

test('진열 순서는 위치별 숫자가 작은 상품을 먼저 두고 미설정 기존 상품은 안정 순서를 유지한다', () => {
  const products = [
    product('legacy-a'),
    product('second', { homeDisplayOrder: 2 }),
    product('first', { homeDisplayOrder: 1 }),
    product('legacy-b'),
  ];

  expect(sortProductsByDisplayOrder(products, 'homeDisplayOrder').map(({ id }) => id)).toEqual([
    'first',
    'second',
    'legacy-a',
    'legacy-b',
  ]);
});

test('홈·DAILY PICK·스토어 순서는 서로 독립적이다', () => {
  const products = [
    product('a', { homeDisplayOrder: 1, dailyPickDisplayOrder: 2, storeDisplayOrder: 3 }),
    product('b', { homeDisplayOrder: 2, dailyPickDisplayOrder: 3, storeDisplayOrder: 1 }),
    product('c', { homeDisplayOrder: 3, dailyPickDisplayOrder: 1, storeDisplayOrder: 2 }),
  ];

  expect(sortProductsByDisplayOrder(products, 'homeDisplayOrder').map(({ id }) => id)).toEqual(['a', 'b', 'c']);
  expect(sortProductsByDisplayOrder(products, 'dailyPickDisplayOrder').map(({ id }) => id)).toEqual(['c', 'a', 'b']);
  expect(sortProductsByDisplayOrder(products, 'storeDisplayOrder').map(({ id }) => id)).toEqual(['b', 'c', 'a']);
});

test('진열 순서는 0~100000 정수만 관리자 API 입력으로 허용한다', () => {
  expect(validateProductFields({ homeDisplayOrder: 0 }, false)?.homeDisplayOrder).toBe(0);
  expect(validateProductFields({ dailyPickDisplayOrder: 100_000 }, false)?.dailyPickDisplayOrder).toBe(100_000);
  expect(validateProductFields({ storeDisplayOrder: 7 }, false)?.storeDisplayOrder).toBe(7);
  expect(validateProductFields({ homeDisplayOrder: -1 }, false)).toBeNull();
  expect(validateProductFields({ dailyPickDisplayOrder: 1.5 }, false)).toBeNull();
  expect(validateProductFields({ storeDisplayOrder: 100_001 }, false)).toBeNull();
});
