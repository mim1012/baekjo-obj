import { test, expect } from '@playwright/test';
import type { Order, OrderItem, Shipment } from '@/types';
import { canReviewOrderItem, isShipmentPurchaseConfirmed } from '@/lib/reviews/purchaseEligibility';

const order: Pick<Order, 'id'> = { id: 'order-1' };
const item: Pick<OrderItem, 'brandId'> = { brandId: 'brand-1' };

function shipment(overrides: Partial<Shipment>): Shipment {
  return {
    id: 'shipment-1',
    orderId: 'order-1',
    brandId: 'brand-1',
    deliveryStatus: '배송전',
    createdAt: '2026-07-21T00:00:00.000Z',
    ...overrides,
  };
}

test.describe('구매평 작성 가능 조건', () => {
  test('배송완료만으로는 구매평 작성 대상이 아니다', () => {
    const shipments = [shipment({ deliveryStatus: '배송완료' })];

    expect(isShipmentPurchaseConfirmed(shipments[0])).toBe(false);
    expect(canReviewOrderItem(order, item, shipments)).toBe(false);
  });

  test('구매확정 송장이 있으면 구매평 작성 대상이다', () => {
    const shipments = [shipment({ deliveryStatus: '구매확정', confirmedAt: '2026-07-21T01:00:00.000Z' })];

    expect(isShipmentPurchaseConfirmed(shipments[0])).toBe(true);
    expect(canReviewOrderItem(order, item, shipments)).toBe(true);
  });

  test('주문상품의 브랜드 송장이 아니면 구매확정이어도 작성 대상이 아니다', () => {
    const shipments = [shipment({ brandId: 'other-brand', deliveryStatus: '구매확정' })];

    expect(canReviewOrderItem(order, item, shipments)).toBe(false);
  });
});
