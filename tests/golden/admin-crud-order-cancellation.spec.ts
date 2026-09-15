import { test, expect, type Page } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';
import { MEMBER_EMAIL, MEMBER_PASSWORD, loginAsMember } from './_lib/memberCrudHelpers';
import {
  BRAND_PREFIX,
  PRODUCT_PREFIX,
  RECIPIENT_PREFIX,
  assertNotProd,
  cleanupScenarioRows,
  createBankTransferOrder,
  createScenarioRows,
  expectOrderField,
  type BrandScenario,
} from './_lib/orderShipmentScenarioHelpers';

// PR4(상품 수량 기반 취소 처리, .omx/plans/cms-pr4-cancellation-20260915.md) 골든플로우 —
// origin/feature/item-cancel-status(b4ee1ae)의 동명 스펙을 현재 계약(관리자 POST가
// {ok, requests}를 돌려주고, 패널 버튼이 승인/반려/완료라는 점, 회원 GET이 종결 주문도
// 더 이상 409로 막지 않는다는 점)에 맞춰 이식했다. DO NOT RUN — 코디네이터가 별도로 실행한다.

test.describe.configure({ mode: 'serial' });

test.describe('골든플로우 #8: 관리자 CRUD 실구동 — 상품별(수량 단위) 주문 취소', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 관리자 로그인 불가로 skip');
  test.skip(!MEMBER_EMAIL || !MEMBER_PASSWORD, 'E2E_MEMBER_* secret 미주입 — 회원 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });
  test.setTimeout(180_000);

  const runId = Date.now();

  test.beforeAll(async ({ browser }) => {
    assertNotProd();
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupScenarioRows(page);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupScenarioRows(page);
    await page.close();
  });

  /** 회원 컨텍스트로 로그인해 memberPage를 반환한다(각 테스트가 독립된 브라우저 컨텍스트를 쓴다). */
  async function openMemberPage(browser: import('@playwright/test').Browser): Promise<Page> {
    const context = await browser.newContext({ extraHTTPHeaders: bypassHeaders() });
    const page = await context.newPage();
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await loginAsMember(page);
    return page;
  }

  async function openAdminPage(browser: import('@playwright/test').Browser): Promise<Page> {
    const context = await browser.newContext({ extraHTTPHeaders: bypassHeaders() });
    const page = await context.newPage();
    await loginAsAdmin(page);
    return page;
  }

  function makeScenario(label: string, suffix: string): BrandScenario {
    return {
      name: `${BRAND_PREFIX}${label}-${suffix}`,
      carrier: 'cj',
      carrierLabel: 'CJ대한통운',
      trackingNumber: `990011${suffix.slice(-6)}`,
      dispatchEstimate: `${label} 출고 ${suffix}`,
      asNotice: `${label} 교환반품 안내 ${suffix}`,
      supportContact: `010-9000-${suffix.slice(-4)}`,
      productName: `${PRODUCT_PREFIX}${label}-${suffix}`,
    };
  }

  /** 취소·환불 요청 시트를 열고, 지정한 브랜드에서 상품 수량만큼 늘려 사유를 입력한 뒤 접수한다. */
  async function submitCancelRequest(
    memberPage: Page,
    orderId: string,
    scenario: BrandScenario,
    quantity: number,
  ): Promise<void> {
    await expect(async () => {
      await memberPage.goto('/mypage?tab=orders', { waitUntil: 'domcontentloaded' });
      const orderCard = memberPage.locator('.mypage-card', { hasText: orderId }).first();
      await expect(orderCard).toBeVisible({ timeout: 5_000 });
      await orderCard.getByRole('button', { name: '취소·환불 요청' }).click();
    }).toPass({ timeout: 45_000 });

    const dialog = memberPage.getByRole('dialog', { name: '취소·환불 요청' });
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    const brandRadio = dialog.getByRole('radio', { name: scenario.name });
    if (await brandRadio.count()) {
      await brandRadio.click();
    }

    const increaseButton = dialog.getByRole('button', { name: `${scenario.productName} 수량 늘리기` });
    for (let i = 0; i < quantity; i += 1) {
      await increaseButton.click();
    }

    await dialog.getByRole('button', { name: '단순 변심' }).click();
    await dialog.getByRole('button', { name: '취소 요청 접수하기' }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });
  }

  /** 회원 마이페이지 "취소·환불 요청 현황"(OrdersSection.tsx)에서 해당 상품의 아이템 상태가
   *  기대 라벨(ACTION_ITEM_STATUS_LABEL: 취소요청/취소승인/취소반려/취소완료)이 될 때까지 폴링한다. */
  async function expectMemberItemStatus(
    memberPage: Page,
    orderId: string,
    productName: string,
    expectedLabel: string,
  ): Promise<void> {
    await expect(async () => {
      await memberPage.goto('/mypage?tab=orders', { waitUntil: 'domcontentloaded' });
      const orderCard = memberPage.locator('.mypage-card', { hasText: orderId }).first();
      await expect(orderCard).toBeVisible({ timeout: 5_000 });
      const detailToggle = orderCard.getByRole('button', { name: '상세보기' });
      if ((await detailToggle.getAttribute('aria-expanded')) !== 'true') {
        await detailToggle.click();
      }
      // getOrderActionRequests는 created_at 내림차순(최신이 먼저)으로 돌아오고 OrdersSection은
      // 그 순서를 그대로 렌더링한다 — 반려 후 같은 상품으로 재요청하면 같은 productName을 가진 행이
      // 2개(새 요청이 앞, 예전 반려 요청이 뒤) 생기므로 반드시 .first()로 최신 행을 잡아야 한다.
      const statusSection = orderCard.locator('h3', { hasText: '취소·환불 요청 현황' }).locator('xpath=..');
      const row = statusSection.locator('div', { hasText: productName }).first();
      await expect(row).toContainText(expectedLabel, { timeout: 5_000 });
      // 🚨 쓰기(취소 요청 생성 등) 직후 회원측 전체 재조회가 낡은 값을 잠깐 주는 간헐 스테일이
      // 실측됨(memory wishlist-desync-repro 2026-07-23 참고). 60s가 지나도 낡은 값이면 그대로
      // 실패한다 — 내성이지 결함 은폐가 아니다.
    }).toPass({ timeout: 60_000 });
  }

  /** 관리자 주문 상세에서 브랜드별 취소·환불 요청 패널을 연다. */
  async function openAdminOrderDetail(adminPage: Page, orderId: string) {
    await adminPage.goto(`/admin/orders/${orderId}`, { waitUntil: 'domcontentloaded' });
    const panel = adminPage.locator('div.bg-white.border.rounded-md', { hasText: '브랜드별 취소·환불 요청' }).first();
    await expect(panel).toBeVisible({ timeout: 15_000 });
    return panel;
  }

  /** 요청 카드 루트 — 요청은 `<strong>{type} · {brandLabel}</strong>`로 브랜드명을 담는다. */
  function requestRow(panel: import('@playwright/test').Locator, brandLabel: string) {
    return panel
      .locator('strong', { hasText: brandLabel })
      .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " rounded-md ")][1]');
  }

  // 관리자 패널(OrderActionRequestsPanel.tsx) 버튼 라벨 — 승인/반려(REQUESTED), 완료(APPROVED).
  // 요청 레벨 상태 배지(REQUEST_STATUS_LABEL)는 접수/승인/반려/완료.
  async function approveRequestRow(panel: import('@playwright/test').Locator, brandLabel: string): Promise<void> {
    await expect(async () => {
      await panel.page().reload({ waitUntil: 'domcontentloaded' });
      const row = requestRow(panel, brandLabel);
      await expect(row.getByRole('button', { name: '승인' })).toBeVisible({ timeout: 5_000 });
      await row.getByRole('button', { name: '승인' }).click();
      await expect(row).toContainText('승인', { timeout: 10_000 });
    }).toPass({ timeout: 30_000 });
  }

  async function completeRequestRow(panel: import('@playwright/test').Locator, brandLabel: string): Promise<void> {
    const page = panel.page();
    page.once('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });
    await expect(async () => {
      const row = requestRow(panel, brandLabel);
      await expect(row.getByRole('button', { name: '완료' })).toBeVisible({ timeout: 5_000 });
      await row.getByRole('button', { name: '완료' }).click();
      await expect(row).toContainText('완료', { timeout: 10_000 });
    }).toPass({ timeout: 30_000 });
  }

  async function rejectRequestRow(panel: import('@playwright/test').Locator, brandLabel: string): Promise<void> {
    await expect(async () => {
      await panel.page().reload({ waitUntil: 'domcontentloaded' });
      const row = requestRow(panel, brandLabel);
      await expect(row.getByRole('button', { name: '반려' })).toBeVisible({ timeout: 5_000 });
      await row.getByRole('button', { name: '반려' }).click();
      await expect(row).toContainText('반려', { timeout: 10_000 });
    }).toPass({ timeout: 30_000 });
  }

  test('전체취소: 단일 브랜드 취소요청 → 승인 → 완료 → 결제취소', async ({ browser }) => {
    assertNotProd();
    const suffix = `${runId}-1`;
    const scenarios: BrandScenario[] = [makeScenario('전체취소', suffix)];
    await (async () => {
      const setupPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
      await loginAsAdmin(setupPage);
      await createScenarioRows(setupPage, scenarios);
      await setupPage.close();
    })();
    const scenario = scenarios[0];

    const memberPage = await openMemberPage(browser);
    const recipientName = `${RECIPIENT_PREFIX}${suffix}`;
    const order = await createBankTransferOrder(memberPage, recipientName, Number(`${runId}1`), scenarios);
    const orderId = order.id;

    await submitCancelRequest(memberPage, orderId, scenario, 1);
    await expectMemberItemStatus(memberPage, orderId, scenario.productName, '취소요청');

    const adminPage = await openAdminPage(browser);
    const panel = await openAdminOrderDetail(adminPage, orderId);
    await approveRequestRow(panel, scenario.name);
    await expectOrderField(adminPage, orderId, 'orderStatus', '부분취소');

    await completeRequestRow(panel, scenario.name);
    await expectOrderField(adminPage, orderId, 'orderStatus', '취소완료');
    await expectOrderField(adminPage, orderId, 'paymentStatus', '결제취소');

    // 회귀 확인(구 계약과 반대) — 주문이 완전히 '취소완료'/'결제취소'로 닫힌 뒤에도 회원용
    // GET /api/orders/[id]/action-requests는 더 이상 409를 주지 않고 이력을 그대로 반환한다
    // (tests/admin/action-request-routes.spec.ts가 라우트 계약으로 고정). 회원이 자신의
        // 취소 완료 내역을 계속 볼 수 있어야 한다는 뜻이라 여기서도 실제 화면으로 재확인한다.
    await expect(async () => {
      const response = await memberPage.request.get(`/api/orders/${orderId}/action-requests`);
      expect(response.status(), '종결 주문 이력 조회가 다시 409로 막히면 회귀다').toBe(200);
      const body = (await response.json()) as { requests?: unknown };
      expect(Array.isArray(body.requests)).toBe(true);
    }).toPass({ timeout: 20_000 });

    await expect(async () => {
      await memberPage.goto('/mypage?tab=orders', { waitUntil: 'domcontentloaded' });
      const orderCard = memberPage.locator('.mypage-card', { hasText: orderId }).first();
      await expect(orderCard).toContainText('취소완료', { timeout: 5_000 });
      const detailToggle = orderCard.getByRole('button', { name: '상세보기' });
      if ((await detailToggle.getAttribute('aria-expanded')) !== 'true') {
        await detailToggle.click();
      }
      await expect(orderCard).toContainText('취소·환불 요청 현황', { timeout: 5_000 });
    }).toPass({ timeout: 45_000 });

    await memberPage.context().close();
    await adminPage.context().close();
  });

  test('부분취소(브랜드): 2개 브랜드 중 1개만 취소 → 부분취소완료', async ({ browser }) => {
    assertNotProd();
    const suffix = `${runId}-2`;
    const scenarios: BrandScenario[] = [makeScenario('부분A', suffix), makeScenario('부분B', suffix)];
    await (async () => {
      const setupPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
      await loginAsAdmin(setupPage);
      await createScenarioRows(setupPage, scenarios);
      await setupPage.close();
    })();
    const [cancelScenario] = scenarios;

    const memberPage = await openMemberPage(browser);
    const recipientName = `${RECIPIENT_PREFIX}${suffix}`;
    const order = await createBankTransferOrder(memberPage, recipientName, Number(`${runId}2`), scenarios);
    const orderId = order.id;

    await submitCancelRequest(memberPage, orderId, cancelScenario, 1);
    await expectMemberItemStatus(memberPage, orderId, cancelScenario.productName, '취소요청');

    const adminPage = await openAdminPage(browser);
    const panel = await openAdminOrderDetail(adminPage, orderId);
    await approveRequestRow(panel, cancelScenario.name);
    await completeRequestRow(panel, cancelScenario.name);

    await expectOrderField(adminPage, orderId, 'orderStatus', '부분취소완료');
    const orders = await adminPage.request.get('/api/admin/orders');
    const payload = (await orders.json()) as { orders: Array<{ id: string; orderStatus: string }> };
    const adminOrder = payload.orders.find((o) => o.id === orderId) as
      | { id: string; orderStatus: string; sellerGroups?: Array<{ key?: string }> }
      | undefined;
    expect(adminOrder?.orderStatus).not.toBe('취소완료');

    await expectMemberItemStatus(memberPage, orderId, cancelScenario.productName, '취소완료');
    await expect(async () => {
      await memberPage.goto('/mypage?tab=orders', { waitUntil: 'domcontentloaded' });
      const orderCard = memberPage.locator('.mypage-card', { hasText: orderId }).first();
      await expect(orderCard).toContainText('부분취소완료', { timeout: 5_000 });
    }).toPass({ timeout: 45_000 });

    // 부분취소완료 주문은 남은(취소되지 않은) 브랜드에 대해 여전히 교환·반품 요청이 가능해야
    // 한다(OrdersSection.tsx canRequest — 부분취소만 차단, 부분취소완료는 허용). 여기선 서버
    // 게이트(requests/route.ts 제외 목록)까지 함께 검증한다.
    if (adminOrder?.sellerGroups && adminOrder.sellerGroups.length > 0) {
      const remainingSellerKey = adminOrder.sellerGroups[adminOrder.sellerGroups.length - 1]?.key;
      if (remainingSellerKey) {
        const requestResponse = await memberPage.request.post('/api/orders/requests', {
          data: { orderId, sellerKey: remainingSellerKey, type: 'return', reason: '부분취소완료 후 반품 검증' },
        });
        expect(
          requestResponse.status(),
          '부분취소완료 주문은 교환/반품 요청이 서버에서 차단되면 안 된다(요청-already-open 등 다른 409는 별개)',
        ).not.toBe(409);
      }
    }

    await memberPage.context().close();
    await adminPage.context().close();
  });

  test('부분취소(수량): 수량2 주문 중 1개만 취소 → 부분취소완료', async ({ browser }) => {
    assertNotProd();
    const suffix = `${runId}-3`;
    const scenarios: BrandScenario[] = [makeScenario('수량', suffix)];
    await (async () => {
      const setupPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
      await loginAsAdmin(setupPage);
      await createScenarioRows(setupPage, scenarios);
      await setupPage.close();
    })();
    const scenario = scenarios[0];
    if (!scenario.productId) throw new Error('상품 생성 실패: productId 없음');

    const memberPage = await openMemberPage(browser);
    const recipientName = `${RECIPIENT_PREFIX}${suffix}`;
    const orderResponse = await memberPage.request.post('/api/orders', {
      data: {
        customerName: recipientName,
        phone: '010-1234-5678',
        address: '서울시 테스트구 취소검증로 1',
        items: [{ productId: scenario.productId, quantity: 2 }],
        paymentMethod: '무통장입금',
        deliveryMemo: `수량 부분취소 검증 ${suffix}`,
      },
    });
    expect(orderResponse.ok(), `주문 생성 실패: ${orderResponse.status()} ${await orderResponse.text()}`).toBe(true);
    const orderPayload = (await orderResponse.json()) as { order: { id: string } };
    const orderId = orderPayload.order.id;

    await submitCancelRequest(memberPage, orderId, scenario, 1);
    await expectMemberItemStatus(memberPage, orderId, scenario.productName, '취소요청');

    const adminPage = await openAdminPage(browser);
    const panel = await openAdminOrderDetail(adminPage, orderId);
    await approveRequestRow(panel, scenario.name);
    await completeRequestRow(panel, scenario.name);

    await expectOrderField(adminPage, orderId, 'orderStatus', '부분취소완료');
    const orders = await adminPage.request.get('/api/admin/orders');
    const payload = (await orders.json()) as { orders: Array<{ id: string; orderStatus: string }> };
    expect(payload.orders.find((o) => o.id === orderId)?.orderStatus).not.toBe('취소완료');

    // 관리자 상세의 "상태 변경 및 관리"(OrderStatusPanel)에서 주문 상태가 파생값(부분취소완료)일
    // 때 select가 아니라 읽기 전용 텍스트로 보여야 한다 — select라면 옵션 목록에 없는 값이라
    // 브라우저가 첫 옵션으로 되돌리고, 그 상태로 무변경 저장하면 서버가 400을 준다(회귀 포인트).
    await adminPage.goto(`/admin/orders/${orderId}`, { waitUntil: 'domcontentloaded' });
    const statusSection = adminPage.locator('div.bg-white.border.rounded-md', { hasText: '상태 변경 및 관리' }).first();
    await expect(statusSection).toBeVisible({ timeout: 15_000 });
    await expect(statusSection.locator('select')).toHaveCount(2); // 결제 상태 + 배송 상태만 select, 주문 상태는 텍스트
    await expect(statusSection).toContainText('부분취소완료');

    await memberPage.context().close();
    await adminPage.context().close();
  });

  test('취소반려 + 목록반영: 반려 후 목록 배지 + 재요청 허용', async ({ browser }) => {
    assertNotProd();
    const suffix = `${runId}-4`;
    const scenarios: BrandScenario[] = [makeScenario('반려', suffix)];
    await (async () => {
      const setupPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
      await loginAsAdmin(setupPage);
      await createScenarioRows(setupPage, scenarios);
      await setupPage.close();
    })();
    const scenario = scenarios[0];

    const memberPage = await openMemberPage(browser);
    const recipientName = `${RECIPIENT_PREFIX}${suffix}`;
    const order = await createBankTransferOrder(memberPage, recipientName, Number(`${runId}4`), scenarios);
    const orderId = order.id;

    await submitCancelRequest(memberPage, orderId, scenario, 1);
    await expectMemberItemStatus(memberPage, orderId, scenario.productName, '취소요청');

    const adminPage = await openAdminPage(browser);
    const panel = await openAdminOrderDetail(adminPage, orderId);
    await rejectRequestRow(panel, scenario.name);

    // 목록(접힌 상태) 레벨에서 "취소 반려" 배지가 뜨는지 폴링 — 상세보기를 펼치지 않고 확인한다.
    await expect(async () => {
      await memberPage.goto('/mypage?tab=orders', { waitUntil: 'domcontentloaded' });
      const orderCard = memberPage.locator('.mypage-card', { hasText: orderId }).first();
      await expect(orderCard).toBeVisible({ timeout: 5_000 });
      await expect(orderCard).toContainText('취소 반려', { timeout: 5_000 });
    }).toPass({ timeout: 45_000 });

    await expectMemberItemStatus(memberPage, orderId, scenario.productName, '취소반려');

    const ordersAfterReject = await adminPage.request.get('/api/admin/orders');
    const rejectPayload = (await ordersAfterReject.json()) as { orders: Array<{ id: string; orderStatus: string }> };
    const rejectedOrderStatus = rejectPayload.orders.find((o) => o.id === orderId)?.orderStatus;
    expect(rejectedOrderStatus).not.toBe('취소완료');
    expect(rejectedOrderStatus).not.toBe('부분취소완료');
    expect(rejectedOrderStatus).not.toBe('부분취소');

    // 0152 예약 해제 회귀 검증 — 반려 후 같은 브랜드로 재요청이 성공해야 한다(23505 already-exists면 회귀).
    await submitCancelRequest(memberPage, orderId, scenario, 1);
    await expectMemberItemStatus(memberPage, orderId, scenario.productName, '취소요청');

    await memberPage.context().close();
    await adminPage.context().close();
  });
});
