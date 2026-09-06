import type { Product } from '@/types';
import { isDisclosureComplete } from '@/lib/products/disclosures';
import { isSellerLegallyComplete } from '@/lib/sellers/validate';

/** 고객이 결제를 시작해도 되는 상품인지 모든 공개 화면이 같은 기준으로 판정한다. */
export function isProductCommerceReady(
  product: Pick<Product, 'sellerId' | 'seller' | 'disclosure'>,
): boolean {
  return Boolean(
    product.sellerId
      && product.seller
      && product.seller.status === 'verified'
      && isSellerLegallyComplete(product.seller)
      && isDisclosureComplete(product.disclosure),
  );
}
