import { test, expect } from '@playwright/test';
import {
  aggregateOrderCancelStatus,
  brandDeliveryFee,
  deriveRequestStatus,
  remainingLineQuantity,
  reservedQuantityByLine,
  type OrderActionRequestItemState,
  type OrderActionRequestRecord,
} from '../../src/lib/orders/actionRequests';
import type { OrderRefundRecord } from '../../src/lib/orders/refund';
import { ALL_ORDER_STATUSES, ORDER_STATUSES } from '../../src/types';
import type { Order } from '../../src/types';

/**
 * PR4(상품 수량 기반 취소 처리) 순수 집계 로직 회귀 테스트 — 브라우저·DB 없이 admin project에서 돈다.
 * .omx/plans/cms-pr4-cancellation-20260915.md의 상태 계약(부분취소/부분취소완료, 배송비 상한,
 * 전량반려 다운그레이드 금지, brandDeliveryFee 합산)을 그대로 커버한다.
 */

function makeItem(overrides: Partial<OrderActionRequestItemState> = {}): OrderActionRequestItemState {
  return {
    id: 'item-1',
    lineIndex: 0,
    productId: 'p1',
    productName: '상품',
    quantity: 1,
    unitPrice: 1000,
    amount: 1000,
    status: 'REQUESTED',
    ...overrides,
  };
}

function makeRequest(overrides: Partial<OrderActionRequestRecord> = {}): OrderActionRequestRecord {
  return {
    id: 'request-1',
    orderId: 'order-1',
    memberId: 'member-1',
    requestType: 'CANCEL',
    brandId: 'brand-a',
    items: [makeItem()],
    requestedAmount: 1000,
    reason: '고객 요청',
    status: 'REQUESTED',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    ...overrides,
  };
}

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    customerName: '홍길동',
    phone: '010-0000-0000',
    address: '서울시',
    items: [
      { productId: 'p1', productName: 'A', quantity: 2, price: 1000, brandId: 'brand-a' },
      { productId: 'p2', productName: 'B', quantity: 1, price: 2000, brandId: 'brand-a' },
    ],
    totalPrice: 4000,
    deliveryFee: 3000,
    paymentMethod: '카드',
    orderStatus: '주문접수',
    paymentStatus: '결제완료',
    deliveryStatus: '배송전',
    createdAt: '2026-07-17T00:00:00.000Z',
    ...overrides,
  };
}

function makeRefund(overrides: Partial<OrderRefundRecord> = {}): OrderRefundRecord {
  return {
    id: 'refund-1',
    orderId: 'order-1',
    idempotencyKey: 'idem-1',
    items: [],
    includeDeliveryFee: false,
    requestedAmount: 1000,
    status: 'SUCCEEDED',
    reason: '고객 요청',
    createdAt: '2026-01-01',
    ...overrides,
  };
}

test.describe('DERIVED_ORDER_STATUSES -- 파생 상태는 관리자 수동 화이트리스트에 없다', () => {
  test('부분취소/부분취소완료는 ORDER_STATUSES(관리자 PATCH 화이트리스트)에 없다', () => {
    expect(ORDER_STATUSES).not.toContain('부분취소');
    expect(ORDER_STATUSES).not.toContain('부분취소완료');
  });

  test('ALL_ORDER_STATUSES는 수동 화이트리스트 + 파생 상태를 합친 것이다', () => {
    expect(ALL_ORDER_STATUSES).toEqual([...ORDER_STATUSES, '부분취소', '부분취소완료']);
  });
});

test.describe('deriveRequestStatus -- 아이템 상태에서 요청 레벨 상태 파생', () => {
  test('빈 배열이면 REQUESTED', () => {
    expect(deriveRequestStatus([])).toBe('REQUESTED');
  });

  test('전체 REJECTED면 REJECTED', () => {
    expect(deriveRequestStatus([{ status: 'REJECTED' }, { status: 'REJECTED' }])).toBe('REJECTED');
  });

  test('REJECTED와 COMPLETED만 섞이면 COMPLETED(반려는 완료 판정을 막지 않는다)', () => {
    expect(deriveRequestStatus([{ status: 'REJECTED' }, { status: 'COMPLETED' }])).toBe('COMPLETED');
  });

  test('전체 COMPLETED면 COMPLETED', () => {
    expect(deriveRequestStatus([{ status: 'COMPLETED' }, { status: 'COMPLETED' }])).toBe('COMPLETED');
  });

  test('APPROVED가 있고 REQUESTED가 없으면 APPROVED (COMPLETED와 섞여도)', () => {
    expect(deriveRequestStatus([{ status: 'COMPLETED' }, { status: 'APPROVED' }])).toBe('APPROVED');
  });

  test('REQUESTED가 하나라도 남아있으면 항상 REQUESTED', () => {
    expect(deriveRequestStatus([{ status: 'COMPLETED' }, { status: 'APPROVED' }, { status: 'REQUESTED' }])).toBe(
      'REQUESTED',
    );
  });
});

test.describe('aggregateOrderCancelStatus -- 주문 전체 취소 집계', () => {
  test('요청 아이템이 없으면(행 0건) 현재 orderStatus를 그대로 둔다', () => {
    const order = makeOrder({ orderStatus: '주문접수' });
    expect(aggregateOrderCancelStatus({ order, items: [], refunds: [] })).toBe('주문접수');

    const shipped = makeOrder({ orderStatus: '취소완료' });
    expect(aggregateOrderCancelStatus({ order: shipped, items: [], refunds: [] })).toBe('취소완료');
  });

  test('활성(REQUESTED/APPROVED) 수량이 주문 전체(3개)를 채우면 취소요청', () => {
    const order = makeOrder();
    const items = [
      makeItem({ id: 'i1', lineIndex: 0, quantity: 2, status: 'REQUESTED' }),
      makeItem({ id: 'i2', lineIndex: 1, quantity: 1, status: 'APPROVED' }),
    ];
    expect(aggregateOrderCancelStatus({ order, items, refunds: [] })).toBe('취소요청');
  });

  test('활성 수량이 일부만이면 부분취소', () => {
    const order = makeOrder();
    const items = [makeItem({ id: 'i1', lineIndex: 0, quantity: 1, status: 'APPROVED' })];
    expect(aggregateOrderCancelStatus({ order, items, refunds: [] })).toBe('부분취소');
  });

  test('활성 수량이 남아있으면(일부만) COMPLETED 수량이 있어도 부분취소로 판정한다(활성 우선)', () => {
    const order = makeOrder();
    const items = [
      makeItem({ id: 'i1', lineIndex: 0, quantity: 1, status: 'COMPLETED' }),
      makeItem({ id: 'i2', lineIndex: 1, quantity: 1, status: 'REQUESTED' }),
    ];
    expect(aggregateOrderCancelStatus({ order, items, refunds: [] })).toBe('부분취소');
  });

  test('COMPLETED 수량이 전체 미달이면 부분취소완료', () => {
    const order = makeOrder();
    const items = [makeItem({ id: 'i1', lineIndex: 0, quantity: 1, status: 'COMPLETED' })];
    expect(aggregateOrderCancelStatus({ order, items, refunds: [] })).toBe('부분취소완료');
  });

  test('COMPLETED 수량이 전체(3개)를 채우고 배송비 조건이 없으면(무통장 등) 취소완료', () => {
    const order = makeOrder({ paymentStatus: '입금대기' });
    const items = [
      makeItem({ id: 'i1', lineIndex: 0, quantity: 2, status: 'COMPLETED' }),
      makeItem({ id: 'i2', lineIndex: 1, quantity: 1, status: 'COMPLETED' }),
    ];
    expect(aggregateOrderCancelStatus({ order, items, refunds: [] })).toBe('취소완료');
  });

  test('결제완료+배송비>0인데 배송비 포함 SUCCEEDED 환불이 없으면 전량완료라도 부분취소완료로 상한', () => {
    const order = makeOrder({ paymentStatus: '결제완료', deliveryFee: 3000 });
    const items = [
      makeItem({ id: 'i1', lineIndex: 0, quantity: 2, status: 'COMPLETED' }),
      makeItem({ id: 'i2', lineIndex: 1, quantity: 1, status: 'COMPLETED' }),
    ];
    expect(aggregateOrderCancelStatus({ order, items, refunds: [] })).toBe('부분취소완료');
  });

  test('배송비 포함 SUCCEEDED 환불이 이후 성공하면 취소완료로 올라간다', () => {
    const order = makeOrder({ paymentStatus: '결제완료', deliveryFee: 3000 });
    const items = [
      makeItem({ id: 'i1', lineIndex: 0, quantity: 2, status: 'COMPLETED' }),
      makeItem({ id: 'i2', lineIndex: 1, quantity: 1, status: 'COMPLETED' }),
    ];
    const refunds = [makeRefund({ status: 'SUCCEEDED', includeDeliveryFee: true })];
    expect(aggregateOrderCancelStatus({ order, items, refunds })).toBe('취소완료');
  });

  test('배송비>0이어도 결제완료가 아니면(예: 결제취소) 상한을 적용하지 않고 취소완료', () => {
    const order = makeOrder({ paymentStatus: '결제취소', deliveryFee: 3000 });
    const items = [
      makeItem({ id: 'i1', lineIndex: 0, quantity: 2, status: 'COMPLETED' }),
      makeItem({ id: 'i2', lineIndex: 1, quantity: 1, status: 'COMPLETED' }),
    ];
    expect(aggregateOrderCancelStatus({ order, items, refunds: [] })).toBe('취소완료');
  });

  test('실패한(SUCCEEDED가 아닌) 배송비 환불은 상한 해제 조건으로 인정하지 않는다', () => {
    const order = makeOrder({ paymentStatus: '결제완료', deliveryFee: 3000 });
    const items = [
      makeItem({ id: 'i1', lineIndex: 0, quantity: 2, status: 'COMPLETED' }),
      makeItem({ id: 'i2', lineIndex: 1, quantity: 1, status: 'COMPLETED' }),
    ];
    const refunds = [makeRefund({ status: 'FAILED', includeDeliveryFee: true })];
    expect(aggregateOrderCancelStatus({ order, items, refunds })).toBe('부분취소완료');
  });

  test('전량 REJECTED이고 현재 취소요청이면 주문접수로 복귀한다', () => {
    const order = makeOrder({ orderStatus: '취소요청' });
    const items = [
      makeItem({ id: 'i1', lineIndex: 0, quantity: 2, status: 'REJECTED' }),
      makeItem({ id: 'i2', lineIndex: 1, quantity: 1, status: 'REJECTED' }),
    ];
    expect(aggregateOrderCancelStatus({ order, items, refunds: [] })).toBe('주문접수');
  });

  test('전량 REJECTED이고 현재 부분취소이면 주문접수로 복귀한다', () => {
    const order = makeOrder({ orderStatus: '부분취소' });
    const items = [makeItem({ id: 'i1', lineIndex: 0, quantity: 2, status: 'REJECTED' })];
    expect(aggregateOrderCancelStatus({ order, items, refunds: [] })).toBe('주문접수');
  });

  test('전량 REJECTED이어도 현재 상태가 취소요청/부분취소가 아니면 내려가지 않는다(다운그레이드 금지)', () => {
    const completed = makeOrder({ orderStatus: '취소완료' });
    const items = [makeItem({ id: 'i1', lineIndex: 0, quantity: 2, status: 'REJECTED' })];
    expect(aggregateOrderCancelStatus({ order: completed, items, refunds: [] })).toBe('취소완료');

    const accepted = makeOrder({ orderStatus: '주문접수' });
    expect(aggregateOrderCancelStatus({ order: accepted, items, refunds: [] })).toBe('주문접수');
  });
});

test.describe('reservedQuantityByLine -- 아이템 상태 기반 예약(요청 레벨 아닌 아이템 레벨)', () => {
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

  test('요청 레벨 status(advisory)가 아니라 아이템 레벨 status를 본다', () => {
    // 요청 레벨 status는 REQUESTED(advisory)이지만 그 아이템은 REJECTED다 — 예약이 해제돼야 한다.
    const reserved = reservedQuantityByLine([
      makeRequest({ status: 'REQUESTED', items: [makeItem({ lineIndex: 0, status: 'REJECTED', quantity: 5 })] }),
    ]);
    expect(reserved.get(0)).toBeUndefined();
  });
});

test.describe('remainingLineQuantity -- CANCEL/REFUND 요청이 섞여도 같은 라인의 잔여수량을 정확히 뺀다', () => {
  test('CANCEL 액션요청과 REFUND 레코드가 같은 라인을 동시에 건드리면 둘 다 뺀다', () => {
    const order = makeOrder(); // line0 quantity=2
    const items: OrderActionRequestItemState[] = [
      makeItem({ id: 'i1', lineIndex: 0, quantity: 1, status: 'REQUESTED' }),
    ];
    const refunds: OrderRefundRecord[] = [
      makeRefund({
        status: 'SUCCEEDED',
        items: [{ lineIndex: 0, productId: 'p1', quantity: 1, productName: 'A', unitPrice: 1000, amount: 1000 }],
      }),
    ];
    expect(remainingLineQuantity(order, 0, items, refunds)).toBe(0);
  });

  test('REJECTED 액션요청 아이템은 잔여수량에서 빠지지 않는다(해제)', () => {
    const order = makeOrder();
    const items: OrderActionRequestItemState[] = [
      makeItem({ id: 'i1', lineIndex: 0, quantity: 2, status: 'REJECTED' }),
    ];
    expect(remainingLineQuantity(order, 0, items, [])).toBe(2);
  });

  test('FAILED 환불은 잔여수량에서 빠지지 않는다(SUCCEEDED만 인정)', () => {
    const order = makeOrder();
    const refunds: OrderRefundRecord[] = [
      makeRefund({
        status: 'FAILED',
        items: [{ lineIndex: 0, productId: 'p1', quantity: 2, productName: 'A', unitPrice: 1000, amount: 2000 }],
      }),
    ];
    expect(remainingLineQuantity(order, 0, [], refunds)).toBe(2);
  });

  test('다른 라인의 액션요청·환불은 이 라인 잔여수량에 영향을 주지 않는다', () => {
    const order = makeOrder();
    const items: OrderActionRequestItemState[] = [
      makeItem({ id: 'i1', lineIndex: 1, quantity: 1, status: 'APPROVED' }),
    ];
    expect(remainingLineQuantity(order, 0, items, [])).toBe(2);
  });

  test('존재하지 않는 라인 인덱스는 0을 반환한다', () => {
    const order = makeOrder();
    expect(remainingLineQuantity(order, 99, [], [])).toBe(0);
  });
});

test.describe('brandDeliveryFee -- 같은 brandId 행 전량 합산(defect i)', () => {
  test('같은 브랜드에 판매자가 여럿이라 배송비 행이 여러 개면 전량 합산한다', () => {
    const order = makeOrder({
      items: [
        { productId: 'p1', productName: 'A', quantity: 1, price: 1000, brandId: 'brand-a' },
        { productId: 'p2', productName: 'B', quantity: 1, price: 2000, brandId: 'brand-a' },
      ],
      deliveryFeeBreakdown: [
        {
          brandId: 'brand-a',
          sellerKey: 'seller:seller-1',
          subtotal: 1000,
          shippingFee: 3000,
          appliedDeliveryFee: 3000,
          isFreeShipping: false,
        },
        {
          brandId: 'brand-a',
          sellerKey: 'seller:seller-2',
          subtotal: 2000,
          shippingFee: 2500,
          appliedDeliveryFee: 2500,
          isFreeShipping: false,
        },
      ],
    });
    expect(brandDeliveryFee(order, 'brand-a')).toBe(5500);
  });

  test('브랜드 전량이 아니라 일부만 취소 대상이면 0을 반환한다', () => {
    const order = makeOrder({
      items: [
        { productId: 'p1', productName: 'A', quantity: 2, price: 1000, brandId: 'brand-a' },
      ],
      deliveryFeeBreakdown: [
        { brandId: 'brand-a', subtotal: 2000, shippingFee: 3000, appliedDeliveryFee: 3000, isFreeShipping: false },
      ],
    });
    expect(brandDeliveryFee(order, 'brand-a', [{ lineIndex: 0, quantity: 1 }])).toBe(0);
  });

  test('일치하는 브랜드 배송비 행이 없으면 0을 반환한다', () => {
    const order = makeOrder({ deliveryFeeBreakdown: [] });
    expect(brandDeliveryFee(order, 'brand-a')).toBe(0);
  });
});
