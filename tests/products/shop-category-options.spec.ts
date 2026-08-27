import { test, expect } from '@playwright/test';
import { getDataBackedShopCategoryOptions } from '@/data/shopFilters';

test('운영 설정과 상품 카테고리가 어긋나면 0건 카테고리를 숨기고 실제 카테고리를 보완한다', () => {
  const options = getDataBackedShopCategoryOptions(
    ['푸드', '영양', '케어', '패션', '펫로스', '라이프'],
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
    'dining-and-nourish',
    'wellness-and-care',
    'fragrance-and-hygiene',
    'grooming-and-brushing',
    'living-and-objet',
    'fashion-and-accessories',
  ]);
  expect(options.some((option) => option.slug === '푸드')).toBe(false);
});

test('관리자 사용자 정의 카테고리는 실제 상품에 쓰일 때 그대로 노출한다', () => {
  const options = getDataBackedShopCategoryOptions(['맞춤 카테고리'], ['맞춤 카테고리']);
  expect(options).toEqual([{ slug: '맞춤 카테고리', label: '맞춤 카테고리' }]);
});
