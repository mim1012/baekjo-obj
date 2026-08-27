import { test, expect } from '@playwright/test';
import {
  defaultCategorySettings,
  normalizeStoredCategorySettings,
} from '../../src/lib/categorySettings/config';
import {
  getShopCategorySlugs,
  normalizeShopCategory,
  resolveShopCategory,
} from '../../src/data/shopFilters';

test.describe('0827 공개 쇼핑 분류', () => {
  test('전체를 제외한 공개 상품 분류는 확정된 5개 문구다', () => {
    expect(defaultCategorySettings.productCategories).toEqual([
      '식품·영양',
      '케어',
      '패션',
      '펫로스',
      '라이프',
    ]);
  });

  test('새 분류와 기존 저장 slug를 같은 공개 분류로 정규화한다', () => {
    expect(resolveShopCategory('식품·영양')?.slug).toBe('food-nutrition');
    expect(resolveShopCategory('푸드')?.slug).toBe('food-nutrition');
    expect(resolveShopCategory('영양')?.slug).toBe('food-nutrition');
    expect(resolveShopCategory('케어')?.slug).toBe('care');
    expect(resolveShopCategory('패션')?.slug).toBe('fashion');
    expect(resolveShopCategory('펫로스')?.slug).toBe('pet-loss');
    expect(resolveShopCategory('라이프')?.slug).toBe('life');

    expect(normalizeShopCategory('dining-and-nourish')).toBe('food-nutrition');
    expect(normalizeShopCategory('wellness-and-care')).toBe('food-nutrition');
    expect(normalizeShopCategory('fragrance-and-hygiene')).toBe('care');
    expect(normalizeShopCategory('grooming-and-brushing')).toBe('care');
    expect(normalizeShopCategory('living-and-objet')).toBe('life');
    expect(normalizeShopCategory('play-and-activity')).toBe('life');
  });

  test('그룹 분류는 기존 상품 slug까지 조회 대상으로 확장한다', () => {
    expect(getShopCategorySlugs('food-nutrition')).toEqual([
      'food-nutrition',
      'food',
      'nutrition',
      'dining-and-nourish',
      'wellness-and-care',
    ]);
    expect(getShopCategorySlugs('care')).toEqual([
      'care',
      'fragrance-and-hygiene',
      'grooming-and-brushing',
    ]);
    expect(getShopCategorySlugs('pet-loss')).toEqual(['pet-loss', 'desk-and-stationery']);
  });

  test('구버전 저장 카테고리는 0827 공개 5개 분류로 정규화한다', () => {
    const savedSettings = {
      ...defaultCategorySettings,
      productCategories: ['사료', '간식', '영양제', '위생용품', '생활용품', '장난감', '산책용품', '미용용품'],
    };

    expect(normalizeStoredCategorySettings(savedSettings).productCategories).toEqual([
      '식품·영양',
      '케어',
      '패션',
      '펫로스',
      '라이프',
    ]);
  });

  test('8월 14일 저장 분류는 8월 27일 공개 5개 분류로 정규화한다', () => {
    const savedSettings = {
      ...defaultCategorySettings,
      productCategories: ['푸드', '영양', '케어', '패션', '펫로스', '라이프'],
    };

    expect(normalizeStoredCategorySettings(savedSettings).productCategories).toEqual([
      '식품·영양',
      '케어',
      '패션',
      '펫로스',
      '라이프',
    ]);
  });

  test('관리자가 저장한 비레거시 분류는 그대로 유지한다', () => {
    const savedSettings = {
      ...defaultCategorySettings,
      productCategories: ['푸드', '커스텀'],
    };

    expect(normalizeStoredCategorySettings(savedSettings).productCategories).toEqual(['푸드', '커스텀']);
  });
});
