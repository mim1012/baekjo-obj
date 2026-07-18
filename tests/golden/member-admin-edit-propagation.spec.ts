import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';
import {
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
  loginAsMember,
  createThrowawayProduct,
  cleanupThrowawayProducts,
  patchProductAsAdmin,
} from './_lib/memberCrudHelpers';

// 골든플로우 회원 여정(wave6) 추가 축 — "관리자 수정이 회원 여정 중간 화면에 어떻게 전파되는가".
// 기존 웨이브들은 관리자 수정이 공개 **상세** 페이지에 반영되는지만 봤다 — 장바구니·체크아웃처럼
// 회원이 "여정 중간"에 떠 있는 화면에는 아무도 확인한 적이 없다(팀 지시로 이번에 추가).
//
// 코드를 읽고 이 프로젝트가 실제로 구현한 계약을 먼저 못박는다(추측 아님):
// - 장바구니(cart/page.tsx)·체크아웃(checkout/page.tsx) 둘 다 마운트 시 getPublicProducts()를
//   매번 새로 불러와 로컬 카트 아이템과 조인한다 — **스냅샷이 아니라 항상 최신 카탈로그와
//   실시간 조인**이다. 그래서 담은 뒤 관리자가 가격·이름을 바꾸면 장바구니·체크아웃 화면은
//   즉시 새 값을 보여준다(새로고침 시).
// - 주문 생성(POST /api/orders → validate() in route.ts)은 클라이언트가 보낸 productName/price를
//   전혀 신뢰하지 않고, 그 요청을 처리하는 **그 순간의** DB 카탈로그 값으로 다시 계산해
//   Order.items에 박제한다. 이후 관리자가 상품을 또 고쳐도 이미 만들어진 주문의 표시값(주문완료
//   페이지·마이페이지 주문내역)은 바뀌지 않는다 — order-complete/mypage는 항상 "주문 시점" 값.
// - 노출(isVisible) 숨김은 listProductsByIds가 기본적으로 `is_visible=true`만 조회하므로(products/
//   repo.ts:149-159) getPublicProducts()도 같은 필터를 타 숨김 상품은 장바구니·체크아웃 렌더에서
//   **조용히 사라진다**(products.find가 undefined → filter로 드롭, cart/page.tsx:64,
//   checkout/page.tsx:31). 하지만 헤더 장바구니 배지(getCartCount, src/lib/cart.ts:67-69)는
//   원본 localStorage 카트를 그대로 합산하므로 **숨김 처리된 뒤에도 개수가 줄지 않는다** — 화면에는
//   안 보이는데 배지 숫자만 남는 불일치. 이 스펙은 이 두 계약을 모두 "있는 그대로" 확인하고,
//   두 번째(배지 불일치)는 사용자에게 보고할 finding으로 명시한다(고치라는 게 아니라 진실을 박제).
test.describe('골든플로우: 회원 여정 — 관리자 수정의 중간 여정(장바구니·체크아웃) 전파', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 상품 생성/수정 불가로 skip');
  test.skip(!MEMBER_EMAIL || !MEMBER_PASSWORD, 'E2E_MEMBER_* secret 미주입 — 회원 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });

  const NAME_PREFIX = 'E2E-수정전파-';
  const INITIAL_PRICE = 10_000;

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupThrowawayProducts(page, NAME_PREFIX);
    await page.close();
  });

  test('가격·이름 수정 — 장바구니/체크아웃은 최신값, 주문완료 이후엔 주문 시점 값이 고정된다', async ({
    browser,
  }) => {
    const adminPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    adminPage.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await loginAsAdmin(adminPage);
    await cleanupThrowawayProducts(adminPage, `${NAME_PREFIX}가격-`);
    const { id: productId, name: originalName } = await createThrowawayProduct(
      adminPage,
      `${NAME_PREFIX}가격-`,
      INITIAL_PRICE,
    );

    const memberPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    memberPage.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await loginAsMember(memberPage);

    // 1) 원래 이름·가격으로 장바구니에 담는다.
    await memberPage.goto(`/shop/${productId}`);
    await expect(memberPage.getByRole('heading', { name: originalName })).toBeVisible({ timeout: 15_000 });
    await memberPage.getByRole('button', { name: '장바구니' }).first().click();

    await memberPage.goto('/cart');
    await expect(memberPage.locator('body')).toContainText(originalName, { timeout: 15_000 });
    await expect(memberPage.locator('body')).toContainText(`${INITIAL_PRICE.toLocaleString()}원`);

    // 2) 체크아웃 진입 전에 관리자가 이름·가격을 바꾼다.
    const updatedName = `${originalName}-수정됨`;
    const updatedPrice = 25_000;
    await patchProductAsAdmin(adminPage, productId, { name: updatedName, price: updatedPrice });

    // 3) 장바구니는 스냅샷이 아니라 매번 최신 카탈로그와 조인한다 — 새로고침하면 즉시 새 값.
    // ⚠️ updatedName은 `${originalName}-수정됨`이라 "originalName을 포함하지 않는다"는 검증은
    // 애초에 성립 불가(수정된 이름 자체가 원래 이름을 접두어로 포함) — 대신 명확히 분리되는
    // 신호인 "옛 가격이 더 이상 없다"로 스냅샷이 아님을 확인한다.
    await memberPage.reload();
    await expect(memberPage.locator('body')).toContainText(updatedName, { timeout: 15_000 });
    await expect(memberPage.locator('body')).not.toContainText(`${INITIAL_PRICE.toLocaleString()}원`);
    await expect(memberPage.locator('body')).toContainText(`${updatedPrice.toLocaleString()}원`);

    // 4) 체크아웃도 동일 — 최종 결제금액이 새 가격 기준으로 계산된다.
    await memberPage.goto('/checkout');
    await expect(memberPage.locator('body')).toContainText(updatedName, { timeout: 15_000 });
    await expect(memberPage.locator('body')).toContainText(`${updatedPrice.toLocaleString()}원`);

    await memberPage.locator('input[name="customerName"]').fill('E2E 전파테스터');
    await memberPage.locator('input[name="phone"]').fill('010-9999-8888');
    await memberPage.locator('input[name="address"]').fill('서울시 종로구 테스트로 3');
    await memberPage.locator('label').filter({ hasText: '무통장입금' }).click();
    await memberPage.locator('input[type="checkbox"]').check();
    await memberPage.getByRole('button', { name: /결제하기/ }).click();
    await memberPage.waitForURL(/\/order-complete/, { timeout: 20_000 });

    // 5) 주문완료 화면은 "주문 시점"(=관리자 수정 이후) 값을 스냅샷으로 보여준다.
    await expect(memberPage.locator('body')).toContainText(updatedName);
    await expect(memberPage.locator('body')).toContainText(`${updatedPrice.toLocaleString()}원`);

    // 6) 주문 이후 관리자가 또 한번 고쳐도(2차 수정) — 이미 만든 주문의 표시값은 바뀌지 않는다
    // (Order.items가 생성 시점 값을 박제 — src/app/api/orders/route.ts validate()의 resolveOrderItem).
    const secondEditName = `${originalName}-2차수정`;
    await patchProductAsAdmin(adminPage, productId, { name: secondEditName, price: 40_000 });

    await memberPage.goto('/mypage?tab=orders');
    const orderCard = memberPage.locator('.mypage-card', { hasText: updatedName }).first();
    await expect(orderCard).toBeVisible({ timeout: 15_000 });
    await expect(orderCard).toContainText(`${updatedPrice.toLocaleString()}원`);
    await expect(memberPage.locator('.mypage-card', { hasText: secondEditName })).toHaveCount(0);

    await memberPage.close();
    await adminPage.close();
  });

  test('노출 숨김 — 장바구니·체크아웃에서 조용히 사라지지만 헤더 배지 개수는 그대로다(finding)', async ({
    browser,
  }) => {
    const adminPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    adminPage.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await loginAsAdmin(adminPage);
    await cleanupThrowawayProducts(adminPage, `${NAME_PREFIX}숨김-`);
    const { id: productId, name: productName } = await createThrowawayProduct(
      adminPage,
      `${NAME_PREFIX}숨김-`,
      INITIAL_PRICE,
    );

    const memberPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    memberPage.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await loginAsMember(memberPage);

    await memberPage.goto(`/shop/${productId}`);
    await expect(memberPage.getByRole('heading', { name: productName })).toBeVisible({ timeout: 15_000 });
    await memberPage.getByRole('button', { name: '장바구니' }).first().click();

    await memberPage.goto('/cart');
    await expect(memberPage.locator('body')).toContainText(productName, { timeout: 15_000 });
    const cartBadge = memberPage.getByLabel(/장바구니, 상품 \d+개/);
    await expect(cartBadge).toHaveAttribute('aria-label', '장바구니, 상품 1개');

    // 관리자가 노출을 끈다 — listProductsByIds 기본 옵션이 is_visible=true만 조회하므로
    // getPublicProducts()에서 이 상품이 사라진다(products/repo.ts:149-159).
    await patchProductAsAdmin(adminPage, productId, { isVisible: false });

    // 장바구니 화면에서는 조용히 사라진다(products.find가 undefined → filter로 드롭,
    // cart/page.tsx:64) — "품절"이나 "판매중지" 같은 안내 문구 없이 그냥 행이 없어진다.
    await memberPage.reload();
    await expect(memberPage.locator('body')).not.toContainText(productName, { timeout: 15_000 });

    // ⚠️ finding — 헤더 배지는 원본 localStorage 카트 수량을 그대로 합산하므로(getCartCount,
    // cart.ts:67-69) 화면엔 상품이 안 보이는데 배지는 여전히 "1개"를 표시한다. 사용자에게
    // "장바구니가 비었다"와 "배지에 1개"라는 서로 다른 신호를 동시에 준다 — 실제 재현.
    await expect(cartBadge).toHaveAttribute('aria-label', '장바구니, 상품 1개');

    // 체크아웃으로 직접 진입하면 담긴(보이는) 상품이 0개이므로 useEffect가 /cart로 돌려보낸다
    // (checkout/page.tsx:100-108 cartItems.length===0 분기).
    await memberPage.goto('/checkout');
    await memberPage.waitForURL(/\/cart$/, { timeout: 15_000 });

    await memberPage.close();
    await adminPage.close();
  });
});
