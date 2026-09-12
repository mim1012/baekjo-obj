import type { Product } from '@/types';

export type ProductDisplayOrderField =
  | 'homeDisplayOrder'
  | 'dailyPickDisplayOrder'
  | 'storeDisplayOrder';

/**
 * 관리자 진열 순서가 있는 상품을 먼저, 숫자가 작은 상품을 앞에 둔다.
 * 아직 순서를 저장하지 않은 기존 상품은 호출부가 넘긴 현재 순서를 그대로 유지한다.
 */
export function sortProductsByDisplayOrder(
  products: Product[],
  field: ProductDisplayOrderField,
): Product[] {
  return products
    .map((product, index) => ({ product, index }))
    .sort((a, b) => {
      const aOrder = a.product[field];
      const bOrder = b.product[field];
      const aHasOrder = typeof aOrder === 'number';
      const bHasOrder = typeof bOrder === 'number';

      if (aHasOrder && bHasOrder && aOrder !== bOrder) return aOrder - bOrder;
      if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ product }) => product);
}
