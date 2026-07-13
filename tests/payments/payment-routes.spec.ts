import { test, expect } from '@playwright/test';
import { q, stockOf, orderRow, supabaseEnvReady, fixtureId, sweepStaleFixtures } from './helpers';

// 결제 라우트 통합 스펙 — 실제 프리뷰 배포(staging DB 연결) 대상 API 테스트. 브라우저 불필요.
// 승격 출처: wave1-preview-integration-test.mjs (PR#23 프리뷰에서 22 PASS 확인됨).
// PAYMENTS_PREVIEW_URL 미설정 시 skip — 토스 결제 라우트가 배포된 프리뷰가 있을 때만 의미있는 스펙이라
// 골든플로우처럼 상시 URL을 고정하지 않는다(그 프리뷰는 이미 소멸됨 — 회귀 시 재설정 필요).
const BASE = process.env.PAYMENTS_PREVIEW_URL ?? '';

test.skip(!supabaseEnvReady(), 'SUPABASE_URL/SUPABASE_ACCESS_TOKEN 미설정 — staging DB 스펙 skip');
test.skip(!BASE, 'PAYMENTS_PREVIEW_URL 미설정 — 결제 라우트가 배포된 프리뷰 URL이 없어 skip');

// 모든 픽스처 id/customer_name/paymentKey는 fixtureId()로 실행 스코프 고유값을 쓴다(helpers.ts
// 참고) — 고정 ID를 공유 staging DB에 쓰면 로컬↔CI 또는 여러 PR의 CI가 겹칠 때 서로의 재고를
// 소진시키거나 orders.payment_key의 0022 unique 제약과 충돌한다(payments-db-spec CI 사고 실측).
// ★supabaseEnvReady() 가드 필수 — playwright는 test.skip 여부와 무관하게 스펙 파일을 import해
// 최상위 코드를 실행한다. 가드가 없으면 SUPABASE_URL 미설정 환경(로컬 등)에서도 빈 프로젝트 ref로
// api.supabase.com에 실제 네트워크 요청이 나간다.
if (supabaseEnvReady()) void sweepStaleFixtures().catch(() => {});

type ApiResponseBody = { order?: { id?: string }; id?: string } & Record<string, unknown>;

async function callApi(path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let json: ApiResponseBody | null = null;
  try {
    json = (await res.json()) as ApiResponseBody;
  } catch {
    /* 본문 없음 */
  }
  return { status: res.status, json };
}

// 2026-07-13: 이 파일은 원래 W1(승인중 상태기계) 도입 이전 스크래치패드를 이식한 것이라, 일부
// 단언이 "confirm 실패 시 결제대기로 남는다"는 낡은 전제로 작성돼 있었다. 실제로는 confirm 라우트가
// 토스 호출 '전'에 claimOrderForConfirmation으로 결제대기→승인중 배타 전이를 먼저 확정한다
// (src/app/api/payments/confirm/route.ts ③-b) — 그래서 토스 응답이 불명(502)이어도 주문은 승인중에
// 남는다. 그리고 /api/payments/cancel(0024, cancelReservationAndRestore)은 결제대기 주문에만
// 작동한다 — 승인중 주문 취소·재고 복원은 cancelConfirmingAndRestore(0026)의 몫이고, 이 라우트는
// 그것을 아직 노출하지 않는다(승인중 고아 주문은 reclaim-stock cron이 dead-letter 경로로 정리).
// 즉 claim이 한 번 발생한 주문은 이 공개 API 표면으로는 더 이상 취소할 수 없다 — 그래서 아래
// "취소/재확인/멱등" 시나리오(옛 [4]~[6])는 claim을 겪지 않은 별도 주문(order-B)으로 분리했다.
test.describe.serial('결제 라우트 — 주문 선점/불명 상태(claim 잔존) (프리뷰 통합)', () => {
  const P = fixtureId('route_wave1_p1');
  const CUSTOMER = fixtureId('route_wave1');
  const TK_A = fixtureId('tk_route_a');
  const mkOrder = (qty: number) =>
    callApi('/api/orders', {
      customerName: CUSTOMER,
      phone: '010-0000-0000',
      address: '테스트',
      items: [{ productId: P, quantity: qty }],
      paymentMethod: '신용카드',
    });

  let orderId: string;

  test.beforeAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${P}';`);
    await q(`insert into public.products (id, name, brand_id, category, price, stock, is_visible)
             values ('${P}','${P}', (select id from public.brands limit 1), 'etc', 1000, 5, true);`);
  });

  test.afterAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${P}';`);
  });

  test('카드 주문 생성 시 재고를 차감하고 결제대기로 선점한다', async () => {
    const res = await mkOrder(2); // subtotal 2000 + 배송비 3000 = 5000
    expect([200, 201]).toContain(res.status);
    orderId = (res.json?.order?.id ?? res.json?.id) as string;
    expect(orderId).toBeTruthy();

    const row = await orderRow(orderId);
    expect(row.expires_at).toBeTruthy();
    expect(row.payment_status).toBe('결제대기');
    expect(await stockOf(P)).toBe(3);
  });

  test('금액을 조작하면 claim 이전(토스 호출 전)에 400으로 차단한다', async () => {
    // route.ts ②(금액검증)가 ③-b(claim)보다 먼저라 이 요청은 claim을 트리거하지 않는다 — 주문은
    // 여전히 결제대기.
    const res = await callApi('/api/payments/confirm', { paymentKey: TK_A, orderId, amount: 99999 });
    expect(res.status).toBe(400);
    expect((await orderRow(orderId)).payment_status).toBe('결제대기');
    expect(await stockOf(P)).toBe(3);
  });

  test('불명 상태(TOSS_SECRET_KEY 미설정)에서는 502를 반환하고, claim이 남긴 승인중 상태·재고를 그대로 둔다', async () => {
    // 금액이 맞으므로 claim이 먼저 실행돼 결제대기→승인중으로 전이한다. 이후 토스 confirm이
    // 시크릿 미설정으로 "불명"(httpStatus=null) 처리되면 라우트는 의도적으로 취소·복원을 하지
    // 않는다 — 토스가 이미 캡처했을 가능성을 배제할 수 없기 때문(route.ts 불명 분기 주석).
    // 따라서 주문은 결제대기가 아니라 "승인중"에 남는다 — 이 잔존 상태의 최종 정리는 이 라우트가
    // 아니라 reclaim-stock cron의 dead-letter 대사(0026) 몫이다.
    const res = await callApi('/api/payments/confirm', { paymentKey: TK_A, orderId, amount: 5000 });
    expect(res.status).toBe(502);
    expect((await orderRow(orderId)).payment_status).toBe('승인중');
    expect(await stockOf(P)).toBe(3); // claim은 재고를 건드리지 않고, 이 분기는 복원도 하지 않는다
  });
});

// claim(승인중 전이)을 겪지 않은 별도 주문으로 취소/재확인/멱등 흐름을 검증한다 — 위 describe에서
// order-A가 claim 이후 이 API 표면으로는 취소 불가능한 상태(승인중)에 고정되므로, 체인을 이어가면
// 이 시나리오들이 모두 무의미하게 실패/스킵된다(2026-07-13 team-lead 지적: serial 1건 실패 시 5건
// 미실행). order-A/product 재고와 독립적으로 동작하도록 별도 product(Q)를 쓴다.
test.describe.serial('결제 라우트 — 취소/재확인/멱등 (claim 미실행 주문, 프리뷰 통합)', () => {
  const Q = fixtureId('route_wave1_q1');
  const CUSTOMER = fixtureId('route_wave1_cancel');
  const TK_B = fixtureId('tk_route_b');
  const mkOrder = (qty: number) =>
    callApi('/api/orders', {
      customerName: CUSTOMER,
      phone: '010-0000-0000',
      address: '테스트',
      items: [{ productId: Q, quantity: qty }],
      paymentMethod: '신용카드',
    });

  let orderId: string;

  test.beforeAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${Q}';`);
    await q(`insert into public.products (id, name, brand_id, category, price, stock, is_visible)
             values ('${Q}','${Q}', (select id from public.brands limit 1), 'etc', 1000, 5, true);`);
    const res = await mkOrder(1);
    orderId = (res.json?.order?.id ?? res.json?.id) as string;
  });

  test.afterAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${Q}';`);
  });

  test('결제대기 주문에 cancel을 호출하면 원자적으로 취소 처리하고 재고를 복원한다', async () => {
    expect((await orderRow(orderId)).payment_status).toBe('결제대기'); // claim을 겪지 않았음을 전제
    expect(await stockOf(Q)).toBe(4);

    const res = await callApi('/api/payments/cancel', { orderId });
    expect(res.status).toBe(200);
    const row = await orderRow(orderId);
    expect(row.order_status).toBe('취소완료');
    expect(row.payment_status).toBe('결제취소');
    expect(await stockOf(Q)).toBe(5);
  });

  test('취소된 주문의 confirm은 409로 거부되고 토스를 호출하지 않는다', async () => {
    const res = await callApi('/api/payments/confirm', { paymentKey: TK_B, orderId, amount: 4000 });
    expect(res.status).toBe(409);
    expect(await stockOf(Q)).toBe(5);
  });

  test('cancel을 재호출해도 멱등하게 200이며 이중 복원되지 않는다', async () => {
    const res = await callApi('/api/payments/cancel', { orderId });
    expect(res.status).toBe(200);
    expect(await stockOf(Q)).toBe(5);
  });
});

// 상품 픽스처(R)를 쓰는 테스트가 이 describe에 1개뿐이라 fullyParallel 하에서도 beforeAll이
// 워커별로 중복 실행될 여지가 없다. (2026-07-13 team-lead 지적 대응: 원래 이 오버셀 테스트와
// cron 테스트가 한 describe에 같이 있었는데, 서로 다른 워커에 배정되면 각 워커가 beforeAll을
// 독립 실행해 같은 product id를 동시에 insert하려다 23505 duplicate key로 충돌했다(1회 flaky
// 실측). cron 테스트는 상품 픽스처가 전혀 필요 없으므로 아예 분리해 이 경합을 구조적으로 없앤다.)
test.describe('결제 라우트 — 오버셀 (독립 시나리오, 프리뷰 통합)', () => {
  const R = fixtureId('route_wave1_r1');
  const CUSTOMER = fixtureId('route_wave1_oversell');
  const mkOrder = (qty: number) =>
    callApi('/api/orders', {
      customerName: CUSTOMER,
      phone: '010-0000-0000',
      address: '테스트',
      items: [{ productId: R, quantity: qty }],
      paymentMethod: '신용카드',
    });

  test.beforeAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${R}';`);
    await q(`insert into public.products (id, name, brand_id, category, price, stock, is_visible)
             values ('${R}','${R}', (select id from public.brands limit 1), 'etc', 1000, 1, true);`);
  });

  test.afterAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${R}';`);
  });

  test('재고 1개에 동시 2주문이 들어오면 정확히 1건만 성공한다 (오버셀 차단)', async () => {
    const [c1, c2] = await Promise.all([mkOrder(1), mkOrder(1)]);
    const okCount = [c1, c2].filter((r) => [200, 201].includes(r.status)).length;
    const conflictCount = [c1, c2].filter((r) => r.status === 409).length;
    expect(okCount).toBe(1);
    expect(conflictCount).toBe(1);
    expect(await stockOf(R)).toBe(0);

    const winner = [c1, c2].find((r) => [200, 201].includes(r.status));
    const winnerId = winner?.json?.order?.id ?? winner?.json?.id;
    if (winnerId) {
      const cancelRes = await callApi('/api/payments/cancel', { orderId: winnerId });
      expect(cancelRes.status).toBe(200);
      expect(await stockOf(R)).toBe(1);
    }
  });
});

// DB 픽스처가 전혀 필요 없는 독립 테스트 — describe/beforeAll 없이 최상위에 둬 다른 시나리오와
// 어떤 공유 상태도 없다.
test('cron 시크릿 미설정 시 fail-closed로 500을 반환한다 (Bearer undefined 우회 차단)', async () => {
  const res = await fetch(BASE + '/api/cron/reclaim-stock', { headers: { Authorization: 'Bearer undefined' } });
  expect(res.status).toBe(500); // 401도 200도 아님 — 미설정을 인증 성공으로 오인하지 않음
});
