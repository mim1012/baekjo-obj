import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';
import { MEMBER_EMAIL, MEMBER_PASSWORD, loginAsMember } from './_lib/memberCrudHelpers';
import {
  BRAND_PREFIX,
  PRODUCT_PREFIX,
  RECIPIENT_PREFIX,
  assertBrandShipments,
  assertMemberTrackingModal,
  assertNotProd,
  cleanupScenarioRows,
  completeOrderStatus,
  confirmBankTransfer,
  createBankTransferOrder,
  createScenarioRows,
  updateBrandShipment,
  type AuthSession,
  type BrandScenario,
} from './_lib/orderShipmentScenarioHelpers';

test.describe.configure({ mode: 'serial' });

test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 브랜드별 송장/배송조회', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 관리자 로그인 불가로 skip');
  test.skip(!MEMBER_EMAIL || !MEMBER_PASSWORD, 'E2E_MEMBER_* secret 미주입 — 회원 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });
  test.setTimeout(180_000);

  const runId = Date.now();
  const recipientName = `${RECIPIENT_PREFIX}${runId}`;
  const scenarios: BrandScenario[] = [
    {
      name: `${BRAND_PREFIX}CJ-${runId}`,
      carrier: 'cj',
      carrierLabel: 'CJ대한통운',
      trackingNumber: `880011${String(runId).slice(-6)}`,
      dispatchEstimate: `CJ 출고 ${runId}`,
      asNotice: `CJ 교환반품 안내 ${runId}`,
      supportContact: `010-1000-${String(runId).slice(-4)}`,
      productName: `${PRODUCT_PREFIX}CJ-${runId}`,
    },
    {
      name: `${BRAND_PREFIX}한진-${runId}`,
      carrier: 'hanjin',
      carrierLabel: '한진택배',
      trackingNumber: `770022${String(runId).slice(-6)}`,
      dispatchEstimate: `한진 출고 ${runId}`,
      asNotice: `한진 교환반품 안내 ${runId}`,
      supportContact: `010-2000-${String(runId).slice(-4)}`,
      productName: `${PRODUCT_PREFIX}한진-${runId}`,
    },
  ];

  test.beforeAll(async ({ browser }) => {
    assertNotProd();
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupScenarioRows(page);
    await createScenarioRows(page, scenarios);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupScenarioRows(page);
    await page.close();
  });

  test('무통장 주문 → 입금확인 → 브랜드별 택배사/송장 배송완료 → 회원 배송조회 반영', async ({
    browser,
    page: memberPage,
  }) => {
    assertNotProd();

    const adminContext = await browser.newContext({ extraHTTPHeaders: bypassHeaders() });
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);

    await memberPage.context().clearCookies();
    await memberPage.goto('/', { waitUntil: 'domcontentloaded' });
    await memberPage.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await loginAsMember(memberPage);

    const sessionResponse = await memberPage.request.get('/api/auth/session');
    expect(sessionResponse.ok()).toBe(true);
    const session = (await sessionResponse.json()) as AuthSession;
    expect(session.user?.role, '회원 여정은 admin 세션으로 실행하면 안 됩니다. E2E_MEMBER_* 계정을 확인하세요.').not.toBe(
      'admin',
    );

    const createdOrder = await createBankTransferOrder(memberPage, recipientName, runId, scenarios);
    const orderId = createdOrder.id;
    expect(createdOrder.paymentStatus).toBe('입금대기');
    expect(new Set(createdOrder.items.map((item) => item.brandId))).toEqual(new Set(scenarios.map((item) => item.brandId)));

    await confirmBankTransfer(adminPage, orderId);
    for (const scenario of scenarios) {
      await updateBrandShipment(adminPage, orderId, scenario);
    }
    await assertBrandShipments(adminPage, orderId, scenarios);
    await completeOrderStatus(adminPage, orderId);

    await memberPage.goto('/mypage?tab=orders', { waitUntil: 'domcontentloaded' });
    const orderCard = memberPage.locator('.mypage-card', { hasText: orderId }).first();
    await expect(orderCard).toBeVisible({ timeout: 15_000 });
    await expect(orderCard).toContainText('배송완료');
    for (const scenario of scenarios) {
      await expect(orderCard).toContainText(scenario.name);
      await assertMemberTrackingModal(memberPage, orderId, scenario);
    }

    await adminContext.close();
  });
});
