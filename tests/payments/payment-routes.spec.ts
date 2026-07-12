import { test, expect } from '@playwright/test';
import { q, stockOf, orderRow, supabaseEnvReady } from './helpers';

// 결제 라우트 통합 스펙 — 실제 프리뷰 배포(staging DB 연결) 대상 API 테스트. 브라우저 불필요.
// 승격 출처: wave1-preview-integration-test.mjs (PR#23 프리뷰에서 22 PASS 확인됨).
// PAYMENTS_PREVIEW_URL 미설정 시 skip — 토스 결제 라우트가 배포된 프리뷰가 있을 때만 의미있는 스펙이라
// 골든플로우처럼 상시 URL을 고정하지 않는다(그 프리뷰는 이미 소멸됨 — 회귀 시 재설정 필요).
const BASE = process.env.PAYMENTS_PREVIEW_URL ?? '';

test.skip(!supabaseEnvReady(), 'SUPABASE_URL/SUPABASE_ACCESS_TOKEN 미설정 — staging DB 스펙 skip');
test.skip(!BASE, 'PAYMENTS_PREVIEW_URL 미설정 — 결제 라우트가 배포된 프리뷰 URL이 없어 skip');

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

test.describe.serial('결제 라우트 — 주문 선점/취소/오버셀/cron (프리뷰 통합)', () => {
  const P = '__test_route_wave1_p1';
  const CUSTOMER = '__test_route_wave1';
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

  test('금액을 조작하면 토스 호출 전에 400으로 차단한다', async () => {
    const res = await callApi('/api/payments/confirm', { paymentKey: 'tk_route_a', orderId, amount: 99999 });
    expect(res.status).toBe(400);
    expect(await stockOf(P)).toBe(3);
  });

  test('불명 상태(TOSS_SECRET_KEY 미설정)에서는 502를 반환하고 재고를 복원하지 않는다', async () => {
    const res = await callApi('/api/payments/confirm', { paymentKey: 'tk_route_a', orderId, amount: 5000 });
    expect(res.status).toBe(502);
    const row = await orderRow(orderId);
    expect(row.payment_status).toBe('결제대기'); // 취소되지 않고 유지
    expect(await stockOf(P)).toBe(3); // 복원되지 않고 유지
  });

  test('cancel은 원자적으로 취소 처리하고 재고를 복원한다', async () => {
    const res = await callApi('/api/payments/cancel', { orderId });
    expect(res.status).toBe(200);
    const row = await orderRow(orderId);
    expect(row.order_status).toBe('취소완료');
    expect(row.payment_status).toBe('결제취소');
    expect(await stockOf(P)).toBe(5);
  });

  test('취소된 주문의 confirm은 409로 거부되고 토스를 호출하지 않는다', async () => {
    const res = await callApi('/api/payments/confirm', { paymentKey: 'tk_route_a', orderId, amount: 5000 });
    expect(res.status).toBe(409);
    expect(await stockOf(P)).toBe(5);
  });

  test('cancel을 재호출해도 멱등하게 200이며 이중 복원되지 않는다', async () => {
    const res = await callApi('/api/payments/cancel', { orderId });
    expect(res.status).toBe(200);
    expect(await stockOf(P)).toBe(5);
  });

  test('재고 1개에 동시 2주문이 들어오면 정확히 1건만 성공한다 (오버셀 차단)', async () => {
    await q(`update public.products set stock=1 where id='${P}';`);
    const [c1, c2] = await Promise.all([mkOrder(1), mkOrder(1)]);
    const okCount = [c1, c2].filter((r) => [200, 201].includes(r.status)).length;
    const conflictCount = [c1, c2].filter((r) => r.status === 409).length;
    expect(okCount).toBe(1);
    expect(conflictCount).toBe(1);
    expect(await stockOf(P)).toBe(0);

    const winner = [c1, c2].find((r) => [200, 201].includes(r.status));
    const winnerId = winner?.json?.order?.id ?? winner?.json?.id;
    if (winnerId) {
      const cancelRes = await callApi('/api/payments/cancel', { orderId: winnerId });
      expect(cancelRes.status).toBe(200);
      expect(await stockOf(P)).toBe(1);
    }
  });

  test('cron 시크릿 미설정 시 fail-closed로 500을 반환한다 (Bearer undefined 우회 차단)', async () => {
    const res = await fetch(BASE + '/api/cron/reclaim-stock', { headers: { Authorization: 'Bearer undefined' } });
    expect(res.status).toBe(500); // 401도 200도 아님 — 미설정을 인증 성공으로 오인하지 않음
  });
});
