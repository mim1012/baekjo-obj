import type { Product } from '@/types';

export function getProductPointsRateLabel(
  product: Pick<Product, 'pointsEnabled' | 'pointsRate'>,
): string | null {
  if (!product.pointsEnabled) return null;
  if (typeof product.pointsRate !== 'number' || !Number.isFinite(product.pointsRate)) return null;
  if (product.pointsRate <= 0) return null;

  return Number.isInteger(product.pointsRate)
    ? `${product.pointsRate}%`
    : `${product.pointsRate.toLocaleString('ko-KR')}%`;
}
