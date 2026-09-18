import type { Product } from '@/types';

export const REPET_BRAND_ID = 'b6';

export function isRepetMadeToOrderProduct(brandId: string): boolean {
  return brandId === REPET_BRAND_ID;
}

/**
 * 주문·동의 같은 서버 코드에서도 UI 컴포넌트를 가져오지 않고 쓸 수 있는 순수 판정 함수.
 * 구조화 정책이 저장된 상품을 우선하고, 기존 RE:펫 상품은 데이터 이관 동안 호환한다.
 */
export function isMadeToOrderProduct(
  product: Pick<Product, 'brandId' | 'madeToOrderPolicy'>,
): boolean {
  return product.madeToOrderPolicy?.active === true || isRepetMadeToOrderProduct(product.brandId);
}
