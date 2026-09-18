import { test, expect } from '@playwright/test';
import type { Brand, Order } from '../../src/types';
import { CSV_UTF8_BOM, serializeAdminOrdersCsv } from '../../src/lib/orders/adminOrderExportCsv';

const brands: Brand[] = [
  {
    id: 'brand-a',
    slug: 'brand-a',
    name: '백조식기',
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

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerName: '=HYPERLINK("http://bad.example")',
    phone: '010-1111-2222',
    address: '서울시',
    items: [
      { productId: 'p1', productName: '세라믹 식기', optionName: 'S', quantity: 2, price: 10000, brandId: 'brand-a' },
      { productId: 'p2', productName: '+위험 상품', quantity: 1, price: 5000, brandId: 'brand-a' },
    ],
    deliveryFeeBreakdown: [
      {
        brandId: 'brand-a',
        brandName: '백조식기',
        subtotal: 25000,
        shippingFee: 3000,
        appliedDeliveryFee: 3000,
        isFreeShipping: false,
        freeShippingThreshold: 50000,
      },
    ],
    totalPrice: 25000,
    deliveryFee: 3000,
    paymentMethod: '카드',
    orderStatus: '주문접수',
    paymentStatus: '결제완료',
    deliveryStatus: '배송준비',
    createdAt: '2026-07-10T10:00:00.000Z',
    carrier: 'cj',
    trackingNumber: '1234567890',
    deliveryMemo: '문 앞',
    ...overrides,
  };
}

test.describe('serializeAdminOrdersCsv', () => {
  test('UTF-8 BOM과 상품별 행을 유지하고 브랜드 배송비 breakdown을 함께 기록한다', () => {
    const csv = serializeAdminOrdersCsv([makeOrder()], brands);

    expect(csv.startsWith(CSV_UTF8_BOM)).toBe(true);
    expect(csv).toContain('"주문번호","주문자"');
    expect(csv).toContain('"order-1","\'=HYPERLINK(""http://bad.example"")"');
    expect(csv).toContain('"p1","세라믹 식기","S","2","10000","20000","brand-a","백조식기","25000","3000","3000","N","50000"');
    expect(csv).toContain('"p2","\'+위험 상품"');
    expect(csv.split('\r\n').filter(Boolean)).toHaveLength(3);
  });

  test('상품이 없는 레거시 주문도 주문 행을 잃지 않는다', () => {
    const csv = serializeAdminOrdersCsv([makeOrder({ items: [] })], brands);

    expect(csv).toContain('"상품 정보 없음"');
    expect(csv.split('\r\n').filter(Boolean)).toHaveLength(2);
  });

  test('같은 브랜드의 판매자별 배송비는 sellerKey로 각 상품 행에 연결한다', () => {
    const csv = serializeAdminOrdersCsv([makeOrder({
      items: [
        { productId: 'p1', productName: '판매자1 상품', quantity: 1, price: 10_000, brandId: 'brand-a', sellerId: 's1' },
        { productId: 'p2', productName: '판매자2 상품', quantity: 1, price: 20_000, brandId: 'brand-a', sellerId: 's2' },
      ],
      deliveryFeeBreakdown: [
        { brandId: 'brand-a', brandName: '백조식기', sellerKey: 'seller:s1', subtotal: 10_000, shippingFee: 3_000, appliedDeliveryFee: 3_000, isFreeShipping: false },
        { brandId: 'brand-a', brandName: '백조식기', sellerKey: 'seller:s2', subtotal: 20_000, shippingFee: 4_000, appliedDeliveryFee: 4_000, isFreeShipping: false },
      ],
    })], brands);

    expect(csv).toContain('"p1","판매자1 상품","","1","10000","10000","brand-a","백조식기","10000","3000","3000"');
    expect(csv).toContain('"p2","판매자2 상품","","1","20000","20000","brand-a","백조식기","20000","4000","4000"');
  });
});
