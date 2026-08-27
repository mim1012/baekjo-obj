import { test, expect } from '@playwright/test';
import {
  allRemainingItemsSelected,
  normalizeRefundRequest,
  remainingQuantity,
  type OrderRefundRecord,
} from '@/lib/orders/refund';
import type { Order } from '@/types';

function order(over: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerName: '홍길동',
    phone: '010-0000-0000',
    address: '서울',
    items: [
      { productId: 'product-1', productName: '사료', quantity: 2, price: 10_000 },
      { productId: 'product-2', productName: '간식', quantity: 1, price: 5_000 },
    ],
    totalPrice: 25_000,
    deliveryFee: 3_000,
    paymentMethod: '신용카드',
    orderStatus: '주문접수',
    paymentStatus: '결제완료',
    deliveryStatus: '배송전',
    createdAt: '2026-08-01T00:00:00.000Z',
    paymentKey: 'payment-key-1',
    ...over,
  };
}

function successfulRefund(items: OrderRefundRecord['items']): OrderRefundRecord {
  return {
    id: 'refund-1',
    orderId: 'order-1',
    idempotencyKey: 'refund-key-1',
    items,
    includeDeliveryFee: false,
    requestedAmount: items.reduce((sum, item) => sum + item.amount, 0),
    approvedAmount: items.reduce((sum, item) => sum + item.amount, 0),
    status: 'SUCCEEDED',
    reason: '고객 요청',
    createdAt: '2026-08-01T00:00:00.000Z',
  };
}

test('환불 금액은 클라이언트가 보낸 금액이 아니라 주문 시점 단가로 계산된다', () => {
  const request = normalizeRefundRequest(order(), {
    idempotencyKey: 'refund-key-1',
    reason: '상품 1개 반품',
    includeDeliveryFee: false,
    requestedAmount: 1,
    items: [{ lineIndex: 0, productId: 'product-1', quantity: 1 }],
  });

  expect(request.requestedAmount).toBe(10_000);
  expect(request.items[0].unitPrice).toBe(10_000);
});

test('상품 식별자·수량과 배송 후 환불을 서버 계약에서 거부한다', () => {
  expect(() =>
    normalizeRefundRequest(order(), {
      idempotencyKey: 'refund-key-1',
      reason: '위조',
      items: [{ lineIndex: 0, productId: 'other-product', quantity: 1 }],
    }),
  ).toThrow('refund-quantity-exceeds-order');

  expect(() =>
    normalizeRefundRequest(order({ deliveryStatus: '배송중' }), {
      idempotencyKey: 'refund-key-2',
      reason: '배송 후 요청',
      items: [{ lineIndex: 0, productId: 'product-1', quantity: 1 }],
    }),
  ).toThrow('refund-after-shipment-not-supported');
});

test('성공한 부분환불의 잔여 수량만 전액 환불 선택으로 인정한다', () => {
  const refunds = [
    successfulRefund([
      {
        lineIndex: 0,
        productId: 'product-1',
        productName: '사료',
        quantity: 2,
        unitPrice: 10_000,
        amount: 20_000,
      },
    ]),
  ];
  const currentOrder = order();

  expect(remainingQuantity(currentOrder.items[0], 0, refunds)).toBe(0);
  expect(remainingQuantity(currentOrder.items[1], 1, refunds)).toBe(1);
  expect(
    allRemainingItemsSelected(
      currentOrder,
      [{ lineIndex: 1, productId: 'product-2', quantity: 1 }],
      refunds,
    ),
  ).toBe(true);
});

test('배송비는 잔여 상품을 모두 선택한 경우에만 포함할 수 있다', () => {
  const currentOrder = order();
  const request = normalizeRefundRequest(currentOrder, {
    idempotencyKey: 'refund-key-3',
    reason: '전액 환불',
    includeDeliveryFee: true,
    items: [
      { lineIndex: 0, productId: 'product-1', quantity: 2 },
      { lineIndex: 1, productId: 'product-2', quantity: 1 },
    ],
  });

  expect(request.requestedAmount).toBe(28_000);
});
