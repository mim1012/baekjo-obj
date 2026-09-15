import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as refundRules from '@/lib/orders/refund';
import type { Order } from '@/types';

// 0072의 create_order_refund_request()는 idempotency 키가 이미 존재하면 주문 일치·payload
// 일치를 검사하지 않고 그대로 기존 행을 반환했다(U3/0174가 SQL 계층에서 이를 PT409로 고정).
// 이 스펙은 라우트 계층(src/app/api/admin/orders/[id]/refunds/route.ts)이 그 앞뒤로 두는
// 재요청 방어 순서를 실제 핸들러를 transpile+stub해서 검증한다 — Toss·DB는 호출하지 않는다.
function handler(opts: {
  paymentStatus?: Order['paymentStatus'];
  existing?: Record<string, unknown> | null;
  createOrderRefundRequestImpl?: () => Promise<unknown>;
  queryTossPaymentImpl?: () => Promise<unknown>;
} = {}) {
  let providerCalls = 0;
  const order = {
    id: '10000000-0000-4000-8000-000000000001',
    paymentKey: 'test-key',
    paymentStatus: opts.paymentStatus ?? '환불완료',
    orderStatus: '주문접수',
    deliveryStatus: '배송전',
    totalPrice: 2000,
    deliveryFee: 0,
    items: [{ productId: 'p1', productName: 'One', quantity: 2, price: 1000 }],
  };
  const existingList =
    opts.existing === undefined
      ? [
          {
            id: 'refund-1',
            status: 'SUCCEEDED',
            idempotencyKey: 'same-key',
            requestedAmount: 2000,
            includeDeliveryFee: false,
            items: [{ lineIndex: 0, productId: 'p1', quantity: 2, amount: 2000 }],
          },
        ]
      : opts.existing === null
        ? []
        : [opts.existing];

  const defaultTossSnapshot = {
    paymentKey: 'test-key',
    orderId: order.id,
    totalAmount: 2000,
    balanceAmount: 2000,
    status: 'DONE',
    cancels: [] as unknown[],
  };

  const mocks: Record<string, unknown> = {
    '@/lib/admin/requireAdmin': { requireAdmin: async () => ({ ok: true, requester: { id: 'admin' } }) },
    '@/lib/orders/repo': {
      getOrderById: async () => order,
      listOrderRefunds: async () => existingList,
      createOrderRefundRequest:
        opts.createOrderRefundRequestImpl ??
        (async () => {
          throw new Error('unexpected create call');
        }),
      completeOrderRefund: async () => {
        throw new Error('unexpected complete call');
      },
      updateOrderRefundException: async () => {
        throw new Error('unexpected exception update call');
      },
    },
    '@/lib/orders/refund': refundRules,
    '@/lib/payments/toss': {
      queryTossPayment:
        opts.queryTossPaymentImpl ??
        (async () => {
          ++providerCalls;
          throw new Error('unexpected provider call');
        }),
      cancelTossPaymentPartial: async () => {
        throw new Error('unexpected cancel call');
      },
      isTossClientRejection: () => false,
      TossConfirmError: class extends Error {},
    },
    '@/lib/logServerError': { logServerError: () => {} },
  };

  const source = readFileSync('src/app/api/admin/orders/[id]/refunds/route.ts', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mockModule = {
    exports: {} as { POST: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response> },
  };
  const realRequire = createRequire(`${process.cwd()}/package.json`);
  new Function('require', 'module', 'exports', compiled)(
    (name: string) => mocks[name] ?? realRequire(name),
    mockModule,
    mockModule.exports,
  );
  return {
    call: (quantity: number, key = 'same-key') =>
      mockModule.exports.POST(
        new Request('http://localhost/refunds', {
          method: 'POST',
          body: JSON.stringify({ idempotencyKey: key, reason: 'Return', items: [{ lineIndex: 0, productId: 'p1', quantity }] }),
        }),
        { params: Promise.resolve({ id: order.id }) },
      ),
    providerCalls: () => providerCalls,
    orderId: order.id,
    defaultTossSnapshot,
  };
}

test('완전 환불된 주문에 동일 키·동일 수량으로 재요청하면 Toss 호출 없이 기존 성공을 그대로 반환한다', async () => {
  // order.paymentStatus === '환불완료' → assertRefundableOrder라면 422로 막히지만, 기존
  // idempotency 매치가 그보다 먼저 처리돼야 한다(방어 순서 = normalize → idempotency → assert).
  const route = handler();
  const response = await route.call(2);
  expect(response.status).toBe(200);
  expect((await response.json()).refund.id).toBe('refund-1');
  expect(route.providerCalls()).toBe(0);
});

test('실패로 종료된 기존 환불에 동일 키로 재요청하면 409 refund-request-failed와 기존 레코드를 반환한다', async () => {
  const route = handler({
    existing: {
      id: 'refund-failed-1',
      status: 'FAILED',
      idempotencyKey: 'same-key',
      requestedAmount: 2000,
      includeDeliveryFee: false,
      items: [{ lineIndex: 0, productId: 'p1', quantity: 2, amount: 2000 }],
    },
  });
  const response = await route.call(2);
  expect(response.status).toBe(409);
  const body = await response.json();
  expect(body.error).toBe('refund-request-failed');
  expect(body.refund.id).toBe('refund-failed-1');
  expect(route.providerCalls()).toBe(0);
});

test('같은 키라도 요청 수량(payload)이 다르면 완전 환불 이후에도 409로 거부된다', async () => {
  const route = handler();
  const response = await route.call(1);
  expect(response.status).toBe(409);
  expect((await response.json()).error).toBe('refund-idempotency-key-conflict');
  expect(route.providerCalls()).toBe(0);
});

test('다른 주문에서 이미 소비된 idempotency 키는 SQL 계층 PT409 충돌을 409로 매핑한다', async () => {
  // 이 주문의 listOrderRefunds에는 해당 키가 없다(existing: null) — 키는 다른 주문 소유이므로
  // 라우트는 정상 신규 생성 경로를 타고, RPC(create_order_refund_request/0174)가
  // REFUND_IDEMPOTENCY_KEY_CONFLICT(PT409)를 던지는 상황을 흉내낸다.
  const orderId = '10000000-0000-4000-8000-000000000001';
  const route = handler({
    paymentStatus: '결제완료',
    existing: null,
    queryTossPaymentImpl: async () => ({
      paymentKey: 'test-key',
      orderId,
      totalAmount: 2000,
      balanceAmount: 2000,
      status: 'DONE',
      cancels: [],
    }),
    createOrderRefundRequestImpl: async () => {
      throw new Error('REFUND_IDEMPOTENCY_KEY_CONFLICT');
    },
  });
  expect(route.orderId).toBe(orderId);
  const response = await route.call(2, 'cross-order-key');
  expect(response.status).toBe(409);
  expect((await response.json()).error).toBe('refund-idempotency-key-conflict');
});

test('환불완료 주문에 새 키로 재요청하면 idempotency 검사를 통과한 뒤 주문 상태 가드에서 422로 거부된다', async () => {
  const route = handler({ existing: null });
  const response = await route.call(2, 'new-key');
  expect(response.status).toBe(422);
  expect((await response.json()).error).toBe('refund-order-not-paid');
  expect(route.providerCalls()).toBe(0);
});
