import { test, expect } from '@playwright/test';
import { q, stockOf, orderRow, supabaseEnvReady } from './helpers';

// 결제 상태기계 DB 스펙 (staging Supabase, 0021~0026 계약) — 브라우저 불필요, API 테스트.
// 승격 출처: wave0-db-integration-test.mjs + w1-statemachine-db-test.mjs (둘 다 staging에서 PASS 확인됨).
// SUPABASE_URL / SUPABASE_ACCESS_TOKEN 미설정 시 skip — CI에서는 staging secret으로만 주입, prod 금지.

test.skip(!supabaseEnvReady(), 'SUPABASE_URL/SUPABASE_ACCESS_TOKEN 미설정 — staging DB 스펙 skip');

test.describe.serial('결제 상태기계 — 0021/0024 재고 원자성', () => {
  const P = '__test_sm_wave0_p1';
  const CUSTOMER = '__test_sm_wave0';
  const ITEMS = `[{"productId":"${P}","quantity":2}]`;
  let expiredOrderId: string;
  let payableOrderId: string;
  let claimTargetOrderId: string;

  test.beforeAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${P}';`);
    await q(`insert into public.products (id, name, brand_id, category, price, stock, is_visible)
             values ('${P}','${P}', (select id from public.brands limit 1), 'etc', 1000, 5, false);`);
    const mk = async (expiresSql: string) =>
      (
        (
          await q(`insert into public.orders (customer_name, items, total_price, payment_method, order_status, payment_status, expires_at)
               values ('${CUSTOMER}','${ITEMS}'::jsonb, 2000, '신용카드', '주문접수', '결제대기', ${expiresSql}) returning id;`)
        )[0].id as string
      );
    expiredOrderId = await mk(`now() - interval '1 minute'`); // 만료된 선점 — cancel 대상
    payableOrderId = await mk('null'); // 결제 확정 대상
    claimTargetOrderId = await mk(`now() - interval '1 minute'`); // claim 대상
  });

  test.afterAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${P}';`);
  });

  test('0021 decrement_stock_for_order가 재고를 정확히 차감한다', async () => {
    await q(`select public.decrement_stock_for_order('${ITEMS}'::jsonb);`);
    expect(await stockOf(P)).toBe(3);
  });

  test('0024가 만료된 결제대기 주문을 취소완료로 전이하며 재고를 원자적으로 복원한다', async () => {
    const ok = (await q(`select public.cancel_order_reservation_and_restore('${expiredOrderId}') as ok;`))[0].ok;
    expect(ok).toBe(true);
    expect(await stockOf(P)).toBe(5);
    const row = await orderRow(expiredOrderId);
    expect(row.order_status).toBe('취소완료');
    expect(row.payment_status).toBe('결제취소');
  });

  test('0024를 재호출해도 이중 복원되지 않는다 (멱등)', async () => {
    const ok = (await q(`select public.cancel_order_reservation_and_restore('${expiredOrderId}') as ok;`))[0].ok;
    expect(ok).toBe(false);
    expect(await stockOf(P)).toBe(5);
  });

  test('setOrderPaid 조건부 UPDATE는 결제대기 상태에서만 성공하고 재확정은 멱등하게 무시된다', async () => {
    const firstRows = await q(`update public.orders set payment_status='결제완료', order_status='결제완료', payment_key='__test_tk_1', paid_at=now()
                    where id='${payableOrderId}' and payment_status='결제대기' returning id;`);
    expect(firstRows).toHaveLength(1);

    const dupRows = await q(`update public.orders set payment_status='결제완료', payment_key='__test_tk_dup'
                    where id='${payableOrderId}' and payment_status='결제대기' returning id;`);
    expect(dupRows).toHaveLength(0);

    const row = await orderRow(payableOrderId);
    expect(row.payment_key).toBe('__test_tk_1');
  });

  test('결제완료 주문에 0024를 호출해도 아무 효과가 없다 (확정건 보호)', async () => {
    const ok = (await q(`select public.cancel_order_reservation_and_restore('${payableOrderId}') as ok;`))[0].ok;
    expect(ok).toBe(false);
    expect(await stockOf(P)).toBe(5);
  });

  test('claim으로 expires_at을 연장하면 만료 스캔 대상에서 제외된다', async () => {
    const claimRows = await q(`update public.orders set expires_at = now() + interval '10 minutes'
                    where id='${claimTargetOrderId}' and payment_status='결제대기' returning id;`);
    expect(claimRows).toHaveLength(1);

    const expiredScan = await q(`select id from public.orders where payment_status='결제대기' and expires_at is not null and expires_at < now() and customer_name='${CUSTOMER}';`);
    expect(expiredScan).toHaveLength(0);

    const cancelledClaimAttempt = await q(`update public.orders set expires_at = now() + interval '10 minutes'
                    where id='${expiredOrderId}' and payment_status='결제대기' returning id;`);
    expect(cancelledClaimAttempt).toHaveLength(0);
  });

  test('payment_key 부분 unique 제약이 중복 키를 거부한다', async () => {
    let uniqueViolation = false;
    try {
      await q(`update public.orders set payment_key='__test_tk_1' where id='${claimTargetOrderId}';`);
    } catch (e) {
      uniqueViolation = /duplicate key|unique/i.test(String((e as Error).message));
    }
    expect(uniqueViolation).toBe(true);
  });
});

test.describe.serial('결제 상태기계 — claim 배타 전이 / 0024·0026 상호배타', () => {
  const P = '__test_sm_w1sm_p1';
  const CUSTOMER = '__test_sm_w1sm';
  const ITEMS = `[{"productId":"${P}","quantity":2}]`;
  let claimedOrderId: string;
  let confirmingOrderId: string;
  let pendingOrderId: string;
  let orphanOrderId: string;

  test.beforeAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${P}';`);
    await q(`insert into public.products (id, name, brand_id, category, price, stock, is_visible)
             values ('${P}','${P}', (select id from public.brands limit 1), 'etc', 1000, 9, false);`);
    const mk = async () =>
      (
        (
          await q(`insert into public.orders (customer_name, items, total_price, payment_method, order_status, payment_status, expires_at)
               values ('${CUSTOMER}','${ITEMS}'::jsonb, 2000, '신용카드', '주문접수', '결제대기', now() + interval '10 minutes') returning id;`)
        )[0].id as string
      );
    claimedOrderId = await mk();
    confirmingOrderId = await mk();
    pendingOrderId = await mk();
    await q(`select public.decrement_stock_for_order('${ITEMS}'::jsonb);`); // claimedOrderId 몫 (stock 9→7)
  });

  test.afterAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${P}';`);
  });

  test('claim은 결제대기 상태에서만 배타적으로 승인중 전이시킨다', async () => {
    const firstClaim = await q(`update public.orders set payment_status='승인중', payment_key='__test_tk_claim', expires_at=now()+interval '10 minutes' where id='${claimedOrderId}' and payment_status='결제대기' returning id;`);
    expect(firstClaim).toHaveLength(1);

    const secondClaim = await q(`update public.orders set payment_status='승인중', payment_key='__test_tk_other' where id='${claimedOrderId}' and payment_status='결제대기' returning id;`);
    expect(secondClaim).toHaveLength(0);
  });

  test('0024는 승인중 상태를 건드리지 않는다 (cancel/cron으로부터 보호)', async () => {
    const ok = (await q(`select public.cancel_order_reservation_and_restore('${claimedOrderId}') as ok;`))[0].ok;
    expect(ok).toBe(false);
    expect(await stockOf(P)).toBe(7);
  });

  test('setOrderPaid는 승인중+payment_key 일치 조건에서만 결제완료로 전이한다', async () => {
    const wrongKey = await q(`update public.orders set payment_status='결제완료', order_status='결제완료', paid_at=now() where id='${claimedOrderId}' and payment_status='승인중' and payment_key='__test_tk_wrong' returning id;`);
    expect(wrongKey).toHaveLength(0);

    const rightKey = await q(`update public.orders set payment_status='결제완료', order_status='결제완료', paid_at=now() where id='${claimedOrderId}' and payment_status='승인중' and payment_key='__test_tk_claim' returning id;`);
    expect(rightKey).toHaveLength(1);

    const reconfirm = await q(`update public.orders set payment_status='결제완료' where id='${claimedOrderId}' and payment_status='승인중' and payment_key='__test_tk_claim' returning id;`);
    expect(reconfirm).toHaveLength(0);
  });

  test('0026은 결제완료 주문을 보호하고, 승인중 주문은 해제·재고를 복원한다', async () => {
    const confirmedOk = (await q(`select public.cancel_confirming_and_restore('${claimedOrderId}') as ok;`))[0].ok;
    expect(confirmedOk).toBe(false);

    await q(`select public.decrement_stock_for_order('${ITEMS}'::jsonb);`); // confirmingOrderId 몫 (7→5)
    await q(`update public.orders set payment_status='승인중', payment_key='__test_tk_confirming' where id='${confirmingOrderId}' and payment_status='결제대기';`);

    const confirmingOk = (await q(`select public.cancel_confirming_and_restore('${confirmingOrderId}') as ok;`))[0].ok;
    expect(confirmingOk).toBe(true);
    expect(await stockOf(P)).toBe(7);

    const row = await orderRow(confirmingOrderId);
    expect(row.order_status).toBe('취소완료');
    expect(row.payment_status).toBe('결제취소');

    const secondCall = (await q(`select public.cancel_confirming_and_restore('${confirmingOrderId}') as ok;`))[0].ok;
    expect(secondCall).toBe(false);
    expect(await stockOf(P)).toBe(7);
  });

  test('0026은 결제대기 주문을 건드리지 않는다 (0024와 상호배타)', async () => {
    const ok = (await q(`select public.cancel_confirming_and_restore('${pendingOrderId}') as ok;`))[0].ok;
    expect(ok).toBe(false);
  });

  test('고아 승인중 주문은 dead-letter 마킹 후 재시도 스캔에서 제외된다', async () => {
    orphanOrderId = pendingOrderId;
    await q(`update public.orders set payment_status='승인중', payment_key='__test_tk_orphan', expires_at=now()-interval '1 minute' where id='${orphanOrderId}';`);

    const orphanScan = await q(`select id from public.orders where payment_status='승인중' and expires_at is not null and expires_at<now() and reclaim_dead=false and customer_name='${CUSTOMER}';`);
    expect(orphanScan).toHaveLength(1);
    expect(orphanScan[0].id).toBe(orphanOrderId);

    await q(`update public.orders set reclaim_dead=true, reclaim_attempts=5, last_reclaim_error='test' where id='${orphanOrderId}';`);

    const afterDeadMark = await q(`select id from public.orders where payment_status='승인중' and expires_at<now() and reclaim_dead=false and customer_name='${CUSTOMER}';`);
    expect(afterDeadMark).toHaveLength(0);

    const pendingScan = await q(`select id from public.orders where payment_status='결제대기' and expires_at is not null and expires_at<now() and reclaim_dead=false and customer_name='${CUSTOMER}';`);
    expect(pendingScan).toHaveLength(0);
  });
});
