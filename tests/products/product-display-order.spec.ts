import { expect, test } from '@playwright/test';
import type { Product } from '@/types';
import {
  hasManagedProductOrder,
  sortByManagedProductOrder,
} from '@/lib/products/displayOrder';

function product(id: string, patch: Partial<Product> = {}): Product {
  return {
    id,
    brandId: 'brand',
    name: id,
    price: 1000,
    rating: 0,
    reviewCount: 0,
    category: '생활',
    lifestyleCategory: '생활',
    concernTags: [],
    petType: 'both',
    ageGroup: 'all',
    image: '/images/icon-product.svg',
    stock: 1,
    description: '',
    isVisible: true,
    isBest: false,
    isRecommended: false,
    ...patch,
  };
}

test.describe('상품 화면별 진열 순서', () => {
  test('순서를 아직 저장하지 않은 기존 상품은 전달받은 홈페이지 순서를 그대로 유지한다', () => {
    const products = [product('a'), product('b'), product('c')];
    expect(hasManagedProductOrder(products, 'catalogOrder')).toBe(false);
    expect(sortByManagedProductOrder(products, 'catalogOrder').map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  test('기존 홈 인기순 fallback도 명시적 순서가 생기기 전까지만 사용한다', () => {
    const products = [
      product('low', { rating: 1, reviewCount: 1 }),
      product('high', { rating: 5, reviewCount: 10 }),
    ];
    const fallback = sortByManagedProductOrder(
      products,
      'homeFeaturedOrder',
      (a, b) => b.rating * b.reviewCount - a.rating * a.reviewCount,
    );
    expect(fallback.map((item) => item.id)).toEqual(['high', 'low']);
  });

  test('관리자가 저장한 화면별 순서는 다른 화면의 순서와 섞이지 않는다', () => {
    const products = [
      product('a', { homeFeaturedOrder: 2, shopFeaturedOrder: 0, catalogOrder: 1 }),
      product('b', { homeFeaturedOrder: 0, shopFeaturedOrder: 1, catalogOrder: 2 }),
      product('c', { homeFeaturedOrder: 1, shopFeaturedOrder: 2, catalogOrder: 0 }),
    ];
    expect(sortByManagedProductOrder(products, 'homeFeaturedOrder').map((item) => item.id)).toEqual(['b', 'c', 'a']);
    expect(sortByManagedProductOrder(products, 'shopFeaturedOrder').map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(sortByManagedProductOrder(products, 'catalogOrder').map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  test('일부만 순서가 있는 과도기 데이터는 명시된 상품을 먼저 두고 나머지는 기존 순서를 보존한다', () => {
    const products = [product('a'), product('b', { catalogOrder: 0 }), product('c')];
    expect(sortByManagedProductOrder(products, 'catalogOrder').map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });
});
