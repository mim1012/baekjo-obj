import { test, expect } from '@playwright/test';
import { getDataBackedShopCategoryOptions } from '@/data/shopFilters';

test('관리자에 저장한 카테고리 순서를 먼저 쓰고 미등록 기존 상품 분류만 뒤에 보완한다', () => {
  const options = getDataBackedShopCategoryOptions(
    [
      { id: 'food', label: '푸드' },
      { id: 'care', label: '케어' },
      { id: 'fashion', label: '패션' },
      { id: 'pet-loss', label: '펫로스' },
      { id: 'life', label: '라이프' },
    ],
    [
      'dining-and-nourish',
      'wellness-and-care',
      'fragrance-and-hygiene',
      'grooming-and-brushing',
      'living-and-objet',
      'fashion-and-accessories',
    ],
  );

  expect(options.map((option) => option.slug)).toEqual([
    'food',
    'care',
    'fashion',
    'pet-loss',
    'life',
    'nutrition',
  ]);
  expect(options.some((option) => option.slug === '푸드')).toBe(false);
});

test('관리자 사용자 정의 카테고리는 연결 상품이 아직 없어도 등록한 이름으로 노출한다', () => {
  const options = getDataBackedShopCategoryOptions([{ id: 'custom', label: '맞춤 카테고리' }], []);
  expect(options).toEqual([{ slug: 'custom', label: '맞춤 카테고리' }]);
});
