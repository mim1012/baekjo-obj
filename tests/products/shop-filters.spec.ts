import { test, expect } from '@playwright/test';
import { defaultCategorySettings } from '../../src/lib/categorySettings/config';
import {
  getShopCategorySlugs,
  normalizeShopCategory,
  resolveShopCategory,
} from '../../src/data/shopFilters';

test.describe('HWPX 공개 쇼핑 분류', () => {
  test('전체를 제외한 공개 상품 분류는 6개 문구다', () => {
    expect(defaultCategorySettings.productCategories).toEqual([
      '푸드',
      '영양',
      '케어',
      '패션',
      '펫로스',
      '라이프',
    ]);
  });

  test('새 분류와 기존 저장 slug를 같은 공개 분류로 정규화한다', () => {
    expect(resolveShopCategory('푸드')?.slug).toBe('food');
    expect(resolveShopCategory('영양')?.slug).toBe('nutrition');
    expect(resolveShopCategory('케어')?.slug).toBe('care');
    expect(resolveShopCategory('패션')?.slug).toBe('fashion');
    expect(resolveShopCategory('펫로스')?.slug).toBe('pet-loss');
    expect(resolveShopCategory('라이프')?.slug).toBe('life');

    expect(normalizeShopCategory('dining-and-nourish')).toBe('food');
    expect(normalizeShopCategory('fragrance-and-hygiene')).toBe('care');
    expect(normalizeShopCategory('grooming-and-brushing')).toBe('care');
    expect(normalizeShopCategory('living-and-objet')).toBe('life');
    expect(normalizeShopCategory('play-and-activity')).toBe('life');
  });

  test('그룹 분류는 기존 상품 slug까지 조회 대상으로 확장한다', () => {
    expect(getShopCategorySlugs('food')).toEqual(['food', 'dining-and-nourish']);
    expect(getShopCategorySlugs('care')).toEqual([
      'care',
      'fragrance-and-hygiene',
      'grooming-and-brushing',
    ]);
    expect(getShopCategorySlugs('pet-loss')).toEqual(['pet-loss', 'desk-and-stationery']);
  });
});
