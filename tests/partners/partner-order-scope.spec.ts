import { expect, test } from '@playwright/test';
import { projectPartnerOrder } from '@/lib/partners/orderScope';

const order = {
  id: 'order-1',
  memberId: 'member-1',
  reclaimDead: false,
  customerName: '구매자',
  phone: '010-0000-0000',
  address: '주소',
  items: [
    { productId: 'a', productName: '브랜드 A 상품', quantity: 1, price: 1000, brandId: 'brand-a' },
    { productId: 'b', productName: '브랜드 B 상품', quantity: 1, price: 2000, brandId: 'brand-b' },
  ],
  totalPrice: 3000,
  deliveryFee: 0,
  paymentMethod: '무통장입금',
  orderStatus: '주문접수' as const,
  paymentStatus: '입금대기',
  deliveryStatus: '배송전',
  createdAt: '2026-01-01T00:00:00.000Z',
};

test('파트너 주문 투영은 관리 브랜드 상품과 배송만 반환한다', () => {
  const view = projectPartnerOrder(order, ['brand-a'], [
    { id: 'shipment-a', orderId: 'order-1', brandId: 'brand-a', deliveryStatus: '배송중', createdAt: order.createdAt },
    { id: 'shipment-b', orderId: 'order-1', brandId: 'brand-b', deliveryStatus: '배송완료', createdAt: order.createdAt },
  ]);

  expect(view?.items.map((item) => item.brandId)).toEqual(['brand-a']);
  expect(view?.shipment?.brandId).toBe('brand-a');
  expect(view?.items.some((item) => item.brandId === 'brand-b')).toBe(false);
});

test('파트너가 관리하지 않는 브랜드만 포함한 주문은 보이지 않는다', () => {
  expect(projectPartnerOrder(order, ['brand-c'], [])).toBeNull();
});
