import { expect, test } from '@playwright/test';
import {
  defaultCategorySettings,
  normalizeStoredCategorySettings,
} from '../../src/lib/categorySettings/config';
import {
  getShopCategorySlugs,
  getDataBackedShopCategoryOptions,
  normalizeShopCategory,
  resolveShopCategory,
} from '../../src/data/shopFilters';
import { filterProducts } from '../../src/lib/filters';
import type { Product } from '../../src/types';

test.describe('공개 쇼핑 분류', () => {
  test('전체를 제외한 공개 상품 분류는 확정된 6개 문구다', () => {
    expect(defaultCategorySettings.productCategories.map((category) => category.label)).toEqual([
      '푸드', '영양', '케어', '패션', '펫로스', '라이프',
    ]);
    expect(defaultCategorySettings.productCategories.map((category) => category.id)).toEqual([
      'food', 'nutrition', 'care', 'fashion', 'pet-loss', 'life',
    ]);
  });

  test('새 분류와 기존 저장 slug를 같은 공개 분류로 정규화한다', () => {
    expect(resolveShopCategory('식품·영양')?.slug).toBe('food');
    expect(resolveShopCategory('푸드')?.slug).toBe('food');
    expect(resolveShopCategory('영양')?.slug).toBe('nutrition');
    expect(resolveShopCategory('케어')?.slug).toBe('care');
    expect(resolveShopCategory('패션')?.slug).toBe('fashion');
    expect(resolveShopCategory('펫로스')?.slug).toBe('pet-loss');
    expect(resolveShopCategory('라이프')?.slug).toBe('life');

    expect(normalizeShopCategory('dining-and-nourish')).toBe('food');
    expect(normalizeShopCategory('wellness-and-care')).toBe('nutrition');
    expect(normalizeShopCategory('fragrance-and-hygiene')).toBe('care');
    expect(normalizeShopCategory('grooming-and-brushing')).toBe('care');
    expect(normalizeShopCategory('living-and-objet')).toBe('life');
    expect(normalizeShopCategory('play-and-activity')).toBe('life');
  });

  test('그룹 분류는 기존 상품 slug까지 조회 대상으로 확장한다', () => {
    expect(getShopCategorySlugs('food')).toEqual([
      'food',
      'food-nutrition',
      'dining-and-nourish',
    ]);
    expect(getShopCategorySlugs('nutrition')).toEqual([
      'nutrition',
      'wellness-and-care',
    ]);
    expect(getShopCategorySlugs('care')).toEqual([
      'care',
      'fragrance-and-hygiene',
      'grooming-and-brushing',
    ]);
    expect(getShopCategorySlugs('pet-loss')).toEqual(['pet-loss', 'desk-and-stationery']);
  });

  test('구버전 저장 카테고리는 공개 6개 분류로 정규화한다', () => {
    const savedSettings = {
      ...defaultCategorySettings,
      productCategories: ['사료', '간식', '영양제', '위생용품', '생활용품', '장난감', '산책용품', '미용용품'],
    };

    expect(normalizeStoredCategorySettings(savedSettings).productCategories).toEqual(defaultCategorySettings.productCategories);
  });

  test('통합 저장 분류는 공개 6개 분류로 정규화한다', () => {
    const savedSettings = {
      ...defaultCategorySettings,
      productCategories: ['식품·영양', '케어', '패션', '펫로스', '라이프'],
    };

    expect(normalizeStoredCategorySettings(savedSettings).productCategories).toEqual(defaultCategorySettings.productCategories);
  });

  test('관리자가 저장한 비레거시 분류는 그대로 유지한다', () => {
    const savedSettings = {
      ...defaultCategorySettings,
      productCategories: ['푸드', '커스텀'],
    };

    expect(normalizeStoredCategorySettings(savedSettings).productCategories).toEqual([
      { id: 'food', label: '푸드' },
      { id: 'category-2', label: '커스텀' },
    ]);
  });

  test('관리자 카테고리 이름과 순서를 고객 스토어에 그대로 표시한다', () => {
    expect(getDataBackedShopCategoryOptions([
      { id: 'care', label: '관리 용품' },
      { id: 'food', label: '먹거리' },
    ], [])).toEqual([
      { slug: 'care', label: '관리 용품' },
      { slug: 'food', label: '먹거리' },
    ]);
  });
});

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p-test',
    brandId: 'b-test',
    brandName: '메종슈슈 (Maison Chouchou)',
    name: '테스트 상품',
    price: 30_000,
    rating: 4.5,
    reviewCount: 1,
    category: '패션과 액세서리',
    categorySlug: 'fashion-and-accessories',
    lifestyleCategory: 'fashion-and-accessories',
    concernTags: ['skin'],
    petType: 'both',
    ageGroup: 'all',
    image: '',
    stock: 1,
    description: '',
    tags: ['편안한 착용'],
    isBest: false,
    isRecommended: false,
    ...overrides,
  };
}

test('상품명·현재 브랜드명·키워드를 모두 검색한다', () => {
  const products = [product()];
  expect(filterProducts(products, { search: '메종슈슈' })).toHaveLength(1);
  expect(filterProducts(products, { search: 'Maison Chouchou' })).toHaveLength(1);
  expect(filterProducts(products, { search: '편안한 착용' })).toHaveLength(1);
});

test('냄새 태그와 가격 경계로 정확히 필터링한다', () => {
  const products = [
    product({ id: 'p-odor', concernTags: ['odor'], price: 19_999 }),
    product({ id: 'p-other', concernTags: ['skin'], price: 20_000 }),
  ];
  expect(filterProducts(products, { concern: 'odor' }).map((item) => item.id)).toEqual(['p-odor']);
  expect(filterProducts(products, { maxPrice: 19_999 }).map((item) => item.id)).toEqual(['p-odor']);
  expect(filterProducts(products, { minPrice: 20_000 }).map((item) => item.id)).toEqual(['p-other']);
});

test('푸드와 영양을 서로 다른 공개 분류로 필터링한다', () => {
  const products = [
    product({ id: 'p-food', category: '식사와 영양', categorySlug: 'dining-and-nourish' }),
    product({ id: 'p-nutrition', category: '건강과 케어', categorySlug: 'wellness-and-care' }),
  ];

  expect(filterProducts(products, { category: 'food' }).map((item) => item.id)).toEqual(['p-food']);
  expect(filterProducts(products, { category: 'nutrition' }).map((item) => item.id)).toEqual(['p-nutrition']);
});

test('관리자가 추가한 반려동물 연결값은 같은 상품만 필터링하고 공용 상품을 섞지 않는다', () => {
  const products = [
    product({ id: 'bird', petType: 'pet-bird' }),
    product({ id: 'both', petType: 'both' }),
    product({ id: 'dog', petType: 'dog' }),
  ];
  expect(filterProducts(products, { petType: 'pet-bird' }).map((item) => item.id)).toEqual(['bird']);
});
