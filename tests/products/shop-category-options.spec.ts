import { test, expect } from '@playwright/test';
import { getDataBackedShopCategoryOptions } from '@/data/shopFilters';

test('운영 설정과 상품 카테고리가 어긋나도 기본 카테고리 6개를 같은 순서로 유지한다', () => {
  const options = getDataBackedShopCategoryOptions(
    ['식품·영양', '케어', '패션', '펫로스', '라이프'],
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
    'nutrition',
    'care',
    'fashion',
    'pet-loss',
    'life',
  ]);
  expect(options.some((option) => option.slug === '푸드')).toBe(false);
});

test('관리자 사용자 정의 카테고리는 기본 6개 뒤에 실제 상품에 쓰일 때 노출한다', () => {
  const options = getDataBackedShopCategoryOptions(['맞춤 카테고리'], ['맞춤 카테고리']);
  expect(options.map((option) => option.slug)).toEqual([
    'food',
    'nutrition',
    'care',
    'fashion',
    'pet-loss',
    'life',
    '맞춤 카테고리',
  ]);
});
