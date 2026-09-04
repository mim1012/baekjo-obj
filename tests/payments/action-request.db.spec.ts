import { test, expect } from '@playwright/test';
import { q, stockOf, orderRow, supabaseEnvReady, fixtureId, sweepStaleFixtures } from './helpers';

// 상품별(라인 아이템) 취소·환불 요청 DB 계약 스펙 (staging Supabase, 0151 계약) — 브라우저 불필요,
// RPC 직접 호출. create_order_action_request / transition_action_request /
// complete_action_request_and_restore / recompute_order_cancel_status 4개를 exercise한다.
// SUPABASE_URL / SUPABASE_ACCESS_TOKEN 미설정 시 skip — CI에서는 staging secret으로만 주입, prod 금지.

test.skip(!supabaseEnvReady(), 'SUPABASE_URL/SUPABASE_ACCESS_TOKEN 미설정 — staging DB 스펙 skip');

// ★supabaseEnvReady() 가드 필수 — playwright는 test.skip 여부와 무관하게 스펙 파일을 import해
// 최상위 코드를 실행한다. 가드가 없으면 SUPABASE_URL 미설정 환경(로컬 등)에서도 빈 프로젝트 ref로
// api.supabase.com에 실제 네트워크 요청이 나간다.
if (supabaseEnvReady()) void sweepStaleFixtures().catch(() => {});

interface RequestItemInput {
  lineIndex: number;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  optionName?: string | null;
}

interface OrderItemInput {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  brandId: string;
}

const MEMBER_SQL = `(select id from public.members limit 1)`;
const REAL_BRAND_SQL = `(select id from public.brands limit 1)`;

async function insertProduct(productId: string, stock: number): Promise<void> {
  await q(`insert into public.products (id, name, brand_id, category, price, stock, is_visible)
           values ('${productId}','${productId}', ${REAL_BRAND_SQL}, 'etc', 1000, ${stock}, false);`);
}

async function insertOrder(
  customerName: string,
  items: OrderItemInput[],
  opts: { paymentStatus: string; paymentKey?: string | null },
): Promise<string> {
  const itemsJson = JSON.stringify(items);
  const paymentKeySql = opts.paymentKey ? `'${opts.paymentKey}'` : 'null';
  const rows = await q(`insert into public.orders
      (customer_name, items, total_price, payment_method, order_status, payment_status, payment_key)
      values ('${customerName}', $items$${itemsJson}$items$::jsonb, 2000, '신용카드', '주문접수', '${opts.paymentStatus}', ${paymentKeySql})
      returning id;`);
  return rows[0].id as string;
}

async function createActionRequest(
  orderId: string,
  brandId: string,
  items: RequestItemInput[],
  amount: number,
): Promise<string> {
  const itemsJson = JSON.stringify(items);
  const rows = await q(`select (public.create_order_action_request(
      '${orderId}'::uuid, ${MEMBER_SQL}::uuid, 'CANCEL', '${brandId}',
      $items$${itemsJson}$items$::jsonb, ${amount}, 'db-spec-test-reason'
    )->>'id')::uuid as request_id;`);
  return rows[0].request_id as string;
}

async function approve(requestId: string): Promise<void> {
  await q(`select public.transition_action_request('${requestId}'::uuid, 'APPROVE');`);
}

async function reject(requestId: string): Promise<void> {
  await q(`select public.transition_action_request('${requestId}'::uuid, 'REJECT');`);
}

async function complete(requestId: string): Promise<void> {
  await q(`select public.complete_action_request_and_restore('${requestId}'::uuid);`);
}

async function itemStatuses(requestId: string): Promise<{ line_index: number; status: string }[]> {
  const rows = await q(`select line_index, status from public.order_action_request_items
      where request_id='${requestId}' order by line_index;`);
  return rows as { line_index: number; status: string }[];
}

async function cleanupOrder(orderId: string): Promise<void> {
  // order_action_requests → orders는 on delete restrict라 아이템(cascade)·요청을 먼저 지워야 한다.
  await q(`delete from public.order_action_requests where order_id='${orderId}';`);
  await q(`delete from public.orders where id='${orderId}';`);
}

test.describe.serial('상품별 취소 요청 DB 스펙 (0151)', () => {
  test.describe.serial('1. 신규 생성 → REQUESTED, 취소요청', () => {
    const P1 = fixtureId('ar1_p1');
    const CUSTOMER = fixtureId('ar1');
    const BRAND = fixtureId('ar1_brand');
    let orderId: string;

    test.beforeAll(async () => {
      await insertProduct(P1, 10);
      orderId = await insertOrder(
        CUSTOMER,
        [{ productId: P1, productName: P1, quantity: 2, price: 1000, brandId: BRAND }],
        { paymentStatus: '결제대기' },
      );
    });

    test.afterAll(async () => {
      await cleanupOrder(orderId);
      await q(`delete from public.products where id='${P1}';`);
    });

    test('create_order_action_request가 아이템을 REQUESTED로 만들고 order_status를 취소요청으로 올린다', async () => {
      const requestId = await createActionRequest(
        orderId,
        BRAND,
        [{ lineIndex: 0, productId: P1, productName: P1, quantity: 2, unitPrice: 1000, amount: 2000 }],
        2000,
      );
      const items = await itemStatuses(requestId);
      expect(items).toHaveLength(1);
      expect(items[0].status).toBe('REQUESTED');
      expect((await orderRow(orderId)).order_status).toBe('취소요청');
    });
  });

  test.describe.serial('2. 부분 승인 → APPROVED, 부분취소', () => {
    const P1 = fixtureId('ar2_p1');
    const CUSTOMER = fixtureId('ar2');
    const BRAND = fixtureId('ar2_brand');
    let orderId: string;
    let requestId: string;

    test.beforeAll(async () => {
      await insertProduct(P1, 10);
      // 주문 라인 수량 4, 요청 수량 2 — 주문 전체 수량을 커버하지 않는다.
      orderId = await insertOrder(
        CUSTOMER,
        [{ productId: P1, productName: P1, quantity: 4, price: 1000, brandId: BRAND }],
        { paymentStatus: '결제대기' },
      );
      requestId = await createActionRequest(
        orderId,
        BRAND,
        [{ lineIndex: 0, productId: P1, productName: P1, quantity: 2, unitPrice: 1000, amount: 2000 }],
        2000,
      );
    });

    test.afterAll(async () => {
      await cleanupOrder(orderId);
      await q(`delete from public.products where id='${P1}';`);
    });

    test('APPROVE는 아이템을 APPROVED로 만들고 전체 수량 미충족이면 부분취소로 집계한다', async () => {
      await approve(requestId);
      const items = await itemStatuses(requestId);
      expect(items[0].status).toBe('APPROVED');
      expect((await orderRow(orderId)).order_status).toBe('부분취소');
    });
  });

  test.describe.serial('3. 미결제(입금대기) 승인+완료 → 재고 복원, 부분취소완료/취소완료', () => {
    const PA = fixtureId('ar3_pa');
    const PB = fixtureId('ar3_pb');
    const PC = fixtureId('ar3_pc');
    const CUSTOMER = fixtureId('ar3');
    const BRAND = fixtureId('ar3_brand');
    let partialOrderId: string;
    let partialRequestId: string;
    let fullOrderId: string;
    let fullRequestId: string;

    test.beforeAll(async () => {
      await insertProduct(PA, 10);
      await insertProduct(PB, 10);
      await insertProduct(PC, 10);

      // 3a: 두 라인(각 수량2, 합계4) 중 한 라인만 취소 → 부분취소완료.
      partialOrderId = await insertOrder(
        CUSTOMER,
        [
          { productId: PA, productName: PA, quantity: 2, price: 1000, brandId: BRAND },
          { productId: PB, productName: PB, quantity: 2, price: 1000, brandId: BRAND },
        ],
        { paymentStatus: '입금대기' },
      );
      partialRequestId = await createActionRequest(
        partialOrderId,
        BRAND,
        [{ lineIndex: 0, productId: PA, productName: PA, quantity: 2, unitPrice: 1000, amount: 2000 }],
        2000,
      );

      // 3b: 단일 라인(수량2) 전량 취소 → 취소완료 + payment_status 결제취소.
      fullOrderId = await insertOrder(
        CUSTOMER,
        [{ productId: PC, productName: PC, quantity: 2, price: 1000, brandId: BRAND }],
        { paymentStatus: '입금대기' },
      );
      fullRequestId = await createActionRequest(
        fullOrderId,
        BRAND,
        [{ lineIndex: 0, productId: PC, productName: PC, quantity: 2, unitPrice: 1000, amount: 2000 }],
        2000,
      );
    });

    test.afterAll(async () => {
      await cleanupOrder(partialOrderId);
      await cleanupOrder(fullOrderId);
      await q(`delete from public.products where id in ('${PA}','${PB}','${PC}');`);
    });

    test('부분 완료 — 재고 복원, 부분취소완료 (전체 미충족)', async () => {
      const before = await stockOf(PA);
      await approve(partialRequestId);
      await complete(partialRequestId);
      expect(await stockOf(PA)).toBe(before + 2);
      const row = await orderRow(partialOrderId);
      expect(row.order_status).toBe('부분취소완료');
      expect(row.payment_status).toBe('입금대기');
    });

    test('전체 완료 — 재고 복원, 취소완료 + payment_status 결제취소', async () => {
      const before = await stockOf(PC);
      await approve(fullRequestId);
      await complete(fullRequestId);
      expect(await stockOf(PC)).toBe(before + 2);
      const row = await orderRow(fullOrderId);
      expect(row.order_status).toBe('취소완료');
      expect(row.payment_status).toBe('결제취소');
    });
  });

  test.describe.serial('4. 라인 내 부분 수량 — 절대 취소완료로 올라가면 안 된다 (재무 안전)', () => {
    const P1 = fixtureId('ar4_p1');
    const CUSTOMER = fixtureId('ar4');
    const BRAND = fixtureId('ar4_brand');
    let orderId: string;
    let requestId: string;

    test.beforeAll(async () => {
      await insertProduct(P1, 10);
      // 라인 수량 2, 취소 수량 1 — 같은 라인 내 부분 수량 취소.
      orderId = await insertOrder(
        CUSTOMER,
        [{ productId: P1, productName: P1, quantity: 2, price: 1000, brandId: BRAND }],
        { paymentStatus: '입금대기' },
      );
      requestId = await createActionRequest(
        orderId,
        BRAND,
        [{ lineIndex: 0, productId: P1, productName: P1, quantity: 1, unitPrice: 1000, amount: 1000 }],
        1000,
      );
    });

    test.afterAll(async () => {
      await cleanupOrder(orderId);
      await q(`delete from public.products where id='${P1}';`);
    });

    test('수량 1/2 완료 → 부분취소완료, 취소완료 아님', async () => {
      const before = await stockOf(P1);
      await approve(requestId);
      await complete(requestId);
      expect(await stockOf(P1)).toBe(before + 1);
      const row = await orderRow(orderId);
      expect(row.order_status).toBe('부분취소완료');
      expect(row.order_status).not.toBe('취소완료');
      expect(row.payment_status).toBe('입금대기');
    });
  });

  test.describe.serial('5. REJECT → REJECTED, 예약 해제', () => {
    const P1 = fixtureId('ar5_p1');
    const CUSTOMER = fixtureId('ar5');
    const BRAND = fixtureId('ar5_brand');
    let orderId: string;
    let requestId: string;

    test.beforeAll(async () => {
      await insertProduct(P1, 10);
      orderId = await insertOrder(
        CUSTOMER,
        [{ productId: P1, productName: P1, quantity: 2, price: 1000, brandId: BRAND }],
        { paymentStatus: '결제대기' },
      );
      requestId = await createActionRequest(
        orderId,
        BRAND,
        [{ lineIndex: 0, productId: P1, productName: P1, quantity: 2, unitPrice: 1000, amount: 2000 }],
        2000,
      );
    });

    test.afterAll(async () => {
      await cleanupOrder(orderId);
      await q(`delete from public.products where id='${P1}';`);
    });

    test('REQUESTED에서 REJECT하면 REJECTED가 되고, 같은 브랜드/타입으로 새 요청을 다시 만들 수 있다 (예약 해제)', async () => {
      await reject(requestId);
      const items = await itemStatuses(requestId);
      expect(items[0].status).toBe('REJECTED');

      // REJECTED는 unique-active-brand 인덱스(REQUESTED/APPROVED만 대상) 밖이므로 새 요청이
      // unique_violation 없이 생성된다 — 이것이 "예약 해제"의 DB 레벨 증거다.
      const secondRequestId = await createActionRequest(
        orderId,
        BRAND,
        [{ lineIndex: 0, productId: P1, productName: P1, quantity: 2, unitPrice: 1000, amount: 2000 }],
        2000,
      );
      const secondItems = await itemStatuses(secondRequestId);
      expect(secondItems[0].status).toBe('REQUESTED');
    });
  });

  test.describe.serial('6. 카드 결제완료, 커버되는 SUCCEEDED 환불 없음 → ACTION_REFUND_NOT_SETTLED', () => {
    const P1 = fixtureId('ar6_p1');
    const CUSTOMER = fixtureId('ar6');
    const BRAND = fixtureId('ar6_brand');
    const TK = fixtureId('ar6_tk');
    let orderId: string;
    let requestId: string;

    test.beforeAll(async () => {
      await insertProduct(P1, 10);
      orderId = await insertOrder(
        CUSTOMER,
        [{ productId: P1, productName: P1, quantity: 2, price: 1000, brandId: BRAND }],
        { paymentStatus: '결제완료', paymentKey: TK },
      );
      requestId = await createActionRequest(
        orderId,
        BRAND,
        [{ lineIndex: 0, productId: P1, productName: P1, quantity: 2, unitPrice: 1000, amount: 2000 }],
        2000,
      );
      await approve(requestId);
    });

    test.afterAll(async () => {
      await cleanupOrder(orderId);
      await q(`delete from public.products where id='${P1}';`);
    });

    test('환불 원장(SUCCEEDED)이 해당 수량을 커버하지 않으면 완료가 거부된다', async () => {
      let message = '';
      try {
        await complete(requestId);
      } catch (e) {
        message = String((e as Error).message);
      }
      expect(message).toContain('ACTION_REFUND_NOT_SETTLED');
      // 완료가 거부됐으니 아이템은 여전히 APPROVED여야 한다(재고 복원도 없었어야 한다).
      const items = await itemStatuses(requestId);
      expect(items[0].status).toBe('APPROVED');
    });
  });

  test.describe.serial('7. 무통장 결제완료(payment_key 없음) → ACTION_MANUAL_REFUND_REQUIRED', () => {
    const P1 = fixtureId('ar7_p1');
    const CUSTOMER = fixtureId('ar7');
    const BRAND = fixtureId('ar7_brand');
    let orderId: string;
    let requestId: string;

    test.beforeAll(async () => {
      await insertProduct(P1, 10);
      orderId = await insertOrder(
        CUSTOMER,
        [{ productId: P1, productName: P1, quantity: 2, price: 1000, brandId: BRAND }],
        { paymentStatus: '결제완료', paymentKey: null },
      );
      requestId = await createActionRequest(
        orderId,
        BRAND,
        [{ lineIndex: 0, productId: P1, productName: P1, quantity: 2, unitPrice: 1000, amount: 2000 }],
        2000,
      );
      await approve(requestId);
    });

    test.afterAll(async () => {
      await cleanupOrder(orderId);
      await q(`delete from public.products where id='${P1}';`);
    });

    test('payment_key가 없는 결제완료(무통장)는 자동 완료를 거부하고 수동 환불을 요구한다', async () => {
      let message = '';
      try {
        await complete(requestId);
      } catch (e) {
        message = String((e as Error).message);
      }
      expect(message).toContain('ACTION_MANUAL_REFUND_REQUIRED');
      const items = await itemStatuses(requestId);
      expect(items[0].status).toBe('APPROVED');
    });
  });

  test.describe.serial('8. 멱등성 — 중복 APPROVE/COMPLETE는 에러 없이 무시되고 재고가 이중 복원되지 않는다', () => {
    const P1 = fixtureId('ar8_p1');
    const CUSTOMER = fixtureId('ar8');
    const BRAND = fixtureId('ar8_brand');
    let orderId: string;
    let requestId: string;

    test.beforeAll(async () => {
      await insertProduct(P1, 10);
      orderId = await insertOrder(
        CUSTOMER,
        [{ productId: P1, productName: P1, quantity: 2, price: 1000, brandId: BRAND }],
        { paymentStatus: '입금대기' },
      );
      requestId = await createActionRequest(
        orderId,
        BRAND,
        [{ lineIndex: 0, productId: P1, productName: P1, quantity: 2, unitPrice: 1000, amount: 2000 }],
        2000,
      );
    });

    test.afterAll(async () => {
      await cleanupOrder(orderId);
      await q(`delete from public.products where id='${P1}';`);
    });

    test('APPROVE를 두 번 호출해도 에러 없이 APPROVED 상태를 유지한다', async () => {
      await approve(requestId);
      await approve(requestId);
      const items = await itemStatuses(requestId);
      expect(items[0].status).toBe('APPROVED');
    });

    test('COMPLETE를 두 번 호출해도 에러 없이 재고가 한 번만 복원된다', async () => {
      const before = await stockOf(P1);
      await complete(requestId);
      expect(await stockOf(P1)).toBe(before + 2);

      await complete(requestId);
      expect(await stockOf(P1)).toBe(before + 2);
      const items = await itemStatuses(requestId);
      expect(items[0].status).toBe('COMPLETED');
    });
  });
});
