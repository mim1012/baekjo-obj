import { expect, test } from '@playwright/test';
import { calcBrandDeliveryFee } from '@/lib/orderPolicy';
import type { Brand } from '@/types';

function brand(id: string, shippingFee: number, freeShippingThreshold?: number): Brand {
  return {
    id,
    slug: id,
    name: `Brand ${id}`,
    logo: '',
    description: '',
    philosophy: '',
    auditPoints: [],
    representativeProductIds: [],
    relatedConcernSlugs: [],
    isRecommended: false,
    shipping: {
      shippingFee,
      ...(freeShippingThreshold !== undefined ? { freeShippingThreshold } : {}),
    },
  };
}

test('브랜드 배송비는 브랜드별 상품 합계를 묶어 한 번씩 합산한다', () => {
  const result = calcBrandDeliveryFee(
    [
      { brandId: 'b1', brandName: '페네핏', totalPrice: 99_000 },
      { brandId: 'b7', brandName: '메종슈슈', totalPrice: 20_000 },
      { brandId: 'b7', brandName: '메종슈슈', totalPrice: 31_000 },
    ],
    [brand('b1', 3_000), brand('b7', 3_500, 50_000)],
  );

  expect(result.deliveryFee).toBe(3_000);
  expect(result.breakdown).toEqual([
    {
      brandId: 'b1',
      brandName: '페네핏',
      subtotal: 99_000,
      shippingFee: 3_000,
      appliedDeliveryFee: 3_000,
      isFreeShipping: false,
    },
    {
      brandId: 'b7',
      brandName: '메종슈슈',
      subtotal: 51_000,
      shippingFee: 3_500,
      appliedDeliveryFee: 0,
      isFreeShipping: true,
      freeShippingThreshold: 50_000,
    },
  ]);
});

test('브랜드 정책이 없으면 기존 전역 5만원 무료배송 정책으로 폴백한다', () => {
  const belowThreshold = calcBrandDeliveryFee([{ brandId: 'legacy', totalPrice: 49_000 }], []);
  const aboveThreshold = calcBrandDeliveryFee([{ brandId: 'legacy', totalPrice: 50_000 }], []);

  expect(belowThreshold.deliveryFee).toBe(3_000);
  expect(aboveThreshold.deliveryFee).toBe(0);
});

test('실제 판매자 정책은 브랜드 정책보다 우선하고 여러 브랜드 상품도 판매자당 한 번 계산한다', () => {
  const result = calcBrandDeliveryFee([
    { brandId: 'b1', sellerKey: 'seller:s1', brandName: '판매자 1', totalPrice: 30_000, shippingFee: 4_000, freeShippingThreshold: 50_000 },
    { brandId: 'b7', sellerKey: 'seller:s1', brandName: '판매자 1', totalPrice: 25_000, shippingFee: 4_000, freeShippingThreshold: 50_000 },
  ], [brand('b1', 9_000), brand('b7', 8_000)]);

  expect(result.deliveryFee).toBe(0);
  expect(result.breakdown).toHaveLength(1);
  expect(result.breakdown[0]).toMatchObject({ sellerKey: 'seller:s1', subtotal: 55_000, shippingFee: 4_000, isFreeShipping: true });
});
