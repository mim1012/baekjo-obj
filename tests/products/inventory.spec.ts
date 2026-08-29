import { test, expect } from '@playwright/test';
import { getFirstAvailableOption, getPurchasableStock } from '@/lib/products/inventory';
import type { Product } from '@/types';

const product: Product = {
  id: 'p-stock',
  brandId: 'b1',
  name: '재고 상품',
  price: 10000,
  rating: 0,
  reviewCount: 0,
  category: '케어',
  lifestyleCategory: '케어',
  concernTags: [],
  petType: 'both',
  ageGroup: 'all',
  image: '',
  stock: 8,
  description: '',
  isBest: false,
  isRecommended: false,
  options: [
    { id: 'sold-out', name: '품절', price: 0, stock: 0 },
    { id: 'available', name: '판매중', price: 0, stock: 3 },
  ],
};

test('첫 구매 가능 옵션을 선택하고 상품/옵션 재고 중 작은 값을 상한으로 쓴다', () => {
  expect(getFirstAvailableOption(product)?.id).toBe('available');
  expect(getPurchasableStock(product, 'available')).toBe(3);
});

test('품절·없는·미선택 옵션은 구매 가능 재고가 0이다', () => {
  expect(getPurchasableStock(product, 'sold-out')).toBe(0);
  expect(getPurchasableStock(product, 'missing')).toBe(0);
  expect(getPurchasableStock(product)).toBe(0);
});

test('옵션 없는 상품은 상품 전체 재고를 쓴다', () => {
  expect(getPurchasableStock({ ...product, options: undefined })).toBe(8);
});
