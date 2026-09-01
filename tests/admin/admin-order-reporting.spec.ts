import { test, expect } from '@playwright/test';
import type { Brand, Order } from '../../src/types';
import {
  buildAdminOrderReport,
  formatOrderCreatedAtKst,
  isCanceledOrRefundedOrder,
} from '../../src/lib/orders/adminOrderReporting';

const brands: Brand[] = [
  {
    id: 'brand-a',
    slug: 'brand-a',
    name: '페네핏',
    logo: '',
    description: '',
    philosophy: '',
    auditPoints: [],
    representativeProductIds: [],
    relatedConcernSlugs: [],
    isRecommended: false,
    isVisible: true,
  },
  {
    id: 'brand-b',
    slug: 'brand-b',
    name: '알로밍',
    logo: '',
    description: '',
    philosophy: '',
    auditPoints: [],
    representativeProductIds: [],
    relatedConcernSlugs: [],
    isRecommended: false,
    isVisible: true,
  },
];

function order(overrides: Partial<Order>): Order {
  return {
    id: 'order-1',
    customerName: '구매자',
    phone: '010-1234-5678',
    address: '서울시 강남구',
    items: [
      { productId: 'a-1', productName: '페네핏 팔레트', optionName: '레드', quantity: 1, price: 10000, brandId: 'brand-a' },
    ],
    totalPrice: 10000,
    deliveryFee: 3000,
    deliveryFeeBreakdown: [
      {
        brandId: 'brand-a',
        brandName: '페네핏',
        subtotal: 10000,
        shippingFee: 3000,
        appliedDeliveryFee: 3000,
        isFreeShipping: false,
      },
    ],
    paymentMethod: '카드',
    orderStatus: '주문접수',
    paymentStatus: '결제완료',
    deliveryStatus: '배송준비',
    createdAt: '2026-08-29T06:56:37.000Z',
    ...overrides,
  };
}

test('Given UTC order time, When formatting for order reporting, Then it uses KST seconds format', () => {
  expect(formatOrderCreatedAtKst('2026-08-29T06:56:37.000Z')).toBe('2026-08-29 15:56:37');
});

test('Given canceled and paid orders, When building the report, Then canceled rows remain but sales totals exclude them', () => {
  const paid = order({
    id: 'paid',
    items: [
      { productId: 'a-1', productName: '페네핏 팔레트', optionName: '레드', quantity: 2, price: 10000, brandId: 'brand-a' },
      { productId: 'a-2', productName: '페네핏 토이', optionName: 'M', quantity: 1, price: 5000, brandId: 'brand-a' },
    ],
    totalPrice: 25000,
    deliveryFee: 3000,
    deliveryFeeBreakdown: [
      {
        brandId: 'brand-a',
        brandName: '페네핏',
        subtotal: 25000,
        shippingFee: 3000,
        appliedDeliveryFee: 3000,
        isFreeShipping: false,
      },
    ],
  });
  const canceled = order({
    id: 'canceled',
    orderStatus: '취소완료',
    paymentStatus: '환불완료',
    items: [
      { productId: 'a-1', productName: '페네핏 팔레트', optionName: '레드', quantity: 10, price: 10000, brandId: 'brand-a' },
    ],
    totalPrice: 100000,
    deliveryFee: 3000,
  });

  const report = buildAdminOrderReport({ orders: [paid, canceled], brands });

  expect(report.detailRows.map((row) => [row.orderId, row.cancelRefundFlag])).toEqual([
    ['paid', 'N'],
    ['paid', 'N'],
    ['canceled', 'Y'],
  ]);
  expect(isCanceledOrRefundedOrder(canceled)).toBe(true);
  expect(report.overall.productAmount).toBe(25000);
  expect(report.overall.shipping).toBe(3000);
  expect(report.overall.finalAmount).toBe(28000);
  expect(report.brands).toHaveLength(1);
  expect(report.brands[0]?.total).toEqual({
    quantity: 3,
    productAmount: 25000,
    shipping: 3000,
    finalAmount: 28000,
  });
  const productRows = report.brands[0]?.products.map((row) => [row.productName, row.optionName, row.quantity, row.shipping]);
  expect(productRows).toContainEqual(['페네핏 팔레트', '레드', 2, 3000]);
  expect(productRows).toContainEqual(['페네핏 토이', 'M', 1, 0]);
});

test('Given a brand filter, When building the report, Then only that brand details and summaries are included', () => {
  const multiBrand = order({
    id: 'multi-brand',
    items: [
      { productId: 'a-1', productName: '페네핏 팔레트', optionName: '레드', quantity: 1, price: 10000, brandId: 'brand-a' },
      { productId: 'b-1', productName: '알로밍 토크', optionName: '기본', quantity: 2, price: 7000, brandId: 'brand-b' },
    ],
    totalPrice: 24000,
    deliveryFee: 6000,
    deliveryFeeBreakdown: [
      {
        brandId: 'brand-a',
        brandName: '페네핏',
        subtotal: 10000,
        shippingFee: 3000,
        appliedDeliveryFee: 3000,
        isFreeShipping: false,
      },
      {
        brandId: 'brand-b',
        brandName: '알로밍',
        subtotal: 14000,
        shippingFee: 3000,
        appliedDeliveryFee: 3000,
        isFreeShipping: false,
      },
    ],
  });

  const report = buildAdminOrderReport({ orders: [multiBrand], brands, brandId: 'brand-b' });

  expect(report.detailRows.map((row) => row.brandName)).toEqual(['알로밍']);
  expect(report.overall).toEqual({ quantity: 2, productAmount: 14000, shipping: 3000, finalAmount: 17000 });
  expect(report.brands.map((brand) => brand.brandName)).toEqual(['알로밍']);
});
