import { test, expect } from '@playwright/test';
import { brandDeliveryFee, brandItems } from '../../src/lib/orders/actionRequests';
import type { Order } from '../../src/types';

const order = (): Order => ({
  id: 'order-1', customerName: '고객', phone: '010', address: '주소',
  items: [
    { productId: 'p1', productName: '브랜드 A 상품', brandId: 'brand-a', quantity: 2, price: 1000 },
    { productId: 'p2', productName: '브랜드 B 상품', brandId: 'brand-b', quantity: 1, price: 2000 },
  ], totalPrice: 4000, deliveryFee: 5000,
  deliveryFeeBreakdown: [
    { brandId: 'brand-a', subtotal: 2000, shippingFee: 3000, appliedDeliveryFee: 3000, isFreeShipping: false },
    { brandId: 'brand-b', subtotal: 2000, shippingFee: 2000, appliedDeliveryFee: 2000, isFreeShipping: false },
  ],
  paymentMethod: '신용카드', orderStatus: '주문접수', paymentStatus: '결제완료', deliveryStatus: '배송전', createdAt: '2026-01-01',
});

test.describe('브랜드별 취소·환불 요청 계산', () => {
  test('브랜드 상품만 추려 환불 요청 금액에 해당 브랜드 배송비를 더한다', () => {
    const current = order();
    const items = brandItems(current, 'brand-a');
    expect(items).toHaveLength(1);
    expect(items[0]?.amount).toBe(2000);
    expect(brandDeliveryFee(current, 'brand-a')).toBe(3000);
  });
});
