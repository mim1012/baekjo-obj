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

// #129가 주문 생성에 IP 키 레이트리밋(5건/60초)을 도입해, 이 파일처럼 한 러너 IP가 한 런에서
// 주문을 6건+ 만드는 통합 스펙은 자기 트래픽만으로 429를 맞을 수 있다(CI 실측: 오버셀 스펙의
// 패자가 409(재고 경합) 대신 429를 받아 실패 — PR #123 CI 2회 연속). Vercel 엣지가
// x-forwarded-for를 덮어써 헤더로 키를 회전시킬 수도 없다. 429는 결함이 아니라 "창이 지나면
// 다시"이므로 주문 생성에 한해 창 리셋을 기다려 1회 재시도한다. 그 대기만큼 테스트 타임아웃을
// 늘린다. ⚠️ 429 자체를 단언하려는 스펙은 이 헬퍼를 쓰면 안 된다.
const ORDER_RATE_LIMIT_RESET_MS = 61_000;

async function callApi(path: string, body?: unknown) {
  const doFetch = async () => {
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
  };

  let out = await doFetch();
  if (out.status === 429 && path === '/api/orders') {
    test.info().setTimeout(test.info().timeout + ORDER_RATE_LIMIT_RESET_MS);
    await new Promise((resolve) => setTimeout(resolve, ORDER_RATE_LIMIT_RESET_MS));
    out = await doFetch();
  }
  return out;
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
// ★2026-07-16: 프리뷰 환경에 토스 테스트키가 등록되면 위조 paymentKey 조회가 "불명(502)"이
// 아니라 토스 권위 응답(보통 404)으로 떨어질 수 있다. 이 경우에도 핵심 계약은 같다:
// claim 이전에 끊겨 주문은 결제대기, 재고는 그대로다.
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

  test('불명/위조 paymentKey 상태에서는 claim 이전에 끊고 결제대기·재고를 그대로 둔다', async () => {
    // 2026-07-13 R4 라운드2(바인딩 검증 선행) 이후 동작: claim보다 먼저 queryTossPayment로
    // paymentKey↔orderId·금액 바인딩을 확인한다(confirmPayment.ts ③-a). 토스 키가 없으면
    // "불명"(502)으로, 토스 키가 있으면 위조/미존재 키가 권위 응답(409)으로 끊길 수 있다.
    // 어느 쪽이든 claim 이전에 끊기므로 주문은 결제대기 그대로 남는다.
    const res = await callApi('/api/payments/confirm', { paymentKey: TK_A, orderId, amount: 5000 });
    expect([409, 502]).toContain(res.status);
    expect(['payment-binding-mismatch', 'payment-unconfirmed']).toContain(res.json?.error);
    expect((await orderRow(orderId)).payment_status).toBe('결제대기');
    expect(await stockOf(P)).toBe(3); // 바인딩 검증도 claim도 재고를 건드리지 않는다
  });
});

// claim(승인중 전이)을 겪지 않은 별도 주문으로 취소/재확인/멱등 흐름을 검증한다 — 위 describe에서
// order-A가 claim 이후 이 API 표면으로는 취소 불가능한 상태(승인중)에 고정되므로, 체인을 이어가면
// 이 시나리오들이 모두 무의미하게 실패/스킵된다(2026-07-13 team-lead 지적: serial 1건 실패 시 5건
// 미실행). order-A/product 재고와 독립적으로 동작하도록 별도 product(Q)를 쓴다.
// R4 진짜 최종(Codex 라운드5 HIGH-1) — cancelPendingOrderIfUnpaid가 TOSS_SECRET_KEY 미설정을
// fail-closed(취소 보류, 202)로 바꿨다. 무통장입금은 토스와 무관해 여전히 즉시 취소(200)되므로
// 기존 취소/재확인/멱등 체인은 무통장입금 주문으로 유지하고, 카드 주문의 fail-closed 동작은
// 별도 describe에서 독립적으로 검증한다(체인에 섞으면 그 자체로 취소가 안 돼 뒤의 confirm 409·
// 재호출 멱등 단언이 전부 깨진다).
test.describe.serial('결제 라우트 — 취소/재확인/멱등 (무통장입금, claim 미실행 주문, 프리뷰 통합)', () => {
  const Q = fixtureId('route_wave1_q1');
  const CUSTOMER = fixtureId('route_wave1_cancel');
  const TK_B = fixtureId('tk_route_b');
  const mkOrder = (qty: number) =>
    callApi('/api/orders', {
      customerName: CUSTOMER,
      phone: '010-0000-0000',
      address: '테스트',
      items: [{ productId: Q, quantity: qty }],
      paymentMethod: '무통장입금',
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

  test('무통장입금 결제대기 주문에 cancel을 호출하면 원자적으로 취소 처리하고 재고를 복원한다(토스 무관, 200)', async () => {
    expect((await orderRow(orderId)).payment_status).toBe('입금대기'); // 무통장입금 생성 계약(claim을 겪지 않았음을 전제)
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

// Codex 라운드5 HIGH-1 회귀 방어 — 토스 조회가 불명(키 미설정/네트워크 실패)이면 카드 주문
// 취소를 보류해야 한다. 반대로 토스 테스트키가 등록돼 "해당 orderId 결제 없음(404)"을 권위 있게
// 확인할 수 있으면 즉시 취소·복원해도 안전하다. 두 경로 모두 돈 손실이 없어야 한다.
test.describe('결제 라우트 — 카드 주문 취소 안전 수렴 (프리뷰 통합)', () => {
  const S = fixtureId('route_wave1_s2');
  const CUSTOMER = fixtureId('route_wave1_cancel_card');
  const mkOrder = (qty: number) =>
    callApi('/api/orders', {
      customerName: CUSTOMER,
      phone: '010-0000-0000',
      address: '테스트',
      items: [{ productId: S, quantity: qty }],
      paymentMethod: '신용카드',
    });

  test.beforeAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${S}';`);
    await q(`insert into public.products (id, name, brand_id, category, price, stock, is_visible)
             values ('${S}','${S}', (select id from public.brands limit 1), 'etc', 1000, 5, true);`);
  });

  test.afterAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${S}';`);
  });

  test('카드 주문 취소는 토스 권위 조회 결과에 맞춰 보류하거나 안전 취소한다', async () => {
    const res = await mkOrder(1);
    const orderId = (res.json?.order?.id ?? res.json?.id) as string;
    expect(orderId).toBeTruthy();
    expect((await orderRow(orderId)).payment_status).toBe('결제대기');
    const stockBefore = await stockOf(S);

    const cancelRes = await callApi('/api/payments/cancel', { orderId });
    expect([200, 202]).toContain(cancelRes.status);

    const row = await orderRow(orderId);
    if (cancelRes.status === 202) {
      expect(cancelRes.json?.error).toBe('cancel-pending');
      expect(row.payment_status).toBe('결제대기'); // 취소되지 않았다
      expect(await stockOf(S)).toBe(stockBefore); // 재고도 그대로다
    } else {
      expect(cancelRes.json?.ok).toBe(true);
      expect(row.payment_status).toBe('결제취소'); // 토스가 결제 없음으로 확인돼 안전 취소됐다
      expect(await stockOf(S)).toBe(5); // 선점 재고가 복원됐다
    }
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
  // 무통장입금 — 이 테스트의 목적은 오버셀 차단(재고 원자성)이지 결제수단이 아니다. 신용카드로
  // 두면 cancel 정리 단계가 fail-closed(202, HIGH-1)에 걸려 재고가 안 풀리므로, 토스와 무관하게
  // 즉시 취소되는 무통장입금으로 정리 단계를 단순하게 유지한다.
  const mkOrder = (qty: number) =>
    callApi('/api/orders', {
      customerName: CUSTOMER,
      phone: '010-0000-0000',
      address: '테스트',
      items: [{ productId: R, quantity: qty }],
      paymentMethod: '무통장입금',
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
    // #129 주문 레이트리밋(분당 5건, IP 키·인스턴스별 인메모리)과의 경합 방어 — 이 파일의 앞선
    // 테스트들이 같은 CI 러너 IP로 분당 예산을 소진하면, 두 번째 동시 주문이 409(재고 충돌)가
    // 아니라 429로 끊겨 오버셀 판정이 오염된다(2026-07-18 CI 2회 연속 실측: okCount=1·conflictCount=0).
    // 프로덕션 리밋을 건드리지 않고 스펙에서 창(60s) 리셋을 기다린 뒤 발사한다.
    test.slow(); // 기본 60s 타임아웃으로는 아래 대기를 감당 못 한다(3배 연장).
    await new Promise((resolve) => setTimeout(resolve, 65_000));
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

// R4 라운드2(2026-07-13, Codex 리뷰 대응) — GET /api/payments/return의 바인딩 검증과
// GET /api/payments/status의 읽기 전용성을 검증한다. successUrl이 GET이 되면서(R4) 봇으로
// 자동화 가능해진 위조 paymentKey 벡터가 이번 라운드의 핵심 회귀 방어 대상이다.
test.describe('결제 라우트 — GET /api/payments/return 바인딩 검증 + status 읽기전용 (R4 라운드2, 프리뷰 통합)', () => {
  const S = fixtureId('route_wave1_s1');
  const CUSTOMER = fixtureId('route_wave1_return');
  const mkOrder = (qty: number) =>
    callApi('/api/orders', {
      customerName: CUSTOMER,
      phone: '010-0000-0000',
      address: '테스트',
      items: [{ productId: S, quantity: qty }],
      paymentMethod: '신용카드',
    });

  // /api/payments/return은 302 리다이렉트라 fetch 기본 동작(자동 추적)으로는 최종 목적지의
  // 200만 보인다 — redirect:'manual'로 Location 헤더 자체를 확인해 status 쿼리를 검사한다.
  async function callReturn(query: Record<string, string>) {
    const qs = new URLSearchParams(query).toString();
    const res = await fetch(`${BASE}/api/payments/return?${qs}`, { redirect: 'manual' });
    return { status: res.status, location: res.headers.get('location') };
  }

  test.beforeAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${S}';`);
    await q(`insert into public.products (id, name, brand_id, category, price, stock, is_visible)
             values ('${S}','${S}', (select id from public.brands limit 1), 'etc', 1000, 5, true);`);
  });

  test.afterAll(async () => {
    await q(`delete from public.orders where customer_name='${CUSTOMER}';`);
    await q(`delete from public.products where id='${S}';`);
  });

  test('위조된 paymentKey로 /api/payments/return을 호출해도 결제대기 주문·재고를 건드리지 않는다', async () => {
    const res = await mkOrder(2); // subtotal 2000 + 배송비 3000 = 5000
    const orderId = (res.json?.order?.id ?? res.json?.id) as string;
    expect(orderId).toBeTruthy();
    expect((await orderRow(orderId)).payment_status).toBe('결제대기');
    expect(await stockOf(S)).toBe(3);

    // 공격자는 피해자의 orderId·금액만 알면 된다 — paymentKey는 완전히 지어낸다.
    const forgedKey = fixtureId('forged_return_key');
    const { location } = await callReturn({ paymentKey: forgedKey, orderId, amount: '5000' });
    expect(location).toContain('/order-complete');
    // 토스 키가 없으면 바인딩 조회 자체가 "불명"(status=unconfirmed)으로, 토스 테스트키가 있으면
    // 위조 키가 권위 응답으로 거부돼 409 계열(status=expired)로 매핑될 수 있다. 어느 쪽이든
    // claim은 절대 실행되지 않는다는 게 핵심이며, 아래 DB 단언이 그 회귀 방어다.
    expect(location).toMatch(/status=(unconfirmed|expired)/);
    const row = await orderRow(orderId);
    expect(row.payment_status).toBe('결제대기'); // ★핵심 — claim이 실행되지 않았다
    expect(await stockOf(S)).toBe(3); // 재고도 건드려지지 않았다
  });

  test('불완전 쿼리는 조회·claim 없이 곧장 invalid로 리다이렉트하고 DB를 건드리지 않는다', async () => {
    const res = await mkOrder(1);
    const orderId = (res.json?.order?.id ?? res.json?.id) as string;
    expect(orderId).toBeTruthy();

    const { location } = await callReturn({ orderId }); // paymentKey·amount 누락
    expect(location).toContain('/order-complete');
    expect(location).toMatch(/status=invalid/);
    expect((await orderRow(orderId)).payment_status).toBe('결제대기'); // DB 무변경
  });

  test('GET /api/payments/status는 읽기 전용 — 호출 전후 payment_status가 동일하다', async () => {
    const res = await mkOrder(1);
    const orderId = (res.json?.order?.id ?? res.json?.id) as string;
    expect(orderId).toBeTruthy();
    const before = (await orderRow(orderId)).payment_status;

    const statusRes = await fetch(`${BASE}/api/payments/status?orderId=${orderId}`);
    expect(statusRes.status).toBe(200);
    const body = (await statusRes.json()) as { paymentStatus: string; orderStatus: string };
    expect(body.paymentStatus).toBe(before);

    expect((await orderRow(orderId)).payment_status).toBe(before); // 조회 호출이 상태를 바꾸지 않았다
  });
});
