import type { Product, ProductOption } from '@/types';

function nonNegativeStock(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value!)) : 0;
}

export function getFirstAvailableOption(product: Product): ProductOption | undefined {
  if (nonNegativeStock(product.stock) === 0) return undefined;
  return product.options?.find((option) => nonNegativeStock(option.stock) > 0);
}

/**
 * 상품 전체 재고와 선택 옵션 재고 중 더 작은 값을 실제 구매 가능 수량으로 사용한다.
 * 옵션 상품에서 optionId가 없거나 더 이상 존재하지 않으면 구식/위조 카트로 보고 0을 반환한다.
 */
export function getPurchasableStock(product: Product, optionId?: string): number {
  const productStock = nonNegativeStock(product.stock);
  if (!product.options || product.options.length === 0) return productStock;
  if (!optionId) return 0;

  const option = product.options.find((candidate) => candidate.id === optionId);
  if (!option) return 0;
  return Math.min(productStock, nonNegativeStock(option.stock));
}
