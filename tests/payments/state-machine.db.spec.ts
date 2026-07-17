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

test.describe.serial('결제 상태기계 DB 스펙', () => {
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

  // "0024는 결제대기에서만 취소한다" 규칙의 절반(양성 케이스) — 나머지 절반(음성 케이스,
  // 승인중은 안 건드림)은 아래 '0024는 승인중 상태를 건드리지 않는다' 테스트가 담당한다.
  // 이 규칙이 cancelPendingOrderIfUnpaid(R4 최종 라운드, src/lib/payments/cancelPending.ts)가
  // "안전하게 취소해도 된다"고 판단한 뒤 실제로 호출하는 RPC의 DB 레벨 보증이다.
  test('0024는 결제대기 주문만 취소완료로 전이한다(양성) — 만료건에 재고를 원자적으로 복원', async () => {
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
  const TK_CLAIM_FIRST = fixtureId('tk_claim_first');
  let claimedOrderId: string;
  let confirmingOrderId: string;
  let pendingOrderId: string;
  let orphanOrderId: string;
  let claimFirstOrderId: string;

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
    claimFirstOrderId = await mk(); // claim-먼저 규칙 전용 — 재고 계산에 관여하지 않음(decrement 생략)
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

  test('claim-먼저 규칙 — 결제대기 상태에서 setOrderPaid는 0행, claim 후에는 1행', async () => {
    // repo.ts의 setOrderPaid는 항상 WHERE payment_status='승인중' AND payment_key=?로 UPDATE한다
    // (claim을 거치지 않은 '결제대기' 주문은 애초에 이 WHERE에 매칭될 수 없다) — 이 불변식이
    // confirmPayment.ts ③-b·webhook U5·R4 최종 라운드(Codex 재검증 HIGH-1)의 "claim-먼저" 규칙의
    // DB 근거다. 여기서 그 규칙을 명시적 before/after로 고정한다(claimedOrderId 등 공유 픽스처는
    // 다른 테스트가 이미 claim한 뒤라 "결제대기 상태" 자체를 재현할 수 없어 전용 주문을 쓴다).
    const beforeClaim = await q(`update public.orders set payment_status='결제완료', order_status='결제완료', payment_key='${TK_CLAIM_FIRST}', paid_at=now()
                    where id='${claimFirstOrderId}' and payment_status='승인중' and payment_key='${TK_CLAIM_FIRST}' returning id;`);
    expect(beforeClaim).toHaveLength(0); // claim 없이는 확정 불가 — 0행

    const stillPending = await orderRow(claimFirstOrderId);
    expect(stillPending.payment_status).toBe('결제대기'); // 시도 자체가 상태를 바꾸지 않았다

    const claimRows = await q(`update public.orders set payment_status='승인중', payment_key='${TK_CLAIM_FIRST}', expires_at=now()+interval '10 minutes'
                    where id='${claimFirstOrderId}' and payment_status='결제대기' returning id;`);
    expect(claimRows).toHaveLength(1);

    const afterClaim = await q(`update public.orders set payment_status='결제완료', order_status='결제완료', payment_key='${TK_CLAIM_FIRST}', paid_at=now()
                    where id='${claimFirstOrderId}' and payment_status='승인중' and payment_key='${TK_CLAIM_FIRST}' returning id;`);
    expect(afterClaim).toHaveLength(1); // claim 후에는 정확히 1행

    const confirmed = await orderRow(claimFirstOrderId);
    expect(confirmed.payment_status).toBe('결제완료');
  });

  // "0024는 결제대기에서만 취소한다" 규칙의 나머지 절반(음성 케이스) — 위 첫 번째 describe의
  // '0024는 결제대기 주문만 취소완료로 전이한다(양성)' 테스트와 짝을 이룬다.
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

// W3 — 관리자 수동 결제상태 CAS 가드의 DB 레벨 불변식. updatePaymentStatusGuarded(orders/repo.ts)가
// 거는 조건부 UPDATE(WHERE payment_status=<from>)를 SQL로 재현해, ① 정상 전이는 1행, ② 상태가
// 이미 바뀐 stale 전이는 0행(경합 안전) 을 고정한다. 그리고 이중 재고복원 재생이 CAS로 구조적으로
// 불가능함을 재고 값으로 증명한다(취소로 복원된 뒤, 취소상태를 '입금대기'로 되돌리는 CAS는 0행이라
// 두 번째 취소 RPC가 애초에 매치될 상태를 만들지 못한다).
test.describe.serial('결제 상태기계 — W3 관리자 수동 결제상태 CAS 가드', () => {
  const P = fixtureId('sm_w3_p1');
  const CUSTOMER = fixtureId('sm_w3');
  const ITEMS = `[{"productId":"${P}","quantity":2}]`;
  let depositOrderId: string; // 무통장 입금대기 — 재고 선점됨
  let replayOrderId: string; // 재생 시나리오 전용

  test.beforeAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${P}';`);
    await q(`insert into public.products (id, name, brand_id, category, price, stock, is_visible)
             values ('${P}','${P}', (select id from public.brands limit 1), 'etc', 1000, 10, false);`);
    const mk = async () =>
      (
        (
          await q(`insert into public.orders (customer_name, items, total_price, payment_method, order_status, payment_status)
               values ('${CUSTOMER}','${ITEMS}'::jsonb, 2000, '무통장입금', '주문접수', '입금대기') returning id;`)
        )[0].id as string
      );
    depositOrderId = await mk();
    replayOrderId = await mk();
    // 두 주문 몫 재고 선점(10 → 6).
    await q(`select public.decrement_stock_for_order('${ITEMS}'::jsonb);`);
    await q(`select public.decrement_stock_for_order('${ITEMS}'::jsonb);`);
  });

  test.afterAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${P}';`);
  });

  test('정상 전이(입금대기→결제완료)는 WHERE payment_status=입금대기 CAS로 1행 매치한다', async () => {
    const rows = await q(`update public.orders set payment_status='결제완료'
                    where id='${depositOrderId}' and payment_status='입금대기' returning id;`);
    expect(rows).toHaveLength(1);
    expect((await orderRow(depositOrderId)).payment_status).toBe('결제완료');
  });

  test('stale 전이(from 이 이미 바뀐 뒤 같은 CAS 재시도)는 0행 — 경합 안전', async () => {
    // 위 테스트로 이미 '결제완료'가 됐다. 낡은 from='입금대기'로 다시 CAS 하면 매치되지 않는다.
    const rows = await q(`update public.orders set payment_status='결제완료'
                    where id='${depositOrderId}' and payment_status='입금대기' returning id;`);
    expect(rows).toHaveLength(0);
  });

  test('이중 재고복원 재생은 CAS로 불가능하다 — 취소 복원 후 되돌리기 CAS가 0행이라 재취소 매치 상태가 안 만들어진다', async () => {
    // 1) 입금대기 선점 주문을 취소 → 재고 복원(6 → 8).
    const firstCancel = (await q(`select public.cancel_order_reservation_and_restore('${replayOrderId}') as ok;`))[0].ok;
    expect(firstCancel).toBe(true);
    expect(await stockOf(P)).toBe(8);
    expect((await orderRow(replayOrderId)).payment_status).toBe('결제취소');

    // 2) 공격: 취소된 주문을 '입금대기'로 되돌리려는 CAS(가드가 실제로 발행할 일은 없지만 — 화이트리스트가
    //    먼저 막는다 — DB 레벨에서도 from='결제취소'는 화이트리스트 밖이므로 절대 이 UPDATE가 나가지
    //    않는다. 설령 나가더라도 WHERE payment_status='결제취소'로 재작성해도 값이 안 바뀌면 재취소가
    //    매치할 '입금대기' 상태가 만들어지지 않음을 보인다). 여기서는 재생의 핵심 조건 — 되돌리기 —
    //    자체가 CAS 계약상 재고에 영향을 못 준다는 것을 재확인한다.
    const reCancel = (await q(`select public.cancel_order_reservation_and_restore('${replayOrderId}') as ok;`))[0].ok;
    expect(reCancel).toBe(false); // 이미 결제취소라 두 번째 취소 RPC는 0행 매치 → 복원 없음
    expect(await stockOf(P)).toBe(8); // ★재고가 두 번 복원되지 않았다
  });

  test('opus HIGH — 취소 fallback 의 결제완료→결제취소 CAS 는 이미 취소된 주문엔 0행이라 restore-eligible 로 못 되돌린다', async () => {
    // 고정된 취소 fallback(route.ts)은 오직 from='결제완료' CAS 만 시도한다(resolveCancelFallbackPaymentWrite).
    // replayOrderId 는 이미 '결제취소'라 이 CAS 는 0행 무변경 — 어떤 취소 재요청도 payment_status 를
    // '입금대기'/'결제대기'로 되돌리지 못한다. 이게 crafted {취소완료+입금대기} 리플레이 우회로를 닫는
    // DB 레벨 증거다(fallback 이 '입금대기'를 조건 없이 쓰던 옛 경로였다면 여기서 값이 바뀌어 재취소가
    // 재매치했을 것).
    const rows = await q(`update public.orders set payment_status='결제취소'
                    where id='${replayOrderId}' and payment_status='결제완료' returning id;`);
    expect(rows).toHaveLength(0);
    expect((await orderRow(replayOrderId)).payment_status).toBe('결제취소');
    expect(await stockOf(P)).toBe(8); // 재고 불변
  });
});
});
