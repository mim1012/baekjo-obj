import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// repo.ts 데이터 계층 회귀 — action-request-routes.spec.ts와 동일한 transpile-and-stub 패턴
// (repo.ts가 'server-only'를 import하는 실제 서버 모듈이라 그냥 require하면 구성에 따라 깨질 수
// 있어 DB/네트워크 없이 순수 파싱 로직만 고정한다). PR4 리뷰 블로커 B1/B2는 순수 텍스트 grep으로는
// 절대 잡히지 않는(데이터 모양 회귀) 종류였다 — 여기서는 실제 repo.ts 함수(rowToRecord/
// parseActionRequest/toParsableActionRequestRow)를 실행해 그 데이터 모양을 검증한다.
//
// B1: ORDER_STATUS_SET이 ORDER_STATUSES(좁은 화이트리스트)였을 때 '부분취소'/'부분취소완료'가
//     읽기 경로에서 전부 '주문접수'로 뭉개졌다 — ALL_ORDER_STATUSES로 고쳤는지 getOrderById로 검증.
// B2: order_action_requests.items(생성 시점 스냅샷, id/status 없음)만 읽어 아이템별 상태가 조회
//     경로에 전혀 실리지 않았다 — order_action_request_items 임베딩이 실제로 id/status를 실어
//     오는지, REJECTED 아이템이 살아있는지, key로 쓰일 id가 유니크한지 listOrderActionRequests로 검증.

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

// types/index.ts와 actionRequests.ts는 런타임 의존성이 없는(타입 전용 import만 있는) 순수 모듈이라
// 실제 파일을 그대로 로드해 쓴다 — ALL_ORDER_STATUSES/deriveRequestStatus를 별도로 재구현하면 이
// 스펙 자체가 repo.ts와 SSOT가 어긋난 값을 놓고 통과할 위험이 있다.
const typesModule = loadServerModuleWithStubs('src/types/index.ts', {});
const actionRequestsModule = loadServerModuleWithStubs('src/lib/orders/actionRequests.ts', {});

/** getSupabase()가 돌려주는 체이너블 쿼리 빌더의 최소 스텁. repo.ts가 실제로 쓰는 체인만 지원한다:
 *  .from(table).select(...).eq(...)...maybeSingle() / .order(...) 로 끝나는 두 모양. */
function fakeSupabase(resultsByTable: Record<string, { data: unknown; error: unknown }>) {
  return {
    from(table: string) {
      const result = resultsByTable[table] ?? { data: null, error: null };
      const builder = {
        select: () => builder,
        eq: () => builder,
        maybeSingle: async () => result,
        order: async () => result,
      };
      return builder;
    },
  };
}

function loadRepo(resultsByTable: Record<string, { data: unknown; error: unknown }>) {
  const dependencies = {
    '@/lib/supabase/server': { getSupabase: () => fakeSupabase(resultsByTable) },
    '@/types': typesModule,
    '@/lib/orderPolicy/config': { normalizeBankTransferAccount: () => undefined },
    '@/lib/orders/orderDateFilters': { toOrderDateRangeIso: (x: unknown) => x },
    '@/lib/orders/refund': { REFUND_STATUSES: ['SUCCEEDED', 'FAILED'] },
    '@/lib/orders/actionRequests': actionRequestsModule,
  };
  return loadServerModuleWithStubs('src/lib/orders/repo.ts', dependencies) as {
    getOrderById: (id: string) => Promise<{ orderStatus: string } | null>;
    listOrderActionRequests: (
      orderId: string,
      memberId?: string,
    ) => Promise<{ id: string; status: string; items: { id: string; status: string; lineIndex: number }[] }[]>;
  };
}

function orderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    member_id: 'member-1',
    customer_name: '홍길동',
    phone: '010-0000-0000',
    address: '서울시',
    items: [{ productId: 'p1', productName: 'A', quantity: 2, price: 1000, brandId: 'brand-a' }],
    total_price: 2000,
    delivery_fee: 0,
    delivery_fee_breakdown: [],
    seller_groups: [],
    consent_records: [],
    seller_acceptances: [],
    payment_method: '카드',
    bank_transfer_account: null,
    order_status: '주문접수',
    payment_status: '결제완료',
    delivery_status: '배송전',
    tracking_number: null,
    delivery_memo: null,
    created_at: '2026-01-01T00:00:00.000Z',
    carrier: null,
    payment_key: null,
    paid_at: null,
    expires_at: null,
    reclaim_attempts: 0,
    last_reclaim_error: null,
    reclaim_dead: false,
    ...overrides,
  };
}

test.describe('B1 — getOrderById가 파생 상태(부분취소/부분취소완료)를 주문접수로 뭉개지 않는다', () => {
  for (const derivedStatus of ['부분취소', '부분취소완료']) {
    test(`order_status='${derivedStatus}'가 그대로 보존된다(ORDER_STATUSES가 아니라 ALL_ORDER_STATUSES로 정규화)`, async () => {
      const repo = loadRepo({ orders: { data: orderRow({ order_status: derivedStatus }), error: null } });
      const order = await repo.getOrderById('order-1');
      expect(order?.orderStatus).toBe(derivedStatus);
    });
  }

  test('유니온 밖의 진짜 미지값은 여전히 주문접수로 안전 폴백한다(정규화 자체는 유지)', async () => {
    const repo = loadRepo({ orders: { data: orderRow({ order_status: 'garbage-status' }), error: null } });
    const order = await repo.getOrderById('order-1');
    expect(order?.orderStatus).toBe('주문접수');
  });
});

function actionRequestRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'request-1',
    order_id: 'order-1',
    member_id: 'member-1',
    request_type: 'CANCEL',
    brand_id: 'brand-a',
    items: [ // 생성 시점 스냅샷(id/status 없음) — 임베딩이 있으면 이건 무시돼야 한다.
      { lineIndex: 0, productId: 'p1', productName: 'A', quantity: 2, unitPrice: 1000, amount: 2000 },
    ],
    requested_amount: 2000,
    reason: '고객 요청',
    status: 'REQUESTED', // advisory 컬럼 — parseActionRequest는 이걸 신뢰하지 않고 아이템에서 재파생한다.
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    order_action_request_items: [],
    ...overrides,
  };
}

test.describe('B2 — listOrderActionRequests가 order_action_request_items에서 아이템별 상태를 싣는다', () => {
  test('임베딩된 아이템의 id/status가 그대로 온다(생성 시점 스냅샷의 무id/무status가 아니다)', async () => {
    const row = actionRequestRow({
      order_action_request_items: [
        { id: 'item-1', line_index: 0, product_id: 'p1', product_name: 'A', quantity: 2, unit_price: 1000, amount: 2000, option_name: null, status: 'REJECTED' },
      ],
    });
    const repo = loadRepo({ order_action_requests: { data: [row], error: null } });
    const [request] = await repo.listOrderActionRequests('order-1');
    expect(request.items).toHaveLength(1);
    expect(request.items[0]?.id).toBe('item-1');
    expect(request.items[0]?.status).toBe('REJECTED');
    // 요청 레벨 status는 advisory 컬럼('REQUESTED')이 아니라 아이템에서 재파생돼야 한다 —
    // 전량 REJECTED면 REJECTED.
    expect(request.status).toBe('REJECTED');
  });

  test('상품이 여러 개인 요청의 아이템 id가 전부 유니크하다(React key 중복 방지)', async () => {
    const row = actionRequestRow({
      items: [
        { lineIndex: 0, productId: 'p1', productName: 'A', quantity: 1, unitPrice: 1000, amount: 1000 },
        { lineIndex: 1, productId: 'p2', productName: 'B', quantity: 1, unitPrice: 2000, amount: 2000 },
      ],
      order_action_request_items: [
        { id: 'item-1', line_index: 0, product_id: 'p1', product_name: 'A', quantity: 1, unit_price: 1000, amount: 1000, option_name: null, status: 'APPROVED' },
        { id: 'item-2', line_index: 1, product_id: 'p2', product_name: 'B', quantity: 1, unit_price: 2000, amount: 2000, option_name: null, status: 'REQUESTED' },
      ],
    });
    const repo = loadRepo({ order_action_requests: { data: [row], error: null } });
    const [request] = await repo.listOrderActionRequests('order-1');
    const ids = request.items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(['item-1', 'item-2']);
    // REQUESTED가 남아있으면 요청 레벨은 REQUESTED(APPROVED만으로는 승격되지 않는다).
    expect(request.status).toBe('REQUESTED');
  });

  test('레거시 요청(0169 백필 이전, order_action_request_items 행이 0건)은 스냅샷에서 합성한 id/status로 폴백한다', async () => {
    const row = actionRequestRow({ status: 'APPROVED', order_action_request_items: [] });
    const repo = loadRepo({ order_action_requests: { data: [row], error: null } });
    const [request] = await repo.listOrderActionRequests('order-1');
    expect(request.items).toHaveLength(1);
    expect(typeof request.items[0]?.id).toBe('string');
    expect(request.items[0]?.id.length).toBeGreaterThan(0);
    // 합성 아이템은 요청 레벨 advisory status를 상속한다(0169 백필과 동일 규칙).
    expect(request.items[0]?.status).toBe('APPROVED');
  });
});
