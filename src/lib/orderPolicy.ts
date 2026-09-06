import type { Brand, BrandShippingPolicy, DeliveryFeeBreakdown } from '@/types';

/**
 * 배송비 정책 단일 소스(SSOT). 브랜드 정책이 없는 레거시/테스트 상품은 기존 전역 정책으로
 * 폴백한다. 실제 판매자 정책이 있으면 브랜드와 무관하게 판매자별 상품 합계에 우선 적용한다.
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
  sellerKey?: string;
  sellerName?: string;
  brandName?: string;
  totalPrice: number;
  /** 실제 판매자 정책. 값이 있으면 브랜드 정책보다 우선하며 sellerKey 전체를 한 묶음으로 계산한다. */
  shippingFee?: number;
  freeShippingThreshold?: number;
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
  const grouped = new Map<string, { brandId: string; sellerKey?: string; sellerName?: string; brandName?: string; subtotal: number; shippingFee?: number; freeShippingThreshold?: number }>();

  for (const line of lines) {
    if (line.totalPrice <= 0) continue;
    const groupKey = line.sellerKey ?? line.brandId;
    const current = grouped.get(groupKey) ?? { brandId: line.brandId, sellerKey: line.sellerKey, sellerName: line.sellerName, brandName: line.brandName, subtotal: 0, shippingFee: line.shippingFee, freeShippingThreshold: line.freeShippingThreshold };
    grouped.set(groupKey, {
      brandId: current.brandId,
      sellerKey: line.sellerKey,
      sellerName: current.sellerName ?? line.sellerName,
      brandName: current.brandName ?? line.brandName ?? brandMap.get(line.brandId)?.name,
      subtotal: current.subtotal + line.totalPrice,
      shippingFee: current.shippingFee ?? line.shippingFee,
      freeShippingThreshold: current.freeShippingThreshold ?? line.freeShippingThreshold,
    });
  }

  const breakdown = Array.from(grouped.values()).map((group) => {
    const { brandId } = group;
    const brand = brandMap.get(brandId);
    const policy = group.shippingFee !== undefined
      ? { shippingFee: group.shippingFee, ...(group.freeShippingThreshold !== undefined ? { freeShippingThreshold: group.freeShippingThreshold } : {}) }
      : resolveBrandPolicy(brand);
    const freeShippingThreshold = policy.freeShippingThreshold;
    const isFreeShipping =
      policy.shippingFee === 0 ||
      (freeShippingThreshold !== undefined && group.subtotal >= freeShippingThreshold);
    return {
      brandId,
      ...(group.sellerKey ? { sellerKey: group.sellerKey } : {}),
      ...(group.sellerName ? { sellerName: group.sellerName } : {}),
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
