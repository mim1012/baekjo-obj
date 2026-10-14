import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import * as paymentTransition from '@/lib/orders/paymentTransition';
import * as cancellation from '@/lib/orders/cancellation';
import * as customerServiceState from '@/lib/orders/customerServiceState';
import * as carriers from '@/lib/carriers';
import * as shipmentDerive from '@/lib/shipments/derive';
import * as alimtalkMessages from '@/lib/notifications/alimtalkMessages';
import * as types from '@/types';

// 주문 이벤트 → 알림톡 배선 계약. 실제 라우트/모듈을 transpile-and-stub으로 로드해(DB·네트워크 없음)
// "상태가 실제로 바뀐 호출에서만, 정확히 한 번" 알림을 예약하는지 고정한다.
// 로드 방식은 tests/admin/action-request-routes.spec.ts와 같다('server-only' 서버 모듈 대응).

const root = path.resolve(__dirname, '..', '..');

function loadWithStubs(relativePath: string, dependencies: Record<string, unknown>): Record<string, unknown> {
  const file = path.join(root, relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loaded = { exports: {} as Record<string, unknown> };
  new Function('require', 'module', 'exports', outputText)(
    (name: string) => {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`Unstubbed dependency: ${name}`);
      return dependencies[name];
    },
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

const nextServerStub = { NextResponse: { json: (body: unknown, init?: { status?: number }) => Response.json(body, init) } };
const ORDER_ID = '11111111-1111-1111-1111-111111111111';
const REQUEST_ID = '22222222-2222-2222-2222-222222222222';
const params = { params: Promise.resolve({ id: ORDER_ID }) };

function notifier() {
  const triggers: Array<Record<string, unknown>> = [];
  return { triggers, stub: { notifyAlimtalkAfter: (trigger: Record<string, unknown>) => void triggers.push(trigger) } };
}

function jsonRequest(method: string, body?: unknown): Request {
  return new Request('http://localhost/x', { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
}

// ---------------------------------------------------------------------------
// 카드 결제 확정: applyPaymentAction → setOrderPaid 반환(영향 행 수)
// ---------------------------------------------------------------------------
test.describe('카드 결제완료 알림 — execute.ts', () => {
  function load(affected: number) {
    const notify = notifier();
    const executeModule = loadWithStubs('src/lib/payments/execute.ts', {
      '@/lib/orders/repo': {
        setOrderPaid: async () => affected,
        cancelConfirmingAndRestore: async () => true,
      },
      '@/lib/notifications/alimtalkNotify': notify.stub,
    }) as {
      applyPaymentAction: (action: unknown, orderId: string, paymentKey?: string) => Promise<{ applied: string; affected?: number }>;
    };
    return { notify, applyPaymentAction: executeModule.applyPaymentAction };
  }

  test('setOrderPaid가 1행을 바꾼 호출에서만 orderPaid 알림을 예약한다', async () => {
    const { notify, applyPaymentAction } = load(1);
    const result = await applyPaymentAction({ kind: 'confirm' }, ORDER_ID, 'pk_1');
    expect(result).toEqual({ applied: 'confirm', affected: 1 });
    expect(notify.triggers).toEqual([{ event: 'orderPaid', orderId: ORDER_ID }]);
  });

  test('0행(이미 확정·경합 패배)이면 알림을 보내지 않는다 — 웹훅·reconcile·confirm 중복 도착 방어', async () => {
    const { notify, applyPaymentAction } = load(0);
    await applyPaymentAction({ kind: 'confirm' }, ORDER_ID, 'pk_1');
    expect(notify.triggers).toEqual([]);
  });

  test('재고 복원·무시 액션은 알림과 무관하다', async () => {
    const { notify, applyPaymentAction } = load(1);
    await applyPaymentAction({ kind: 'restoreConfirming', paymentKey: 'pk_1' }, ORDER_ID);
    await applyPaymentAction({ kind: 'settled' }, ORDER_ID);
    expect(notify.triggers).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 관리자 PATCH /api/admin/orders/[id] — 무통장 입금확인·전체 취소·전액 환불
// ---------------------------------------------------------------------------
test.describe('관리자 주문 PATCH 알림', () => {
  function loadRoute(initialPaymentStatus: string, options: { cancelRpc?: boolean; refundRpc?: boolean; casRows?: number } = {}) {
    const notify = notifier();
    const state = { paymentStatus: initialPaymentStatus };
    const repo = {
      updateOrderStatus: async () => {},
      updatePaymentStatusGuarded: async (_id: string, from: string, to: string) => {
        if (options.casRows !== undefined) return options.casRows;
        if (state.paymentStatus !== from) return 0;
        state.paymentStatus = to;
        return 1;
      },
      cancelReservationAndRestore: async () => options.cancelRpc ?? false,
      getOrderById: async () => ({ paymentStatus: state.paymentStatus }),
      getOrderPaymentInfo: async () => ({ paymentStatus: state.paymentStatus, paymentKey: null, deliveryStatus: '배송전' }),
      refundOrderAndRestore: async () => options.refundRpc ?? false,
    };
    const applyOrderUpdates = loadWithStubs('src/lib/orders/applyOrderUpdates.ts', {
      './paymentTransition': paymentTransition,
      '@/lib/payments/toss': {
        TossConfirmError: class extends Error {},
        isTossClientRejection: () => false,
        isFullyCanceledToss: () => false,
      },
    });
    const route = loadWithStubs('src/app/api/admin/orders/[id]/route.ts', {
      'next/server': nextServerStub,
      '@/lib/auth': { auth: async () => ({ user: { role: 'admin', memberId: 'admin-1' } }) },
      '@/lib/members/repo': { findMemberById: async () => ({ role: 'admin', status: 'active' }) },
      '@/lib/orders/repo': repo,
      '@/lib/orders/applyOrderUpdates': applyOrderUpdates,
      '@/lib/payments/toss': {
        cancelTossPayment: async () => {},
        queryTossPayment: async () => ({ status: 'DONE', balanceAmount: 0 }),
        TossConfirmError: class extends Error {},
        isTossClientRejection: () => false,
      },
      '@/lib/logServerError': { logServerError: () => {}, logServerWarn: () => {} },
      '@/lib/notifications/alimtalkNotify': notify.stub,
      '@/lib/carriers': carriers,
      '@/types': types,
    }) as { PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response> };
    return { notify, state, patch: (body: unknown) => route.PATCH(jsonRequest('PATCH', body), params) };
  }

  test('입금확인(입금대기→결제완료)은 정확히 한 번 알리고, 같은 요청을 반복해도 다시 알리지 않는다', async () => {
    const { notify, patch, state } = loadRoute('입금대기');
    expect((await patch({ paymentStatus: '결제완료' })).status).toBe(200);
    expect(state.paymentStatus).toBe('결제완료');
    expect(notify.triggers).toEqual([{ event: 'orderPaid', orderId: ORDER_ID }]);

    expect((await patch({ paymentStatus: '결제완료' })).status).toBe(200);
    expect((await patch({ paymentStatus: '결제완료', deliveryMemo: '메모' })).status).toBe(200);
    expect(notify.triggers).toHaveLength(1);
  });

  test('읽은 뒤 쓰기 전에 다른 요청이 상태를 바꿔 CAS가 0행이면 409이고 알림도 없다', async () => {
    const { notify, patch } = loadRoute('입금대기', { casRows: 0 });
    expect((await patch({ paymentStatus: '결제완료' })).status).toBe(409);
    expect(notify.triggers).toEqual([]);
  });

  test('미결제 전체 취소는 RPC가 수행돼도 알림톡이 없다(고객이 결제한 적 없어 환불 문구가 맞지 않음)', async () => {
    const done = loadRoute('입금대기', { cancelRpc: true });
    expect((await done.patch({ orderStatus: '취소완료', paymentStatus: '결제취소' })).status).toBe(200);
    expect(done.notify.triggers).toEqual([]);

    const repeat = loadRoute('결제취소', { cancelRpc: false });
    await repeat.patch({ orderStatus: '취소완료', paymentStatus: '결제취소' });
    expect(repeat.notify.triggers).toEqual([]);
  });

  test('이 라우트는 paymentStatus=환불완료를 받지 않는다(400) — 환불 알림은 refunds 라우트 몫이라 여기선 알림 없음', async () => {
    const refunded = loadRoute('결제완료', { refundRpc: true });
    expect((await refunded.patch({ paymentStatus: '환불완료' })).status).toBe(400);
    expect(refunded.notify.triggers).toEqual([]);
  });

  test('라우트가 거절(잘못된 전이 409)한 요청에는 알림이 없다', async () => {
    const { notify, patch } = loadRoute('결제취소');
    expect((await patch({ paymentStatus: '결제완료' })).status).toBe(409);
    expect(notify.triggers).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 관리자 교환·반품 처리완료 — PATCH /api/admin/order-requests/[id]
// ---------------------------------------------------------------------------
test.describe('교환·반품 처리완료 알림', () => {
  function loadRoute(currentStatus: string, type: 'exchange' | 'return') {
    const notify = notifier();
    const base = { id: REQUEST_ID, orderId: ORDER_ID, sellerKey: 's1', type };
    const route = loadWithStubs('src/app/api/admin/order-requests/[id]/route.ts', {
      'next/server': nextServerStub,
      '@/lib/admin/requireAdmin': { requireAdmin: async () => ({ ok: true, requester: { id: 'admin-1' } }) },
      '@/lib/orders/customerServiceRepo': {
        getCustomerServiceRequestById: async () => ({ ...base, status: currentStatus }),
        updateCustomerServiceRequest: async (_id: string, patch: { status: string }) => ({ ...base, status: patch.status }),
      },
      '@/lib/orders/customerServiceState': customerServiceState,
      '@/lib/logServerError': { logServerError: () => {} },
      '@/lib/notifications/alimtalkNotify': notify.stub,
    }) as { PATCH: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response> };
    return { notify, patch: (status: string) => route.PATCH(jsonRequest('PATCH', { status }), { params: Promise.resolve({ id: REQUEST_ID }) }) };
  }

  test('approved → completed 전이는 교환/반품 종류에 맞는 처리완료 알림을 보낸다', async () => {
    const exchange = loadRoute('approved', 'exchange');
    expect((await exchange.patch('completed')).status).toBe(200);
    expect(exchange.notify.triggers).toEqual([{ event: 'exchangeCompleted', orderId: ORDER_ID, sellerKey: 's1' }]);

    const ret = loadRoute('approved', 'return');
    await ret.patch('completed');
    expect(ret.notify.triggers).toEqual([{ event: 'returnCompleted', orderId: ORDER_ID, sellerKey: 's1' }]);
  });

  test('이미 completed인 요청에 completed를 다시 보내면(같은 상태 허용) 알림을 보내지 않는다', async () => {
    const same = loadRoute('completed', 'exchange');
    expect((await same.patch('completed')).status).toBe(200);
    expect(same.notify.triggers).toEqual([]);
  });

  test('반려(rejected) 건을 completed로 종결하면 처리완료 알림을 보내지 않는다', async () => {
    const rejected = loadRoute('rejected', 'exchange');
    expect((await rejected.patch('completed')).status).toBe(200);
    expect(rejected.notify.triggers).toEqual([]);
  });

  test('completed가 아닌 전이(reviewing 등)는 알림이 없다', async () => {
    const other = loadRoute('received', 'return');
    expect((await other.patch('reviewing')).status).toBe(200);
    expect(other.notify.triggers).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 고객 취소요청 — POST /api/orders/[id]/cancel-request
// ---------------------------------------------------------------------------
test.describe('고객 주문취소 접수 알림', () => {
  function loadRoute(order: Record<string, unknown>, requested: boolean) {
    const notify = notifier();
    const route = loadWithStubs('src/app/api/orders/[id]/cancel-request/route.ts', {
      'next/server': nextServerStub,
      '@/lib/members/requireActiveMember': { requireActiveMember: async () => ({ ok: true, memberId: 'm1' }) },
      '@/lib/orders/repo': { getOrderById: async () => order, requestOrderCancellation: async () => requested },
      '@/lib/logServerError': { logServerError: () => {} },
      '@/lib/orders/cancellation': cancellation,
      '@/lib/notifications/alimtalkNotify': notify.stub,
    }) as { POST: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response> };
    return { notify, post: () => route.POST(jsonRequest('POST'), params) };
  }
  const order = { id: ORDER_ID, memberId: 'm1', orderStatus: '주문접수', paymentStatus: '결제완료', deliveryStatus: '배송전' };

  test('CAS가 1행 반영된 요청에서만 알림', async () => {
    const ok = loadRoute(order, true);
    expect((await ok.post()).status).toBe(200);
    expect(ok.notify.triggers).toEqual([{ event: 'cancelRequested', orderId: ORDER_ID }]);
  });

  test('이미 취소요청 상태의 재요청·CAS 패배는 알리지 않는다', async () => {
    const repeat = loadRoute({ ...order, orderStatus: '취소요청' }, true);
    expect((await repeat.post()).status).toBe(200);
    expect(repeat.notify.triggers).toEqual([]);

    const lost = loadRoute(order, false);
    expect((await lost.post()).status).toBe(409);
    expect(lost.notify.triggers).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 관리자 송장 PATCH — 배송출발/배송완료
// ---------------------------------------------------------------------------
test.describe('관리자 송장 PATCH 알림', () => {
  const BRAND = 'brand-a';
  function loadRoute(current: Record<string, unknown> | undefined, writeOutcome: 'written' | 'confirmed-locked' = 'written') {
    const notify = notifier();
    const route = loadWithStubs('src/app/api/admin/orders/[id]/shipments/[brandId]/route.ts', {
      'next/server': nextServerStub,
      '@/lib/admin/requireAdmin': { requireAdmin: async () => ({ ok: true, requester: { id: 'admin-1' } }) },
      '@/lib/orders/repo': {
        getOrderById: async () => ({ id: ORDER_ID, deliveryStatus: '배송전', items: [{ productId: 'p1', brandId: BRAND }] }),
        updateOrderStatus: async () => {},
      },
      '@/lib/shipments/repo': {
        listShipmentsByOrder: async () => (current ? [current] : []),
        updateShipmentUnlessConfirmed: async () => writeOutcome,
      },
      '@/lib/shipments/derive': shipmentDerive,
      '@/lib/logServerError': { logServerError: () => {} },
      '@/lib/notifications/alimtalkNotify': notify.stub,
    }) as {
      PATCH: (request: Request, context: { params: Promise<{ id: string; brandId: string }> }) => Promise<Response>;
    };
    return {
      notify,
      patch: (body: unknown) =>
        route.PATCH(jsonRequest('PATCH', body), { params: Promise.resolve({ id: ORDER_ID, brandId: BRAND }) }),
    };
  }

  test('배송전 → 배송중 + 운송장: 배송출발 알림(택배사·운송장 포함)', async () => {
    const { notify, patch } = loadRoute({ brandId: BRAND, deliveryStatus: '배송전' });
    expect((await patch({ deliveryStatus: '배송중', carrier: 'cj', trackingNumber: '123' })).status).toBe(200);
    expect(notify.triggers).toEqual([
      { event: 'shippingStarted', orderId: ORDER_ID, brandId: BRAND, carrier: 'cj', trackingNumber: '123' },
    ]);
  });

  test('같은 배송중 요청을 반복하면 두 번째는 알리지 않는다', async () => {
    const { notify, patch } = loadRoute({ brandId: BRAND, deliveryStatus: '배송중', carrier: 'cj', trackingNumber: '123' });
    await patch({ deliveryStatus: '배송중', carrier: 'cj', trackingNumber: '123' });
    expect(notify.triggers).toEqual([]);
  });

  test('이미 배송중이지만 송장이 없던 행에 처음 송장을 넣으면 배송출발 알림, 이후 송장 수정은 알리지 않는다', async () => {
    const first = loadRoute({ brandId: BRAND, deliveryStatus: '배송중' });
    await first.patch({ deliveryStatus: '배송중', carrier: 'cj', trackingNumber: '123' });
    expect(first.notify.triggers).toEqual([
      { event: 'shippingStarted', orderId: ORDER_ID, brandId: BRAND, carrier: 'cj', trackingNumber: '123' },
    ]);
    const edit = loadRoute({ brandId: BRAND, deliveryStatus: '배송중', carrier: 'cj', trackingNumber: '123' });
    await edit.patch({ carrier: 'cj', trackingNumber: '456' });
    await edit.patch({ deliveryStatus: '배송중', carrier: 'cj', trackingNumber: '456' });
    expect(edit.notify.triggers).toEqual([]);
  });

  test('배송중 → 배송완료는 배송완료 알림', async () => {
    const { notify, patch } = loadRoute({ brandId: BRAND, deliveryStatus: '배송중' });
    await patch({ deliveryStatus: '배송완료' });
    expect(notify.triggers).toEqual([{ event: 'delivered', orderId: ORDER_ID, brandId: BRAND }]);
  });

  test('구매확정으로 잠긴 행(409)에는 알리지 않는다', async () => {
    const { notify, patch } = loadRoute({ brandId: BRAND, deliveryStatus: '배송완료' }, 'confirmed-locked');
    expect((await patch({ deliveryStatus: '배송중', carrier: 'cj', trackingNumber: '1' })).status).toBe(409);
    expect(notify.triggers).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 고객 구매확정 — POST /api/orders/[id]/shipments/[brandId]/confirm
// ---------------------------------------------------------------------------
test.describe('고객 구매확정 알림', () => {
  const BRAND = 'brand-a';
  function loadRoute(shipmentStatus: string, confirmedNow: boolean) {
    const notify = notifier();
    const route = loadWithStubs('src/app/api/orders/[id]/shipments/[brandId]/confirm/route.ts', {
      'next/server': nextServerStub,
      '@/lib/auth': { auth: async () => ({ user: { memberId: 'm1', role: 'user' } }) },
      '@/lib/members/repo': { findMemberById: async () => ({ role: 'user', status: 'active' }) },
      '@/lib/orders/repo': {
        getOrderById: async () => ({ id: ORDER_ID, memberId: 'm1', paymentStatus: '결제완료', items: [{ brandId: BRAND }] }),
      },
      '@/lib/shipments/repo': {
        listShipmentsByOrder: async () => [{ brandId: BRAND, deliveryStatus: shipmentStatus }],
        confirmShipmentIfDelivered: async () => confirmedNow,
      },
      '@/lib/shipments/derive': shipmentDerive,
      '@/lib/logServerError': { logServerError: () => {} },
      '@/lib/notifications/alimtalkNotify': notify.stub,
    }) as {
      POST: (request: Request, context: { params: Promise<{ id: string; brandId: string }> }) => Promise<Response>;
    };
    return { notify, post: () => route.POST(jsonRequest('POST'), { params: Promise.resolve({ id: ORDER_ID, brandId: BRAND }) }) };
  }

  test('배송완료 → 구매확정이 1행 반영되면 알림 1회(확정 시각 포함)', async () => {
    const { notify, post } = loadRoute('배송완료', true);
    expect((await post()).status).toBe(200);
    expect(notify.triggers).toHaveLength(1);
    expect(notify.triggers[0]).toMatchObject({ event: 'purchaseConfirmed', orderId: ORDER_ID, brandId: BRAND });
    expect(typeof notify.triggers[0].confirmedAt).toBe('string');
  });

  test('이미 구매확정된 송장의 재확정(멱등 200)은 알리지 않는다', async () => {
    const { notify, post } = loadRoute('구매확정', false);
    expect((await post()).status).toBe(200);
    expect(notify.triggers).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// alimtalkNotify — after() 예약, 비활성 스위치, 실패 격리
// ---------------------------------------------------------------------------
test.describe('notifyAlimtalkAfter / dispatchAlimtalk', () => {
  const baseOrder = {
    id: ORDER_ID,
    customerName: '홍길동',
    phone: '010-1234-5678',
    items: [{ productId: 'p1', productName: '방석', quantity: 1, price: 1000, brandId: 'b1' }],
    totalPrice: 1000,
    deliveryFee: 3000,
  };

  function load(options: { enabled: boolean; afterThrows?: boolean; getOrder?: () => Promise<unknown> }) {
    const sent: Array<{ event: string; phone: unknown }> = [];
    const scheduled: Array<() => Promise<void>> = [];
    const errors: string[] = [];
    const notifyModule = loadWithStubs('src/lib/notifications/alimtalkNotify.ts', {
      'server-only': {},
      'next/server': {
        after: (task: () => Promise<void>) => {
          if (options.afterThrows) throw new Error('`after` was called outside a request scope');
          scheduled.push(task);
        },
      },
      '@/lib/orders/repo': { getOrderById: options.getOrder ?? (async () => baseOrder) },
      '@/lib/logServerError': { logServerError: (context: string) => void errors.push(context) },
      '@/lib/notifications/alimtalk': {
        isAlimtalkEnabled: () => options.enabled,
        sendAlimtalk: async (event: string, _data: unknown, phone: unknown) => {
          sent.push({ event, phone });
          return { status: 'sent' };
        },
      },
      '@/lib/notifications/alimtalkMessages': alimtalkMessages,
    }) as {
      notifyAlimtalkAfter: (trigger: Record<string, unknown>) => void;
      dispatchAlimtalk: (trigger: Record<string, unknown>) => Promise<void>;
    };
    return { module: notifyModule, sent, scheduled, errors };
  }

  test('비활성이면 after()도 예약하지 않고 주문도 읽지 않는다', () => {
    const { module, scheduled, sent } = load({ enabled: false });
    module.notifyAlimtalkAfter({ event: 'orderPaid', orderId: ORDER_ID });
    expect(scheduled).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  test('활성이면 응답 이후 실행되도록 after()에 예약하고, 실행 시 주문 연락처로 발송한다', async () => {
    const { module, scheduled, sent } = load({ enabled: true });
    module.notifyAlimtalkAfter({ event: 'delivered', orderId: ORDER_ID, brandId: 'b1' });
    expect(scheduled).toHaveLength(1);
    expect(sent).toHaveLength(0); // 아직 실행 전 — 응답을 지연시키지 않는다
    await scheduled[0]();
    expect(sent).toEqual([{ event: 'delivered', phone: '010-1234-5678' }]);
  });

  test('요청 스코프 밖이라 after()가 던져도 호출부로 전파하지 않고 분리 실행한다', async () => {
    const { module, sent } = load({ enabled: true, afterThrows: true });
    expect(() => module.notifyAlimtalkAfter({ event: 'delivered', orderId: ORDER_ID })).not.toThrow();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sent).toHaveLength(1);
  });

  test('주문 조회가 실패해도 dispatch는 던지지 않고 로그만 남긴다', async () => {
    const { module, sent, errors } = load({
      enabled: true,
      getOrder: async () => {
        throw new Error('db down');
      },
    });
    await expect(module.dispatchAlimtalk({ event: 'orderPaid', orderId: ORDER_ID })).resolves.toBeUndefined();
    expect(sent).toHaveLength(0);
    expect(errors.join('\n')).toContain('dispatch failed event=orderPaid order=' + ORDER_ID);
  });
});
