import { test, expect } from '@playwright/test';
import { q, supabaseEnvReady, fixtureId, sweepStaleFixtures } from '../payments/helpers';

// 구매확정 가드 DB 스펙 (staging Supabase, 0034/0041 shipments 계약) — 브라우저 불필요, SQL 계약 테스트.
// W4: (1) '구매확정' 종결 행의 관리자 후퇴를 경합 안전(confirmed_at IS NULL 조건부 UPDATE)하게 막고,
//     (2) 미결제 주문의 구매확정 차단은 DB가 아니라 앱 레이어(decideShipmentConfirm) 책임임을 못박는다.
// updateShipmentUnlessConfirmed / confirmShipmentIfDelivered(repo.ts)가 실제로 실행하는 SQL을 그대로
// 재현해 그 계약을 잠근다(payments/state-machine.db.spec.ts와 같은 사상).
// SUPABASE_URL / SUPABASE_ACCESS_TOKEN 미설정 시 skip — CI에서는 staging secret으로만 주입, prod 금지.

test.skip(!supabaseEnvReady(), 'SUPABASE_URL/SUPABASE_ACCESS_TOKEN 미설정 — staging DB 스펙 skip');

if (supabaseEnvReady()) void sweepStaleFixtures().catch(() => {});

test.describe.serial('구매확정 가드 DB 스펙', () => {
  const P = fixtureId('cg_p1');
  const CUSTOMER = fixtureId('cg');
  const ITEMS = `[{"productId":"${P}","quantity":1}]`;
  let paidOrderId: string;
  let unpaidOrderId: string;

  // 브랜드 스냅샷 id는 text(FK 없음, 0034) — 실행 스코프 고유값으로 격리한다.
  const B_LOCKED = fixtureId('bLocked'); // 구매확정 종결 — 가드로 보호되는 행
  const B_OLDBUG = fixtureId('bOldBug'); // 구매확정 종결 — 가드 없는(구) UPDATE가 후퇴시키는 행(대조군)
  const B_FWD = fixtureId('bFwd'); // 배송중 — 정상 전방 전이 대상
  const B_UNPAID = fixtureId('bUnpaid'); // 미결제 주문의 배송완료 송장

  test.beforeAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${P}';`);
    await q(`insert into public.products (id, name, brand_id, category, price, stock, is_visible)
             values ('${P}','${P}', (select id from public.brands limit 1), 'etc', 1000, 5, false);`);
    const mk = async (paymentStatus: string) =>
      (
        (
          await q(`insert into public.orders (customer_name, items, total_price, payment_method, order_status, payment_status)
               values ('${CUSTOMER}','${ITEMS}'::jsonb, 1000, '신용카드', '주문접수', '${paymentStatus}') returning id;`)
        )[0].id as string
      );
    paidOrderId = await mk('결제완료');
    unpaidOrderId = await mk('결제대기');

    // 종결(구매확정) 행 2개 + 배송중 행 1개 (결제완료 주문) / 미결제 주문의 배송완료 행 1개.
    await q(`insert into public.shipments (order_id, brand_id, delivery_status, delivered_at, confirmed_at)
             values ('${paidOrderId}','${B_LOCKED}','구매확정', now(), now()),
                    ('${paidOrderId}','${B_OLDBUG}','구매확정', now(), now());`);
    await q(`insert into public.shipments (order_id, brand_id, delivery_status, shipped_at)
             values ('${paidOrderId}','${B_FWD}','배송중', now());`);
    await q(`insert into public.shipments (order_id, brand_id, delivery_status, delivered_at)
             values ('${unpaidOrderId}','${B_UNPAID}','배송완료', now());`);
  });

  test.afterAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${P}';`);
  });

  // ── Claim 1: 관리자 후퇴 가드 (updateShipmentUnlessConfirmed의 조건부 UPDATE 계약) ──

  test('가드 UPDATE(confirmed_at IS NULL)는 구매확정 행을 후퇴시키지 못한다 — 0행 + confirmed_at 불변', async () => {
    const rows = await q(`update public.shipments set delivery_status='배송중'
                    where order_id='${paidOrderId}' and brand_id='${B_LOCKED}' and confirmed_at is null returning id;`);
    expect(rows).toHaveLength(0); // 종결 행이라 매치 0

    const after = await q(`select delivery_status, confirmed_at from public.shipments
                    where order_id='${paidOrderId}' and brand_id='${B_LOCKED}';`);
    expect(after[0].delivery_status).toBe('구매확정'); // 상태 그대로
    expect(after[0].confirmed_at).not.toBeNull(); // confirmed_at 보존
  });

  test('대조군 — 가드 없는 (구) 무조건 UPDATE는 구매확정 행을 배송중으로 후퇴시킨다(=고친 버그)', async () => {
    // 이 스펙이 잠그는 회귀: confirmed_at은 그대로인데 delivery_status만 후퇴 → 모순 데이터.
    const rows = await q(`update public.shipments set delivery_status='배송중'
                    where order_id='${paidOrderId}' and brand_id='${B_OLDBUG}' returning id;`);
    expect(rows).toHaveLength(1); // WHERE에 confirmed_at 조건이 없으면 종결 행도 잡힌다

    const after = await q(`select delivery_status, confirmed_at from public.shipments
                    where order_id='${paidOrderId}' and brand_id='${B_OLDBUG}';`);
    expect(after[0].delivery_status).toBe('배송중'); // 후퇴됨
    expect(after[0].confirmed_at).not.toBeNull(); // 그런데 confirmed_at은 남아 있다 = 모순
  });

  test('가드 UPDATE는 미확정(배송중) 행의 정상 전방 전이(→배송완료)는 그대로 통과시킨다', async () => {
    const rows = await q(`update public.shipments set delivery_status='배송완료', delivered_at=now()
                    where order_id='${paidOrderId}' and brand_id='${B_FWD}' and confirmed_at is null returning id;`);
    expect(rows).toHaveLength(1);

    const after = await q(`select delivery_status from public.shipments
                    where order_id='${paidOrderId}' and brand_id='${B_FWD}';`);
    expect(after[0].delivery_status).toBe('배송완료');
  });

  test('INSERT ON CONFLICT DO NOTHING은 종결 행에서 0행 → confirmed-locked 판별 근거', async () => {
    // updateShipmentUnlessConfirmed 2단계: 가드 UPDATE가 0행일 때 INSERT DO NOTHING이 충돌로 0행이면
    // 그 행은 confirmed_at이 찍힌 종결 행(=locked)이다. 존재하는 행과의 충돌이 0행임을 잠근다.
    const conflict = await q(`insert into public.shipments (order_id, brand_id, delivery_status)
                    values ('${paidOrderId}','${B_LOCKED}','배송중')
                    on conflict (order_id, brand_id) do nothing returning id;`);
    expect(conflict).toHaveLength(0); // 충돌 → 삽입 안 됨 → locked

    // 반대로 새 (order,brand)에는 삽입된다(최초 생성 경로 = 'written').
    const fresh = fixtureId('bFresh');
    const inserted = await q(`insert into public.shipments (order_id, brand_id, delivery_status)
                    values ('${paidOrderId}','${fresh}','배송준비')
                    on conflict (order_id, brand_id) do nothing returning id;`);
    expect(inserted).toHaveLength(1);
  });

  // ── Claim 2: 미결제 구매확정 차단은 DB가 아니라 앱 레이어(decideShipmentConfirm) 책임 ──

  test('confirmShipmentIfDelivered의 SQL은 결제상태를 보지 않는다 — 미결제 주문의 배송완료도 확정된다', async () => {
    // 이 1행이 바로 claim 2의 근거: DB 조건부 UPDATE(WHERE delivery_status='배송완료')만으로는 미결제
    // 구매확정을 막지 못한다. 그래서 confirm 라우트가 order.paymentStatus를 사전 검사한다
    // (decideShipmentConfirm → 'blocked-unpaid', confirm-guard.spec.ts).
    const rows = await q(`update public.shipments set delivery_status='구매확정', confirmed_at=now()
                    where order_id='${unpaidOrderId}' and brand_id='${B_UNPAID}' and delivery_status='배송완료' returning id;`);
    expect(rows).toHaveLength(1); // DB는 미결제 주문임에도 전이를 허용한다 → 앱 가드 필수

    // 멱등: 이미 구매확정이 된 행에 같은 조건부 UPDATE를 재실행하면 0행(비파괴).
    const reconfirm = await q(`update public.shipments set delivery_status='구매확정', confirmed_at=now()
                    where order_id='${unpaidOrderId}' and brand_id='${B_UNPAID}' and delivery_status='배송완료' returning id;`);
    expect(reconfirm).toHaveLength(0);
  });
});
