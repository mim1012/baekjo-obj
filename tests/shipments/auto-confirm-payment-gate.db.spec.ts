import { test, expect } from '@playwright/test';
import { q, supabaseEnvReady, fixtureId, sweepStaleFixtures } from '../payments/helpers';

// 자동 구매확정 크론 결제 게이트 DB 스펙 (staging Supabase) — 브라우저 불필요, SQL 계약 테스트.
// #127 opus 관찰: 수동 확정은 decideShipmentConfirm('blocked-unpaid')가 막지만, 크론의 set-based
// UPDATE는 orders.payment_status를 보지 않아 미결제 주문도 배송완료 7일 뒤 자동 '구매확정'됐다.
// 0044가 orders 조인 RPC(auto_confirm_paid_delivered_shipments)로 봉합 — 그 조인 UPDATE의 SQL 계약을
// 여기서 그대로 재현해 잠근다(confirm-guard.db.spec.ts와 같은 사상: 함수 배포 여부와 무관하게
// PR CI에서도 계약 자체를 검증한다).
// SUPABASE_URL / SUPABASE_ACCESS_TOKEN 미설정 시 skip — CI에서는 staging secret으로만 주입, prod 금지.

test.skip(!supabaseEnvReady(), 'SUPABASE_URL/SUPABASE_ACCESS_TOKEN 미설정 — staging DB 스펙 skip');

if (supabaseEnvReady()) void sweepStaleFixtures().catch(() => {});

test.describe.serial('자동 구매확정 결제 게이트 DB 스펙', () => {
  const P = fixtureId('acpg_p1');
  const CUSTOMER = fixtureId('acpg');
  const ITEMS = `[{"productId":"${P}","quantity":1}]`;
  let paidOrderId: string;
  let unpaidOrderId: string;

  const B_PAID_OLD = fixtureId('bPaidOld'); // 결제완료 + 8일 전 배송완료 → 확정돼야 함
  const B_PAID_RECENT = fixtureId('bPaidRecent'); // 결제완료 + 방금 배송완료 → cutoff 미달, 제외
  const B_PAID_DONE = fixtureId('bPaidDone'); // 결제완료 + 이미 구매확정 → 멱등 제외
  const B_UNPAID_OLD = fixtureId('bUnpaidOld'); // 미결제 + 8일 전 배송완료 → ⭐게이트가 막아야 함
  const B_OLDBUG = fixtureId('bOldBug'); // 대조군 — 조인 없는 구 UPDATE가 확정시키는 미결제 행

  // 0044 RPC 본문과 동일한 조인 UPDATE (cutoff만 인라인). 마지막 order_id 필터는 스펙 격리용
  // (다른 스펙/실데이터 오염 방지) — RPC 본문에는 없다.
  const gatedAutoConfirmSql = (cutoffSql: string) => `
    update public.shipments s
       set delivery_status='구매확정', confirmed_at=now()
      from public.orders o
     where o.id = s.order_id
       and o.payment_status = '결제완료'
       and s.delivery_status = '배송완료'
       and s.delivered_at is not null
       and s.delivered_at < ${cutoffSql}
       and s.order_id in ('${paidOrderId}','${unpaidOrderId}')
    returning s.order_id, s.brand_id;`;

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
             values ('${paidOrderId}','${B_PAID_OLD}','배송완료', now() - interval '8 days'),
                    ('${paidOrderId}','${B_PAID_RECENT}','배송완료', now());`);
    await q(`insert into public.shipments (order_id, brand_id, delivery_status, delivered_at, confirmed_at)
             values ('${paidOrderId}','${B_PAID_DONE}','구매확정', now() - interval '8 days', now());`);
    await q(`insert into public.shipments (order_id, brand_id, delivery_status, delivered_at)
             values ('${unpaidOrderId}','${B_UNPAID_OLD}','배송완료', now() - interval '8 days'),
                    ('${unpaidOrderId}','${B_OLDBUG}','배송완료', now() - interval '8 days');`);
  });

  test.afterAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${P}';`);
  });

  // ── 대조군: 조인 없는 (구) set-based UPDATE = 고친 버그 재현 ──

  test('대조군 — 결제 게이트 없는 구 UPDATE는 미결제 주문 송장도 자동확정한다(=고친 버그)', async () => {
    const rows = await q(`update public.shipments set delivery_status='구매확정', confirmed_at=now()
                    where order_id='${unpaidOrderId}' and brand_id='${B_OLDBUG}'
                      and delivery_status='배송완료' and delivered_at is not null
                      and delivered_at < now() - interval '7 days' returning id;`);
    expect(rows).toHaveLength(1); // 결제상태를 안 보면 입금대기 주문도 확정된다

    // 원복 — 이후 게이트 스펙이 이 행을 미결제 상태에서 다시 관측하도록.
    await q(`update public.shipments set delivery_status='배송완료', confirmed_at=null
                    where order_id='${unpaidOrderId}' and brand_id='${B_OLDBUG}';`);
  });

  // ── 새 계약: orders 조인 게이트 (0044 RPC 본문 SQL) ──

  test('게이트 UPDATE는 결제완료 주문의 오래된 배송완료 송장만 확정한다 — 미결제·최근·기확정 전부 제외', async () => {
    const rows = await q(gatedAutoConfirmSql(`now() - interval '7 days'`));

    // 확정된 것은 정확히 1행: 결제완료 + 8일 전 배송완료.
    expect(rows).toHaveLength(1);
    expect(rows[0].order_id).toBe(paidOrderId);
    expect(rows[0].brand_id).toBe(B_PAID_OLD);

    // ⭐ 핵심 회귀: 미결제(입금대기) 주문의 8일 전 배송완료 송장은 그대로다.
    const unpaid = await q(`select delivery_status, confirmed_at from public.shipments
                    where order_id='${unpaidOrderId}' and brand_id='${B_UNPAID_OLD}';`);
    expect(unpaid[0].delivery_status).toBe('배송완료');
    expect(unpaid[0].confirmed_at).toBeNull();

    // cutoff 미달(방금 배송완료)도 그대로.
    const recent = await q(`select delivery_status from public.shipments
                    where order_id='${paidOrderId}' and brand_id='${B_PAID_RECENT}';`);
    expect(recent[0].delivery_status).toBe('배송완료');
  });

  test('게이트 UPDATE는 멱등이다 — 재실행 시 0행(기확정 행은 WHERE에 안 걸림)', async () => {
    const rows = await q(gatedAutoConfirmSql(`now() - interval '7 days'`));
    expect(rows).toHaveLength(0);
  });

  test('미결제 주문이 이후 결제완료가 되면 다음 크론 주기에 정상 확정된다', async () => {
    await q(`update public.orders set payment_status='결제완료' where id='${unpaidOrderId}';`);
    const rows = await q(gatedAutoConfirmSql(`now() - interval '7 days'`));
    expect(rows).toHaveLength(2); // B_UNPAID_OLD + (원복해둔) B_OLDBUG — 둘 다 이제 결제완료 주문
    const brands = rows.map((r) => String(r.brand_id)).sort();
    expect(brands).toEqual([B_OLDBUG, B_UNPAID_OLD].sort());
  });
});
