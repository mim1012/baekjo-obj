import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as refundRules from '@/lib/orders/refund';
import type { Order } from '@/types';

// Execute the actual handler with external I/O replaced; do not call Toss or a database.
function handler(paymentStatus: Order['paymentStatus'] = '환불완료') {
  let providerCalls = 0;
  const order = {
    id: '10000000-0000-4000-8000-000000000001', paymentKey: 'test-key', paymentStatus,
    orderStatus: '주문접수', deliveryStatus: '배송전', totalPrice: 2000, deliveryFee: 0,
    items: [{ productId: 'p1', productName: 'One', quantity: 2, price: 1000 }],
  };
  const existing = {
    id: 'refund-1', status: 'SUCCEEDED', idempotencyKey: 'same-key', requestedAmount: 2000,
    includeDeliveryFee: false, items: [{ lineIndex: 0, productId: 'p1', quantity: 2, amount: 2000 }],
  };
  const mocks: Record<string, unknown> = {
    '@/lib/admin/requireAdmin': { requireAdmin: async () => ({ ok: true, requester: { id: 'admin' } }) },
    '@/lib/orders/repo': { getOrderById: async () => order, listOrderRefunds: async () => [existing] },
    '@/lib/orders/refund': refundRules,
    '@/lib/payments/toss': { queryTossPayment: async () => { ++providerCalls; throw new Error('unexpected provider call'); }, TossConfirmError: class extends Error {} },
    '@/lib/logServerError': { logServerError: () => {} },
  };
  const source = readFileSync('src/app/api/admin/orders/[id]/refunds/route.ts', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mockModule = { exports: {} as { POST: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response> } };
  const realRequire = createRequire(`${process.cwd()}/package.json`);
  new Function('require', 'module', 'exports', compiled)((name: string) => mocks[name] ?? realRequire(name), mockModule, mockModule.exports);
  return {
    call: (quantity: number, key = 'same-key') => mockModule.exports.POST(new Request('http://localhost/refunds', {
      method: 'POST', body: JSON.stringify({ idempotencyKey: key, reason: 'Return', items: [{ lineIndex: 0, productId: 'p1', quantity }] }),
    }), { params: Promise.resolve({ id: order.id }) }),
    providerCalls: () => providerCalls,
  };
}

test('full refund replay returns the existing success without contacting the provider', async () => {
  const route = handler();
  const response = await route.call(2);
  expect(response.status).toBe(200);
  expect((await response.json()).refund.id).toBe('refund-1');
  expect(route.providerCalls()).toBe(0);
});
test('same key with different quantity is rejected even after full refund', async () => {
  const route = handler();
  const response = await route.call(1);
  expect(response.status).toBe(409);
  expect((await response.json()).error).toBe('refund-idempotency-key-conflict');
  expect(route.providerCalls()).toBe(0);
});
test('a new refund against an already refunded order is rejected', async () => {
  const route = handler();
  const response = await route.call(2, 'new-key');
  expect(response.status).toBe(422);
  expect((await response.json()).error).toBe('refund-order-not-paid');
  expect(route.providerCalls()).toBe(0);
});
