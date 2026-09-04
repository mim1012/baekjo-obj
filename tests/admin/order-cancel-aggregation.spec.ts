import { test, expect } from '@playwright/test';
import {
  aggregateOrderCancelStatus,
  deriveRequestStatus,
  reservedQuantityByLine,
  type OrderActionRequestItemState,
  type OrderActionRequestRecord,
} from '../../src/lib/orders/actionRequests';
import type { Order } from '../../src/types';

function makeItem(overrides: Partial<OrderActionRequestItemState> = {}): OrderActionRequestItemState {
  return {
    id: 'item-1', lineIndex: 0, productId: 'p1', productName: '상품', quantity: 1,
    unitPrice: 1000, amount: 1000, status: 'REQUESTED', ...overrides,
  };
}

function makeRequest(overrides: Partial<OrderActionRequestRecord> = {}): OrderActionRequestRecord {
  return {
    id: 'request-1', orderId: 'order-1', memberId: 'member-1', requestType: 'CANCEL', brandId: 'brand-a',
    items: [makeItem()], requestedAmount: 1000, reason: '고객 요청', status: 'REQUESTED',
    createdAt: '2026-01-01', updatedAt: '2026-01-01', ...overrides,
  };
}

function makeOrder(items: Order['items']): Pick<Order, 'items'> {
  return { items };
}

test.describe('deriveRequestStatus -- 아이템 상태에서 요청 레벨 상태 파생', () => {
  test('전체 REJECTED면 REJECTED', () => {
    expect(deriveRequestStatus([makeItem({ status: 'REJECTED' })])).toBe('REJECTED');
  });

  test('전체 COMPLETED면 COMPLETED', () => {
    expect(deriveRequestStatus([makeItem({ status: 'COMPLETED' }), makeItem({ id: 'item-2', status: 'COMPLETED' })])).toBe('COMPLETED');
  });

  test('하나라도 APPROVED가 있으면 APPROVED', () => {
    expect(deriveRequestStatus([makeItem({ status: 'COMPLETED' }), makeItem({ id: 'item-2', status: 'APPROVED' })])).toBe('APPROVED');
  });

  test('APPROVED 없이 REQUESTED가 있으면 REQUESTED', () => {
    expect(deriveRequestStatus([makeItem({ status: 'COMPLETED' }), makeItem({ id: 'item-2', status: 'REQUESTED' })])).toBe('REQUESTED');
  });

  test('COMPLETED와 APPROVED만 섞이면 APPROVED', () => {
    expect(deriveRequestStatus([makeItem({ status: 'COMPLETED' }), makeItem({ id: 'item-2', status: 'APPROVED' })])).toBe('APPROVED');
  });
});

test.describe('aggregateOrderCancelStatus -- 주문 전체 취소 집계', () => {
  const order = makeOrder([
    { productId: 'p1', productName: 'A', quantity: 2, price: 1000 },
    { productId: 'p2', productName: 'B', quantity: 1, price: 2000 },
  ]);

  test('요청이 없으면 주문접수', () => {
    expect(aggregateOrderCancelStatus(order, [])).toBe('주문접수');
  });

  test('REQUESTED 아이템이 있으면 취소요청', () => {
    const requests = [makeRequest({ items: [makeItem({ status: 'REQUESTED', quantity: 1 })] })];
    expect(aggregateOrderCancelStatus(order, requests)).toBe('취소요청');
  });

  test('COMPLETED 없이 APPROVED만 있으면 부분취소', () => {
    const requests = [makeRequest({ items: [makeItem({ status: 'APPROVED', quantity: 1 })] })];
    expect(aggregateOrderCancelStatus(order, requests)).toBe('부분취소');
  });

  test('일부 수량만 COMPLETED면(전체 미달) 부분취소완료', () => {
    const requests = [makeRequest({ items: [makeItem({ status: 'COMPLETED', quantity: 1 })] })];
    expect(aggregateOrderCancelStatus(order, requests)).toBe('부분취소완료');
  });

  test('전체 수량(3개)이 COMPLETED면 취소완료', () => {
    const requests = [
      makeRequest({
        items: [
          makeItem({ id: 'item-1', lineIndex: 0, quantity: 2, status: 'COMPLETED' }),
          makeItem({ id: 'item-2', lineIndex: 1, quantity: 1, status: 'COMPLETED' }),
        ],
      }),
    ];
    expect(aggregateOrderCancelStatus(order, requests)).toBe('취소완료');
  });

  test('멀티 수량 라인의 일부만 완료되면 성급하게 취소완료로 올리지 않는다(부분취소완료)', () => {
    // 라인0 수량 2개 중 1개만 COMPLETED -- 전체(3개) 미달이므로 부분취소완료여야 한다.
    const requests = [makeRequest({ items: [makeItem({ id: 'item-1', lineIndex: 0, quantity: 1, status: 'COMPLETED' })] })];
    expect(aggregateOrderCancelStatus(order, requests)).toBe('부분취소완료');
  });
});

test.describe('reservedQuantityByLine -- 아이템 상태 기반 예약', () => {
  test('REJECTED 아이템은 잔여 수량을 해제하고 나머지 상태는 예약을 유지한다', () => {
    const reserved = reservedQuantityByLine([
      makeRequest({ items: [makeItem({ id: 'item-1', lineIndex: 0, status: 'REQUESTED', quantity: 1 })] }),
      makeRequest({ id: 'request-2', items: [makeItem({ id: 'item-2', lineIndex: 1, status: 'APPROVED', quantity: 1 })] }),
      makeRequest({ id: 'request-3', items: [makeItem({ id: 'item-3', lineIndex: 2, status: 'COMPLETED', quantity: 1 })] }),
      makeRequest({ id: 'request-4', items: [makeItem({ id: 'item-4', lineIndex: 3, status: 'REJECTED', quantity: 1 })] }),
    ]);
    expect(reserved.get(0)).toBe(1);
    expect(reserved.get(1)).toBe(1);
    expect(reserved.get(2)).toBe(1);
    expect(reserved.get(3)).toBeUndefined();
  });
});
