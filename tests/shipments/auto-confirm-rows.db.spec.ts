import { test, expect } from '@playwright/test';
import { q, supabaseEnvReady, fixtureId, sweepStaleFixtures } from '../payments/helpers';

// 0179 auto_confirm_paid_delivered_shipments_rows RPC DB 스펙 (staging Supabase) — 실제 함수를 호출한다.
// 0044 count 판과 선택·갱신 로직이 같고(결제완료 + 배송완료 + cutoff 경과) 확정된 행을 돌려주는지,
// 잠금(anon 차단 / service_role 허용)이 0044와 같은지 검증한다.
// 격리: 픽스처 delivered_at을 2000년으로 두고 cutoff를 2000-02-01로 잡아 실데이터를 건드리지 않는다.
// SUPABASE_URL / SUPABASE_ACCESS_TOKEN 미설정 시 skip — CI에서는 staging secret으로만 주입, prod 금지.

test.skip(!supabaseEnvReady(), 'SUPABASE_URL/SUPABASE_ACCESS_TOKEN 미설정 — staging DB 스펙 skip');

if (supabaseEnvReady()) void sweepStaleFixtures().catch(() => {});

test.describe.serial('자동 구매확정 행 반환 RPC DB 스펙 (0179)', () => {
  test.describe.configure({ timeout: 180_000 });

  const P = fixtureId('acrows_p1');
  const CUSTOMER = fixtureId('acrows');
  const ITEMS = `[{"productId":"${P}","quantity":1}]`;
  const CUTOFF = `'2000-02-01T00:00:00Z'::timestamptz`;
  const CONFIRMED_AT = `'2026-10-14T03:00:00Z'::timestamptz`;
  let paidOrderId: string;
  let unpaidOrderId: string;

  const B_OLD = fixtureId('rOld'); // 결제완료 + cutoff 이전 배송완료 → 확정
  const B_RECENT = fixtureId('rRecent'); // 결제완료 + cutoff 이후 배송완료 → 제외
  const B_DONE = fixtureId('rDone'); // 결제완료 + 이미 구매확정 → 제외
  const B_UNPAID = fixtureId('rUnpaid'); // 미결제 + cutoff 이전 → 제외(결제 게이트)

  const callRpc = () =>
    q(`select order_id, brand_id, confirmed_at from public.auto_confirm_paid_delivered_shipments_rows(${CUTOFF}, ${CONFIRMED_AT});`);

  test.beforeAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${P}';`);
    await q(`insert into public.products (id, name, brand_id, category, price, stock, is_visible)
             values ('${P}','${P}', (select id from public.brands limit 1), 'etc', 1000, 5, false);`);
    const mk = async (paymentStatus: string) =>
      (
        (
          await q(`insert into public.orders (customer_name, items, total_price, payment_method, order_status, payment_status)
               values ('${CUSTOMER}','${ITEMS}'::jsonb, 1000, '무통장입금', '주문접수', '${paymentStatus}') returning id;`)
        )[0].id as string
      );
    paidOrderId = await mk('결제완료');
    unpaidOrderId = await mk('입금대기');
    await q(`insert into public.shipments (order_id, brand_id, delivery_status, delivered_at)
             values ('${paidOrderId}','${B_OLD}','배송완료','2000-01-01T00:00:00Z'),
                    ('${paidOrderId}','${B_RECENT}','배송완료','2000-06-01T00:00:00Z'),
                    ('${unpaidOrderId}','${B_UNPAID}','배송완료','2000-01-01T00:00:00Z');`);
    await q(`insert into public.shipments (order_id, brand_id, delivery_status, delivered_at, confirmed_at)
             values ('${paidOrderId}','${B_DONE}','구매확정','2000-01-01T00:00:00Z','2000-01-10T00:00:00Z');`);
  });

  test.afterAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${P}';`);
  });

  test('결제완료 + cutoff 이전 배송완료 송장만 확정하고 그 행을 반환한다', async () => {
    const rows = await callRpc();
    expect(rows).toHaveLength(1);
    expect(rows[0].order_id).toBe(paidOrderId);
    expect(rows[0].brand_id).toBe(B_OLD);
    expect(new Date(String(rows[0].confirmed_at)).toISOString()).toBe('2026-10-14T03:00:00.000Z');

    const stored = await q(`select brand_id, delivery_status, confirmed_at from public.shipments
                    where order_id in ('${paidOrderId}','${unpaidOrderId}') order by brand_id;`);
    const byBrand = Object.fromEntries(stored.map((r) => [String(r.brand_id), String(r.delivery_status)]));
    expect(byBrand[B_OLD]).toBe('구매확정');
    expect(byBrand[B_RECENT]).toBe('배송완료'); // cutoff 미달
    expect(byBrand[B_DONE]).toBe('구매확정'); // 기확정 유지
    expect(byBrand[B_UNPAID]).toBe('배송완료'); // 결제 게이트
  });

  test('멱등 — 재호출은 0행이라 알림 중복 발송이 없다', async () => {
    expect(await callRpc()).toHaveLength(0);
  });

  test('0044 count 판은 그대로 존재하고 integer를 반환한다(하위 호환)', async () => {
    const rows = await q(`select public.auto_confirm_paid_delivered_shipments(${CUTOFF}, ${CONFIRMED_AT}) as n;`);
    expect(Number(rows[0].n)).toBe(0);
  });

  test('실행 권한 — anon/PUBLIC 차단, service_role 허용', async () => {
    const rows = await q(`select
      has_function_privilege('anon', 'public.auto_confirm_paid_delivered_shipments_rows(timestamptz,timestamptz)', 'execute') as anon_ok,
      has_function_privilege('service_role', 'public.auto_confirm_paid_delivered_shipments_rows(timestamptz,timestamptz)', 'execute') as service_ok;`);
    expect(rows[0].anon_ok).toBe(false);
    expect(rows[0].service_ok).toBe(true);
  });
});