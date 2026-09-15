import { test, expect } from '@playwright/test';
import { q, stockOf, orderRow, supabaseEnvReady, fixtureId, sweepStaleFixtures } from './helpers';

// PR4(상품 수량 기반 취소 처리) 계약 DB 스펙 (staging Supabase, 0169/0170/0171) — 브라우저 불필요,
// RPC 직접 호출. create_order_action_request / transition_action_request /
// complete_action_request_and_restore / recompute_order_cancel_status와, 그 위임 대상인
// cancel_order_reservation_and_restore(0031)·create_order_refund_request/complete_order_refund
// (0072/0171)까지 exercise한다. 0151 시절의 기본 흐름(REQUESTED→APPROVED→COMPLETED, 반려 예약해제,
// 재고 이중복원 없음)은 이식 원본(feature/item-cancel-status)의 action-request.db.spec.ts가 이미
// 고정했으므로, 이 파일은 PR4가 새로 추가한 계약 — 상태전이 위반, 결제상태별 완료 증빙, 배송비 상한,
// 동시성 — 에 집중한다.
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
}

interface OrderItemInput {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  brandId: string;
}

interface OrderFixtureOptions {
  paymentStatus: string;
  paymentKey?: string | null;
  paidAt?: string | null;
  deliveryFee?: number;
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
  opts: OrderFixtureOptions,
): Promise<string> {
  const itemsJson = JSON.stringify(items);
  const paymentKeySql = opts.paymentKey ? `'${opts.paymentKey}'` : 'null';
  const paidAtSql = opts.paidAt ? `'${opts.paidAt}'` : 'null';
  const rows = await q(`insert into public.orders
      (customer_name, items, total_price, delivery_fee, payment_method, order_status, payment_status, payment_key, paid_at)
      values ('${customerName}', $items$${itemsJson}$items$::jsonb, 2000, ${opts.deliveryFee ?? 0}, '신용카드', '주문접수', '${opts.paymentStatus}', ${paymentKeySql}, ${paidAtSql})
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
      $items$${itemsJson}$items$::jsonb, ${amount}, 'pr4-db-spec-reason'
    )->>'id')::uuid as request_id;`);
  return rows[0].request_id as string;
}

async function approve(requestId: string): Promise<void> {
  await q(`select public.transition_action_request('${requestId}'::uuid, 'APPROVE');`);
}

async function complete(requestId: string): Promise<void> {
  await q(`select public.complete_action_request_and_restore('${requestId}'::uuid);`);
}

async function itemStatuses(requestId: string): Promise<{ line_index: number; status: string }[]> {
  const rows = await q(`select line_index, status from public.order_action_request_items
      where request_id='${requestId}' order by line_index;`);
  return rows as { line_index: number; status: string }[];
}

async function insertSucceededRefund(
  orderId: string,
  idempotencyKey: string,
  items: RequestItemInput[],
  includeDeliveryFee: boolean,
  requestedAmount: number,
): Promise<void> {
  const itemsJson = JSON.stringify(
    items.map((item) => ({ ...item, optionId: null, optionName: null })),
  );
  await q(`insert into public.order_refunds
      (order_id, idempotency_key, items, include_delivery_fee, requested_amount, approved_amount, status, reason, provider_balance_after, completed_at)
      values ('${orderId}', '${idempotencyKey}', $items$${itemsJson}$items$::jsonb, ${includeDeliveryFee}, ${requestedAmount}, ${requestedAmount}, 'SUCCEEDED', 'pr4-db-spec-refund', 0, now());`);
}

async function errorMessageOf(action: () => Promise<unknown>): Promise<string> {
  try {
    await action();
  } catch (error) {
    return String((error as Error).message);
  }
  return '';
}

async function cleanupOrder(orderId: string): Promise<void> {
  // order_action_requests → orders는 on delete restrict라 아이템(cascade)·요청·환불을 먼저 지워야 한다.
  await q(`delete from public.order_action_requests where order_id='${orderId}';`);
  await q(`delete from public.order_refunds where order_id='${orderId}';`);
  await q(`delete from public.orders where id='${orderId}';`);
}

test.describe.serial('PR4 상품별 취소 요청 DB 계약 (0169/0170/0171)', () => {
  test.describe.serial('1. 미결제 전량 완료 → 0031 위임(이중복원 없음), 완료 후 REJECT는 무효 전이', () => {
    const P1 = fixtureId('pr4_ar1_p1');
    const CUSTOMER = fixtureId('pr4_ar1');
    const BRAND = fixtureId('pr4_ar1_brand');
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

    test('전량 승인+완료는 재고를 복원하고 취소완료+결제취소로 전이한다(0031 위임)', async () => {
      const before = await stockOf(P1);
      await approve(requestId);
      await complete(requestId);
      expect(await stockOf(P1)).toBe(before + 2);
      const row = await orderRow(orderId);
      expect(row.order_status).toBe('취소완료');
      expect(row.payment_status).toBe('결제취소');
    });

    test('cancel_order_reservation_and_restore를 직접 재호출해도 이미 처리된 주문은 재복원하지 않는다', async () => {
      const before = await stockOf(P1);
      const rows = await q(`select public.cancel_order_reservation_and_restore('${orderId}'::uuid) as restored;`);
      expect(rows[0].restored).toBe(false);
      expect(await stockOf(P1)).toBe(before);
    });

    test('완료된 요청에 REJECT를 호출하면 ACTION_INVALID_TRANSITION 409로 거부된다', async () => {
      const message = await errorMessageOf(() =>
        q(`select public.transition_action_request('${requestId}'::uuid, 'REJECT');`),
      );
      expect(message).toContain('ACTION_INVALID_TRANSITION');
      const items = await itemStatuses(requestId);
      expect(items[0].status).toBe('COMPLETED');
    });
  });

  test.describe.serial('2. 미결제 부분완료는 지원하지 않는다', () => {
    const P1 = fixtureId('pr4_ar2_p1');
    const CUSTOMER = fixtureId('pr4_ar2');
    const BRAND = fixtureId('pr4_ar2_brand');
    let orderId: string;
    let requestId: string;

    test.beforeAll(async () => {
      await insertProduct(P1, 10);
      // 주문 라인 수량 4, 승인분 2 — 주문 전체 잔여 수량을 커버하지 않는다.
      orderId = await insertOrder(
        CUSTOMER,
        [{ productId: P1, productName: P1, quantity: 4, price: 1000, brandId: BRAND }],
        { paymentStatus: '입금대기' },
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

    test('승인분이 전체 잔여 수량과 다르면 ACTION_UNPAID_PARTIAL_NOT_SUPPORTED 409로 거부된다', async () => {
      const before = await stockOf(P1);
      const message = await errorMessageOf(() => complete(requestId));
      expect(message).toContain('ACTION_UNPAID_PARTIAL_NOT_SUPPORTED');
      expect(await stockOf(P1)).toBe(before);
      const items = await itemStatuses(requestId);
      expect(items[0].status).toBe('APPROVED');
    });
  });

  test.describe.serial('3. 전량 반려 → 주문접수 복귀, 같은 브랜드로 재요청 성공', () => {
    const P1 = fixtureId('pr4_ar3_p1');
    const CUSTOMER = fixtureId('pr4_ar3');
    const BRAND = fixtureId('pr4_ar3_brand');
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

    test('REQUESTED 전량 REJECT는 주문을 주문접수로 되돌리고, 예약이 풀려 재요청이 성공한다', async () => {
      await q(`select public.transition_action_request('${requestId}'::uuid, 'REJECT');`);
      expect((await itemStatuses(requestId))[0].status).toBe('REJECTED');
      expect((await orderRow(orderId)).order_status).toBe('주문접수');

      const secondRequestId = await createActionRequest(
        orderId,
        BRAND,
        [{ lineIndex: 0, productId: P1, productName: P1, quantity: 2, unitPrice: 1000, amount: 2000 }],
        2000,
      );
      expect((await itemStatuses(secondRequestId))[0].status).toBe('REQUESTED');
      expect((await orderRow(orderId)).order_status).toBe('취소요청');
    });
  });

  test.describe.serial('4. 결제완료(카드) — 환불 미정산 거부, SQL로 심어둔 SUCCEEDED 환불로 증빙되면 완료(재고 불변)', () => {
    const P1 = fixtureId('pr4_ar4_p1');
    const CUSTOMER = fixtureId('pr4_ar4');
    const BRAND = fixtureId('pr4_ar4_brand');
    const TK = fixtureId('pr4_ar4_tk');
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

    test('SUCCEEDED 환불 원장이 없으면 ACTION_REFUND_NOT_SETTLED 409로 거부되고 재고는 그대로다', async () => {
      const before = await stockOf(P1);
      const message = await errorMessageOf(() => complete(requestId));
      expect(message).toContain('ACTION_REFUND_NOT_SETTLED');
      expect(await stockOf(P1)).toBe(before);
      expect((await itemStatuses(requestId))[0].status).toBe('APPROVED');
    });

    test('해당 수량을 덮는 SUCCEEDED 환불이 SQL로 심어지면 완료되고, 재고는 이미 0072가 복원했으므로 변하지 않는다', async () => {
      // 0072(complete_order_refund)는 환불 확정 시 이미 restore_stock_for_order를 호출한다 — 여기선
      // 그 결과 상태(재고 +2, SUCCEEDED 원장)를 직접 만들어 "환불이 이미 정산됐다"를 시뮬레이션한다.
      const beforeRefundInsert = await stockOf(P1);
      await q(`update public.products set stock = stock + 2 where id='${P1}';`);
      await insertSucceededRefund(
        orderId,
        fixtureId('pr4_ar4_refund'),
        [{ lineIndex: 0, productId: P1, productName: P1, quantity: 2, unitPrice: 1000, amount: 2000 }],
        false,
        2000,
      );
      const afterRefundInsert = await stockOf(P1);
      expect(afterRefundInsert).toBe(beforeRefundInsert + 2);

      await complete(requestId);
      // complete_action_request_and_restore는 결제완료 경로에서 restore_stock_for_order를 직접
      // 호출하지 않는다 — 재고는 환불이 이미 복원한 값 그대로 유지돼야 한다(이중 복원 없음).
      expect(await stockOf(P1)).toBe(afterRefundInsert);
      expect((await itemStatuses(requestId))[0].status).toBe('COMPLETED');
      expect((await orderRow(orderId)).order_status).toBe('취소완료');
    });
  });

  test.describe.serial('5. 배송비 잔여 — 부분취소완료 상한 + 이후 배송비 환불 요청은 막히지 않는다', () => {
    const P1 = fixtureId('pr4_ar5_p1');
    const CUSTOMER = fixtureId('pr4_ar5');
    const BRAND = fixtureId('pr4_ar5_brand');
    const TK = fixtureId('pr4_ar5_tk');
    let orderId: string;
    let requestId: string;

    test.beforeAll(async () => {
      await insertProduct(P1, 10);
      orderId = await insertOrder(
        CUSTOMER,
        [{ productId: P1, productName: P1, quantity: 2, price: 1000, brandId: BRAND }],
        { paymentStatus: '결제완료', paymentKey: TK, deliveryFee: 3000 },
      );
      // 실제 운영 순서(요청 → 승인 → 환불 → 완료)를 따른다. 환불을 요청보다 먼저 심으면
      // create RPC의 잔여수량 규칙(라인수량 − 활성 − max(완료, 성공환불))이 이미 정산된 라인의
      // 신규 취소 요청을 정당하게 거부한다(ACTION_QUANTITY_EXCEEDS_REMAINING).
      requestId = await createActionRequest(
        orderId,
        BRAND,
        [{ lineIndex: 0, productId: P1, productName: P1, quantity: 2, unitPrice: 1000, amount: 2000 }],
        2000,
      );
      await approve(requestId);
      // 승인 뒤 상품 라인만 SUCCEEDED 환불로 정산됐다고 심어둔다(배송비는 아직 미포함).
      await q(`update public.products set stock = stock + 2 where id='${P1}';`);
      await insertSucceededRefund(
        orderId,
        fixtureId('pr4_ar5_refund'),
        [{ lineIndex: 0, productId: P1, productName: P1, quantity: 2, unitPrice: 1000, amount: 2000 }],
        false,
        2000,
      );
    });

    test.afterAll(async () => {
      await cleanupOrder(orderId);
      await q(`delete from public.products where id='${P1}';`);
    });

    test('전량 완료라도 배송비 포함 SUCCEEDED 환불이 없으면 부분취소완료에서 멈춘다', async () => {
      await complete(requestId);
      const row = await orderRow(orderId);
      expect(row.order_status).toBe('부분취소완료');
      expect(row.order_status).not.toBe('취소완료');
    });

    test('부분취소완료 상태에서도 배송비 환불 요청은 assertRefundableOrder류 가드(취소완료 전용)에 막히지 않는다', async () => {
      // create_order_refund_request의 취소 가드는 정확히 order_status='취소완료'일 때만 막는다
      // (REFUND_ORDER_CANCELED) — '부분취소완료'는 여전히 배송비 환불 창구가 열려 있어야 한다
      // (0170의 상한 설계 의도). 생성 자체는 항상 PROCESSING으로 시작하므로(SUCCEEDED 전이는
      // complete_order_refund 몫), 여기서는 "가드에 막히지 않고 원장이 만들어진다"만 확인한다.
      const rows = await q(`select (public.create_order_refund_request(
          '${orderId}'::uuid, '${fixtureId('pr4_ar5_delivery_refund')}',
          '[]'::jsonb, true, 3000, '배송비 환불', null
        )->>'status') as status;`);
      expect(rows[0].status).toBe('PROCESSING');
    });
  });

  test.describe.serial('6. 결제취소(paid_at 존재) + 환불 미정산 → 완료 거부', () => {
    const P1 = fixtureId('pr4_ar6_p1');
    const CUSTOMER = fixtureId('pr4_ar6');
    const BRAND = fixtureId('pr4_ar6_brand');
    let orderId: string;
    let requestId: string;

    test.beforeAll(async () => {
      await insertProduct(P1, 10);
      orderId = await insertOrder(
        CUSTOMER,
        [{ productId: P1, productName: P1, quantity: 2, price: 1000, brandId: BRAND }],
        { paymentStatus: '결제취소', paidAt: new Date().toISOString() },
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

    test('paid_at이 있는데 SUCCEEDED 환불이 없으면 ACTION_REFUND_NOT_SETTLED 409로 거부된다', async () => {
      const message = await errorMessageOf(() => complete(requestId));
      expect(message).toContain('ACTION_REFUND_NOT_SETTLED');
      expect((await itemStatuses(requestId))[0].status).toBe('APPROVED');
    });
  });

  test.describe.serial('7. 동시 생성 — 같은 (주문, 브랜드)에 대해 한쪽만 성공한다', () => {
    const P1 = fixtureId('pr4_ar7_p1');
    const CUSTOMER = fixtureId('pr4_ar7');
    const BRAND = fixtureId('pr4_ar7_brand');
    let orderId: string;

    test.beforeAll(async () => {
      await insertProduct(P1, 10);
      // 라인 수량(4)을 요청 수량(1)보다 크게 둔다. 두 호출이 같은 전량을 요청하면 뒤에 온 호출은
      // orders 행 잠금 해제 후 앞 호출의 활성 아이템을 보게 되어 잔여수량 규칙
      // (ACTION_QUANTITY_EXCEEDS_REMAINING)에 먼저 걸린다 — 그 경로는 시나리오 3·4가 이미 덮는다.
      // 여기서는 잔여수량이 남아 있어도 (order_id, brand_id) 활성 unique 인덱스가 두 번째 요청을
      // 막는지를 검증한다.
      orderId = await insertOrder(
        CUSTOMER,
        [{ productId: P1, productName: P1, quantity: 4, price: 1000, brandId: BRAND }],
        { paymentStatus: '결제대기' },
      );
    });

    test.afterAll(async () => {
      await cleanupOrder(orderId);
      await q(`delete from public.products where id='${P1}';`);
    });

    test('동시에 들어온 두 create 호출 중 하나만 성공하고 나머지는 ACTION_REQUEST_ALREADY_EXISTS로 빠르게 거부된다', async () => {
      const started = Date.now();
      const items: RequestItemInput[] = [
        { lineIndex: 0, productId: P1, productName: P1, quantity: 1, unitPrice: 1000, amount: 1000 },
      ];
      const results = await Promise.allSettled([
        createActionRequest(orderId, BRAND, items, 1000),
        createActionRequest(orderId, BRAND, items, 1000),
      ]);
      const elapsedMs = Date.now() - started;
      // PT409(어플리케이션 레벨 충돌)는 PostgREST가 투명 재시도하는 40001과 달리 즉시 실패한다 —
      // 30초+ 무응답으로 늘어지면 이 경로가 다시 40001로 회귀했다는 신호다.
      expect(elapsedMs).toBeLessThan(10_000);

      const fulfilled = results.filter((result) => result.status === 'fulfilled');
      const rejected = results.filter((result) => result.status === 'rejected');
      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      const rejection = rejected[0] as PromiseRejectedResult;
      expect(String(rejection.reason)).toContain('ACTION_REQUEST_ALREADY_EXISTS');
    });
  });
});
