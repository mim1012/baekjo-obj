import { test, expect } from '@playwright/test';
import { q, stockOf, orderRow, supabaseEnvReady, fixtureId, sweepStaleFixtures } from './helpers';

// 결제 상태기계 DB 스펙 (staging Supabase, 0021~0028 계약) — 브라우저 불필요, API 테스트.
// 승격 출처: wave0-db-integration-test.mjs + w1-statemachine-db-test.mjs (둘 다 staging에서 PASS 확인됨).
// SUPABASE_URL / SUPABASE_ACCESS_TOKEN 미설정 시 skip — CI에서는 staging secret으로만 주입, prod 금지.

test.skip(!supabaseEnvReady(), 'SUPABASE_URL/SUPABASE_ACCESS_TOKEN 미설정 — staging DB 스펙 skip');

// 모든 픽스처 id/customer_name은 fixtureId()로 실행 스코프 고유값을 쓴다(helpers.ts 참고) — 고정
// ID를 공유 staging DB에 쓰면 로컬↔CI 또는 여러 PR의 CI가 겹칠 때 서로의 재고/주문을 지우거나
// 소진시켜 실패한다(payments-db-spec CI 사고 실측: INSUFFICIENT_STOCK). 과거 실행 잔여물은
// sweepStaleFixtures()가 1시간 시간 게이트로 안전하게 청소한다(현재 동시 실행에는 무해).
// ★supabaseEnvReady() 가드 필수 — playwright는 test.skip 여부와 무관하게 스펙 파일을 import해
// 최상위 코드를 실행한다. 가드가 없으면 SUPABASE_URL 미설정 환경(로컬 등)에서도 빈 프로젝트 ref로
// api.supabase.com에 실제 네트워크 요청이 나간다.
if (supabaseEnvReady()) void sweepStaleFixtures().catch(() => {});

test.describe.serial('결제 상태기계 — 0021/0024 재고 원자성', () => {
  const P = fixtureId('sm_wave0_p1');
  const CUSTOMER = fixtureId('sm_wave0');
  const ITEMS = `[{"productId":"${P}","quantity":2}]`;
  // payment_key도 0022 부분 unique 제약 대상이라 실행 스코프 고유값을 쓴다 — 안 그러면 동시
  // 실행끼리 서로 다른 주문에 같은 키를 UPDATE하려다 무관한 unique 충돌이 날 수 있다.
  const TK_1 = fixtureId('tk_1');
  const TK_DUP = fixtureId('tk_dup');
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
    const firstRows = await q(`update public.orders set payment_status='결제완료', order_status='결제완료', payment_key='${TK_1}', paid_at=now()
                    where id='${payableOrderId}' and payment_status='결제대기' returning id;`);
    expect(firstRows).toHaveLength(1);

    const dupRows = await q(`update public.orders set payment_status='결제완료', payment_key='${TK_DUP}'
                    where id='${payableOrderId}' and payment_status='결제대기' returning id;`);
    expect(dupRows).toHaveLength(0);

    const row = await orderRow(payableOrderId);
    expect(row.payment_key).toBe(TK_1);
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
      await q(`update public.orders set payment_key='${TK_1}' where id='${claimTargetOrderId}';`);
    } catch (e) {
      uniqueViolation = /duplicate key|unique/i.test(String((e as Error).message));
    }
    expect(uniqueViolation).toBe(true);
  });
});

test.describe.serial('결제 상태기계 — claim 배타 전이 / 0024·0028 상호배타', () => {
  const P = fixtureId('sm_w1sm_p1');
  const CUSTOMER = fixtureId('sm_w1sm');
  const ITEMS = `[{"productId":"${P}","quantity":2}]`;
  const TK_CLAIM = fixtureId('tk_claim');
  const TK_OTHER = fixtureId('tk_other');
  const TK_WRONG = fixtureId('tk_wrong');
  const TK_CONFIRMING = fixtureId('tk_confirming');
  const TK_WRONG_KEY = fixtureId('tk_wrong_key');
  const TK_IRRELEVANT = fixtureId('tk_irrelevant');
  const TK_ORPHAN = fixtureId('tk_orphan');
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
    const firstClaim = await q(`update public.orders set payment_status='승인중', payment_key='${TK_CLAIM}', expires_at=now()+interval '10 minutes' where id='${claimedOrderId}' and payment_status='결제대기' returning id;`);
    expect(firstClaim).toHaveLength(1);

    const secondClaim = await q(`update public.orders set payment_status='승인중', payment_key='${TK_OTHER}' where id='${claimedOrderId}' and payment_status='결제대기' returning id;`);
    expect(secondClaim).toHaveLength(0);
  });

  test('0024는 승인중 상태를 건드리지 않는다 (cancel/cron으로부터 보호)', async () => {
    const ok = (await q(`select public.cancel_order_reservation_and_restore('${claimedOrderId}') as ok;`))[0].ok;
    expect(ok).toBe(false);
    expect(await stockOf(P)).toBe(7);
  });

  test('setOrderPaid는 승인중+payment_key 일치 조건에서만 결제완료로 전이한다', async () => {
    const wrongKey = await q(`update public.orders set payment_status='결제완료', order_status='결제완료', paid_at=now() where id='${claimedOrderId}' and payment_status='승인중' and payment_key='${TK_WRONG}' returning id;`);
    expect(wrongKey).toHaveLength(0);

    const rightKey = await q(`update public.orders set payment_status='결제완료', order_status='결제완료', paid_at=now() where id='${claimedOrderId}' and payment_status='승인중' and payment_key='${TK_CLAIM}' returning id;`);
    expect(rightKey).toHaveLength(1);

    const reconfirm = await q(`update public.orders set payment_status='결제완료' where id='${claimedOrderId}' and payment_status='승인중' and payment_key='${TK_CLAIM}' returning id;`);
    expect(reconfirm).toHaveLength(0);
  });

  test('0028은 결제완료 주문을 보호하고, payment_key가 일치해야만 승인중 주문을 해제·재고를 복원한다', async () => {
    // 0028: cancel_confirming_and_restore(uuid, text) — payment_key 바인딩 추가(codex HIGH 지적
    // 방어: 실행기가 orderId만으로 복원 RPC를 돌리면 경합 중 다른 paymentKey로 새 claim이 이미
    // 발급된 주문을 옛 취소 신호가 잘못 복원시킬 수 있었다).
    const confirmedOk = (await q(`select public.cancel_confirming_and_restore('${claimedOrderId}', '${TK_CLAIM}') as ok;`))[0].ok;
    expect(confirmedOk).toBe(false);

    await q(`select public.decrement_stock_for_order('${ITEMS}'::jsonb);`); // confirmingOrderId 몫 (7→5)
    await q(`update public.orders set payment_status='승인중', payment_key='${TK_CONFIRMING}' where id='${confirmingOrderId}' and payment_status='결제대기';`);

    // 키 불일치 — payment_status='승인중'이어도 payment_key가 다르면 복원되지 않는다(이번 라운드의
    // 핵심 회귀 방어). 재고·상태 둘 다 그대로여야 한다.
    const wrongKeyOk = (await q(`select public.cancel_confirming_and_restore('${confirmingOrderId}', '${TK_WRONG_KEY}') as ok;`))[0].ok;
    expect(wrongKeyOk).toBe(false);
    expect(await stockOf(P)).toBe(5);
    const stillConfirming = await orderRow(confirmingOrderId);
    expect(stillConfirming.payment_status).toBe('승인중');

    const confirmingOk = (await q(`select public.cancel_confirming_and_restore('${confirmingOrderId}', '${TK_CONFIRMING}') as ok;`))[0].ok;
    expect(confirmingOk).toBe(true);
    expect(await stockOf(P)).toBe(7);

    const row = await orderRow(confirmingOrderId);
    expect(row.order_status).toBe('취소완료');
    expect(row.payment_status).toBe('결제취소');

    const secondCall = (await q(`select public.cancel_confirming_and_restore('${confirmingOrderId}', '${TK_CONFIRMING}') as ok;`))[0].ok;
    expect(secondCall).toBe(false);
    expect(await stockOf(P)).toBe(7);
  });

  test('0028은 결제대기 주문을 건드리지 않는다 (0024와 상호배타)', async () => {
    const ok = (await q(`select public.cancel_confirming_and_restore('${pendingOrderId}', '${TK_IRRELEVANT}') as ok;`))[0].ok;
    expect(ok).toBe(false);
  });

  test('고아 승인중 주문은 dead-letter 마킹 후 재시도 스캔에서 제외된다', async () => {
    orphanOrderId = pendingOrderId;
    await q(`update public.orders set payment_status='승인중', payment_key='${TK_ORPHAN}', expires_at=now()-interval '1 minute' where id='${orphanOrderId}';`);

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
