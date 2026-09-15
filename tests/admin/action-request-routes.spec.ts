import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// 관리자/회원 상품별 취소·환불 요청 라우트 계약 — activation-lifecycle.test.mjs /
// cms-foundation-contract.spec.ts와 동일한 transpile-and-stub 패턴(repo.ts가 'server-only'를
// import하는 실제 서버 모듈이라 이 spec 프로세스에서 그냥 require하면 항상 throw한다).
// 실제 Supabase/DB 없이 라우트 핸들러 로직(권한·입력검증·IDOR·에러코드→409 매핑)만 고정한다.
// staging DB 계약(0169/0170/0171 RPC 자체)은 tests/payments/action-request.db.spec.ts(코디네이터가
// 별도 실행)와 tests/admin/order-cancel-sql-contract.spec.ts가 커버한다.

const root = path.resolve(__dirname, '..', '..');

function loadServerModuleWithStubs(relativePath: string, dependencies: Record<string, unknown>): Record<string, unknown> {
  const file = path.join(root, relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loaded = { exports: {} as Record<string, unknown> };
  const factory = new Function('require', 'module', 'exports', outputText) as (
    require: (name: string) => unknown,
    module: typeof loaded,
    exports: Record<string, unknown>,
  ) => void;
  factory((name: string) => {
    if (!Object.hasOwn(dependencies, name)) throw new Error(`Unstubbed dependency: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  return loaded.exports;
}

// actionRequests.ts/cancellation.ts는 타입 전용 import뿐이라(런타임 require 없음) 그대로 로드해서
// 쓴다 — route.ts가 `instanceof OrderActionRequestError`로 분기하므로, 테스트가 던지는 에러도
// 반드시 이 '같은' 클래스 인스턴스여야 분기가 맞는다(별도로 재정의한 클래스는 instanceof가 깨진다).
const actionRequests = loadServerModuleWithStubs('src/lib/orders/actionRequests.ts', {}) as {
  OrderActionRequestError: new (code: string) => Error & { code: string };
};
const cancellation = loadServerModuleWithStubs('src/lib/orders/cancellation.ts', {});

const nextServerStub = { NextResponse: { json: (body: unknown, init?: { status?: number }) => Response.json(body, init) } };

const UUID_ORDER = '11111111-1111-1111-1111-111111111111';
const UUID_REQUEST = '22222222-2222-2222-2222-222222222222';
const UUID_FOREIGN_REQUEST = '33333333-3333-3333-3333-333333333333';

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(url, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

// ---------------------------------------------------------------------------
// 관리자 라우트: src/app/api/admin/orders/[id]/action-requests/route.ts
// ---------------------------------------------------------------------------

interface AdminRouteState {
  admin: { ok: true; requester: { id: string } } | { ok: false; response: Response };
  order: Record<string, unknown> | null;
  requests: { id: string }[];
  transitionThrows: Error | null;
  completeThrows: Error | null;
}

function loadAdminRoute(state: AdminRouteState) {
  const dependencies = {
    'next/server': nextServerStub,
    '@/lib/admin/requireAdmin': { requireAdmin: async () => state.admin },
    '@/lib/orders/actionRequests': actionRequests,
    '@/lib/logServerError': { logServerError: () => {} },
    '@/lib/orders/repo': {
      getOrderById: async () => state.order,
      listOrderActionRequests: async () => state.requests,
      transitionOrderActionRequest: async () => {
        if (state.transitionThrows) throw state.transitionThrows;
        return { id: UUID_REQUEST, status: 'APPROVED' };
      },
      completeOrderActionRequest: async () => {
        if (state.completeThrows) throw state.completeThrows;
        return { id: UUID_REQUEST, status: 'COMPLETED' };
      },
    },
  };
  return loadServerModuleWithStubs('src/app/api/admin/orders/[id]/action-requests/route.ts', dependencies) as {
    POST: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
    GET: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
  };
}

function baseAdminState(): AdminRouteState {
  return {
    admin: { ok: true, requester: { id: 'admin-1' } },
    order: { id: UUID_ORDER },
    requests: [{ id: UUID_REQUEST }],
    transitionThrows: null,
    completeThrows: null,
  };
}

function callAdminPost(state: AdminRouteState, body: unknown) {
  const route = loadAdminRoute(state);
  return route.POST(jsonRequest(`http://localhost/api/admin/orders/${UUID_ORDER}/action-requests`, 'POST', body), {
    params: Promise.resolve({ id: UUID_ORDER }),
  });
}

test.describe('관리자 action-requests POST 계약', () => {
  test('admin이 아니면 requireAdmin의 401/403 응답을 그대로 반환한다(관리자 확인 우회 불가)', async () => {
    const state = baseAdminState();
    state.admin = { ok: false, response: Response.json({ error: 'unauthorized' }, { status: 401 }) };
    const response = await callAdminPost(state, { requestId: UUID_REQUEST, action: 'approve' });
    expect(response.status).toBe(401);
    expect((await response.json()).error).toBe('unauthorized');
  });

  test('requestId가 UUID가 아니거나 action이 화이트리스트 밖이면 400 invalid-action-request', async () => {
    const state = baseAdminState();
    const badRequestId = await callAdminPost(state, { requestId: 'not-a-uuid', action: 'approve' });
    expect(badRequestId.status).toBe(400);
    expect((await badRequestId.json()).error).toBe('invalid-action-request');

    const badAction = await callAdminPost(state, { requestId: UUID_REQUEST, action: 'delete' });
    expect(badAction.status).toBe(400);
    expect((await badAction.json()).error).toBe('invalid-action-request');
  });

  test('주문은 있지만 requestId가 그 주문 소속이 아니면 404 not-found(IDOR 방지)', async () => {
    const state = baseAdminState();
    state.requests = [{ id: UUID_FOREIGN_REQUEST }]; // 요청 목록에 UUID_REQUEST가 없음
    const response = await callAdminPost(state, { requestId: UUID_REQUEST, action: 'approve' });
    expect(response.status).toBe(404);
    expect((await response.json()).error).toBe('not-found');
  });

  test('주문 자체가 없으면 404 not-found', async () => {
    const state = baseAdminState();
    state.order = null;
    const response = await callAdminPost(state, { requestId: UUID_REQUEST, action: 'complete' });
    expect(response.status).toBe(404);
  });

  const errorCases: { code: string; message: string }[] = [
    { code: 'ACTION_UNPAID_PARTIAL_NOT_SUPPORTED', message: '결제 전 주문은 부분 취소 완료를 지원하지 않습니다 — 전량 취소만 가능합니다' },
    { code: 'ACTION_REFUND_NOT_SETTLED', message: '환불이 완료된 뒤에만 취소 완료 처리할 수 있습니다' },
    { code: 'ACTION_MANUAL_REFUND_REQUIRED', message: '무통장 결제 주문은 환불 처리 후 완료할 수 있습니다' },
  ];
  for (const { code, message } of errorCases) {
    test(`completeOrderActionRequest가 OrderActionRequestError(${code})를 던지면 409 {error, message} 로 매핑된다`, async () => {
      const state = baseAdminState();
      state.completeThrows = new actionRequests.OrderActionRequestError(code);
      const response = await callAdminPost(state, { requestId: UUID_REQUEST, action: 'complete' });
      expect(response.status).toBe(409);
      const payload = await response.json();
      expect(payload).toEqual({ error: code, message });
    });
  }

  test('ACTION_INVALID_TRANSITION(OrderActionRequestError가 아닌 일반 Error)도 409 + 한국어 문구로 매핑된다', async () => {
    const state = baseAdminState();
    state.transitionThrows = new Error('ACTION_INVALID_TRANSITION');
    const response = await callAdminPost(state, { requestId: UUID_REQUEST, action: 'reject' });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'ACTION_INVALID_TRANSITION', message: '현재 상태에서는 수행할 수 없는 작업입니다' });
  });

  test('ACTION_REQUEST_NOT_FOUND는 404, 그 외 미지의 ACTION_ 코드는 기본 문구로 409 폴백한다(500이 아님)', async () => {
    const notFoundState = baseAdminState();
    notFoundState.completeThrows = new Error('ACTION_REQUEST_NOT_FOUND');
    const notFoundResponse = await callAdminPost(notFoundState, { requestId: UUID_REQUEST, action: 'complete' });
    expect(notFoundResponse.status).toBe(404);

    const unknownState = baseAdminState();
    unknownState.completeThrows = new Error('ACTION_CONFLICT');
    const unknownResponse = await callAdminPost(unknownState, { requestId: UUID_REQUEST, action: 'complete' });
    expect(unknownResponse.status).toBe(409);
    expect((await unknownResponse.json()).error).toBe('ACTION_CONFLICT');
  });

  test('approve/reject/complete 성공 시 {ok:true, requests}를 반환한다', async () => {
    const state = baseAdminState();
    const response = await callAdminPost(state, { requestId: UUID_REQUEST, action: 'approve' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, requests: state.requests });
  });
});

// ---------------------------------------------------------------------------
// 회원 라우트: src/app/api/orders/[id]/action-requests/route.ts — GET만(POST는 U1/기존 계약 유지).
// ---------------------------------------------------------------------------

interface MemberRouteState {
  member: { ok: true; memberId: string } | { ok: false; response: Response };
  order: (Record<string, unknown> & { memberId: string | null }) | null;
  requests: { id: string }[];
}

function loadMemberRoute(state: MemberRouteState) {
  const dependencies = {
    'next/server': nextServerStub,
    '@/lib/members/requireActiveMember': { requireActiveMember: async () => state.member },
    '@/lib/shipments/repo': { listShipmentsByOrder: async () => [] },
    '@/lib/orders/actionRequests': actionRequests,
    '@/lib/orders/cancellation': cancellation,
    '@/lib/logServerError': { logServerError: () => {} },
    '@/lib/orders/repo': {
      getOrderById: async () => state.order,
      listOrderActionRequests: async () => state.requests,
      createOrderActionRequest: async () => {
        throw new Error('createOrderActionRequest is not exercised by this GET-focused spec');
      },
    },
  };
  return loadServerModuleWithStubs('src/app/api/orders/[id]/action-requests/route.ts', dependencies) as {
    GET: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>;
  };
}

test.describe('회원 action-requests GET — 종결 주문도 이력을 반환한다', () => {
  test('취소완료 주문도 더 이상 409로 막히지 않고 요청 이력을 반환한다(구 계약 회귀 확인)', async () => {
    const state: MemberRouteState = {
      member: { ok: true, memberId: 'member-1' },
      order: { id: UUID_ORDER, memberId: 'member-1', orderStatus: '취소완료', paymentStatus: '결제취소' },
      requests: [{ id: UUID_REQUEST }],
    };
    const route = loadMemberRoute(state);
    const response = await route.GET(new Request(`http://localhost/api/orders/${UUID_ORDER}/action-requests`), {
      params: Promise.resolve({ id: UUID_ORDER }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ requests: state.requests });
  });

  test('환불완료 주문도 마찬가지로 200을 반환한다', async () => {
    const state: MemberRouteState = {
      member: { ok: true, memberId: 'member-1' },
      order: { id: UUID_ORDER, memberId: 'member-1', orderStatus: '주문접수', paymentStatus: '환불완료' },
      requests: [],
    };
    const route = loadMemberRoute(state);
    const response = await route.GET(new Request(`http://localhost/api/orders/${UUID_ORDER}/action-requests`), {
      params: Promise.resolve({ id: UUID_ORDER }),
    });
    expect(response.status).toBe(200);
  });

  test('다른 회원 소유 주문이거나 존재하지 않으면 여전히 404다(소유권 검증은 유지)', async () => {
    const state: MemberRouteState = {
      member: { ok: true, memberId: 'member-1' },
      order: { id: UUID_ORDER, memberId: 'someone-else', orderStatus: '취소완료', paymentStatus: '결제취소' },
      requests: [],
    };
    const route = loadMemberRoute(state);
    const response = await route.GET(new Request(`http://localhost/api/orders/${UUID_ORDER}/action-requests`), {
      params: Promise.resolve({ id: UUID_ORDER }),
    });
    expect(response.status).toBe(404);
  });
});
