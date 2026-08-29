import type { Brand, BrandShippingPolicy, DeliveryFeeBreakdown } from '@/types';

/**
 * 배송비 정책 단일 소스(SSOT). 브랜드 정책이 없는 레거시/테스트 상품은 기존 전역 정책으로
 * 폴백하고, 브랜드 정책이 있으면 브랜드별 상품 합계에 shippingFee/freeShippingThreshold를 적용한다.
 */
export const FREE_SHIPPING_THRESHOLD = 50000;
export const DELIVERY_FEE = 3000;

/** 상품 합계 금액 기준 배송비. 합계가 0원(빈 카트 등)이면 배송비도 0원. */
export function calcDeliveryFee(totalProductsPrice: number): number {
  return totalProductsPrice > 0 && totalProductsPrice < FREE_SHIPPING_THRESHOLD
    ? DELIVERY_FEE
    : 0;
}

export interface DeliveryFeeLine {
  brandId: string;
  brandName?: string;
  totalPrice: number;
}

export interface DeliveryFeeCalculation {
  deliveryFee: number;
  breakdown: DeliveryFeeBreakdown[];
}

function resolveBrandPolicy(brand: Brand | undefined): Required<Pick<BrandShippingPolicy, 'shippingFee'>> &
  Pick<BrandShippingPolicy, 'freeShippingThreshold'> {
  const shipping = brand?.shipping;
  if (shipping?.shippingFee !== undefined) {
    return {
      shippingFee: shipping.shippingFee,
      ...(shipping.freeShippingThreshold !== undefined
        ? { freeShippingThreshold: shipping.freeShippingThreshold }
        : {}),
    };
  }
  return {
    shippingFee: DELIVERY_FEE,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  };
}

export function calcBrandDeliveryFee(
  lines: readonly DeliveryFeeLine[],
  brands: readonly Brand[],
): DeliveryFeeCalculation {
  const brandMap = new Map(brands.map((brand) => [brand.id, brand]));
  const grouped = new Map<string, { brandName?: string; subtotal: number }>();

  for (const line of lines) {
    if (line.totalPrice <= 0) continue;
    const current = grouped.get(line.brandId) ?? { brandName: line.brandName, subtotal: 0 };
    grouped.set(line.brandId, {
      brandName: current.brandName ?? line.brandName ?? brandMap.get(line.brandId)?.name,
      subtotal: current.subtotal + line.totalPrice,
    });
  }

  const breakdown = Array.from(grouped.entries()).map(([brandId, group]) => {
    const brand = brandMap.get(brandId);
    const policy = resolveBrandPolicy(brand);
    const freeShippingThreshold = policy.freeShippingThreshold;
    const isFreeShipping =
      policy.shippingFee === 0 ||
      (freeShippingThreshold !== undefined && group.subtotal >= freeShippingThreshold);
    return {
      brandId,
      brandName: group.brandName ?? brand?.name,
      subtotal: group.subtotal,
      shippingFee: policy.shippingFee,
      appliedDeliveryFee: isFreeShipping ? 0 : policy.shippingFee,
      isFreeShipping,
      ...(freeShippingThreshold !== undefined ? { freeShippingThreshold } : {}),
    };
  });

  return {
    deliveryFee: breakdown.reduce((sum, item) => sum + item.appliedDeliveryFee, 0),
    breakdown,
  };
}
