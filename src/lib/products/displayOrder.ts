import type { Product } from '@/types';

export type ProductOrderField = 'homeFeaturedOrder' | 'shopFeaturedOrder' | 'catalogOrder';

function isOrder(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function hasManagedProductOrder(
  products: readonly Product[],
  field: ProductOrderField,
): boolean {
  return products.some((product) => isOrder(product[field]));
}

/**
 * 순서를 한 번도 저장하지 않은 기존 상품은 fallback 정렬을 그대로 사용해 홈페이지가 배포만으로
 * 재배치되지 않게 한다. 관리자가 순서 버튼을 누르면 해당 화면의 모든 상품에 순번을 저장하므로
 * 그때부터 관리자와 고객 화면이 같은 명시적 순서를 읽는다.
 */
export function sortByManagedProductOrder(
  products: readonly Product[],
  field: ProductOrderField,
  fallbackCompare?: (a: Product, b: Product) => number,
): Product[] {
  const indexed = products.map((product, index) => ({ product, index }));
  if (!hasManagedProductOrder(products, field)) {
    if (!fallbackCompare) return indexed.map(({ product }) => product);
    return indexed
      .sort((a, b) => fallbackCompare(a.product, b.product) || a.index - b.index)
      .map(({ product }) => product);
  }

  return indexed
    .sort((a, b) => {
      const aOrder = isOrder(a.product[field]) ? a.product[field] : Number.MAX_SAFE_INTEGER;
      const bOrder = isOrder(b.product[field]) ? b.product[field] : Number.MAX_SAFE_INTEGER;
      return aOrder - bOrder || a.index - b.index;
    })
    .map(({ product }) => product);
}

export function productPopularityScore(product: Product): number {
  return product.rating * product.reviewCount;
}
