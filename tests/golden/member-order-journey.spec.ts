import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';
import {
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
  loginAsMember,
  createThrowawayProduct,
  cleanupThrowawayProducts,
} from './_lib/memberCrudHelpers';

// 골든플로우 #2: 스토어 구매 여정(실구동, 무통장입금) — shop → 상세 → 장바구니(수량 변경·삭제
// 포함) → checkout → order-complete → mypage 주문내역 반영까지 실제 DB에 주문을 만든다.
//
// 🚨 안전 설계(wave4 조율안 재사용) — 주문은 생성 시점에 실제 재고를 차감하고(주문 완료 API가
// 카탈로그 가격/재고로 재계산·확정), 삭제 API가 없으며, 취소 경로는 이 스펙의 관심사가 아니다
// (주문 상태 전이 자체는 admin 소관/wave4). 그래서 이 스펙은 **재고가 넉넉한 스로어웨이 상품 2개를
// 스펙이 직접 만들어** 실제 카탈로그 상품 재고에 손대지 않는다. 하나(PRODUCT_A)는 장바구니
// 수량 변경 후 결제까지 진행하고, 다른 하나(PRODUCT_B)는 장바구니에서 삭제해 삭제 동작을
// 증명하는 용도로만 쓰고 결제하지 않는다. 만들어진 주문은 종결 상태(무통장 = 입금대기로 완결)로
// 남긴 채 정리하지 않는다(E2E- 접두사로 영구 잔존 허용, 문서화된 결정 — 취소 API 미사용).
// 상품 자체는 beforeAll/afterAll에서 잔여물만 정리한다(Order.items에 productName이 박제되므로
// 상품 삭제와 무관하게 주문 내역은 남는다).
test.describe('골든플로우 #2: 회원 여정 — 스토어 구매(무통장입금) 실구동', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 스로어웨이 상품 생성 불가로 skip');
  test.skip(!MEMBER_EMAIL || !MEMBER_PASSWORD, 'E2E_MEMBER_* secret 미주입 — 회원 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });

  const NAME_PREFIX = 'E2E-회원주문-';
  const UNIT_PRICE = 12_000;
  let productAId: string;
  let productAName: string;
  let productBId: string;
  let productBName: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupThrowawayProducts(page, NAME_PREFIX);
    const productA = await createThrowawayProduct(page, `${NAME_PREFIX}유지-`, UNIT_PRICE);
    const productB = await createThrowawayProduct(page, `${NAME_PREFIX}삭제-`, UNIT_PRICE);
    productAId = productA.id;
    productAName = productA.name;
    productBId = productB.id;
    productBName = productB.name;
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupThrowawayProducts(page, NAME_PREFIX);
    await page.close();
  });

  test('상품 2종 담기 → 장바구니 수량 변경 + 한 종 삭제 → 무통장 결제 → 완료 → 마이페이지 주문내역 반영', async ({
    page,
  }) => {
    page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });

    await loginAsMember(page);

    // 1) 두 상품을 각각 장바구니에 담는다(A=유지, B=삭제 대상).
    // ⚠️ 실측(2026-07-19 로컬+staging 라이브 스모크) — 상세 페이지 하단 "함께 보면 좋은 상품" 등
    // 연관상품 카드(<article>)도 자기 "장바구니" 버튼을 가져 strict-mode 다중매치가 난다. 본문
    // 구매 패널의 버튼이 DOM상 먼저 오므로 .first()로 고정한다(찜하기 버튼과 같은 종류 문제).
    // ⚠️ 실측 — handleAddToCart의 "장바구니에 담겼습니다"는 window.alert(네이티브 다이얼로그)라
    // DOM(body 텍스트)엔 절대 나타나지 않는다(beforeEach의 dialog 핸들러가 자동으로 닫아준다).
    // 그래서 담김 확인은 헤더 카트 배지 개수 증가로 대신한다 — 실제 관찰 가능한 신호다.
    const cartBadge = page.getByLabel(/장바구니, 상품 \d+개/);

    await page.goto(`/shop/${productAId}`);
    await expect(page.getByRole('heading', { name: productAName })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: '장바구니' }).first().click();
    await expect(cartBadge).toHaveAttribute('aria-label', '장바구니, 상품 1개', { timeout: 10_000 });

    await page.goto(`/shop/${productBId}`);
    await expect(page.getByRole('heading', { name: productBName })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: '장바구니' }).first().click();
    await expect(cartBadge).toHaveAttribute('aria-label', '장바구니, 상품 2개', { timeout: 10_000 });

    // 2) 장바구니 — A 수량을 2로 늘렸다가 1로 되돌리고(변경 동작 확인), B는 삭제한다.
    await page.goto('/cart');
    const cardA = page.locator('.rounded-sm', { hasText: productAName }).first();
    const cardB = page.locator('.rounded-sm', { hasText: productBName }).first();
    await expect(cardA).toBeVisible({ timeout: 15_000 });
    await expect(cardB).toBeVisible({ timeout: 15_000 });

    // 버튼 DOM 순서(cart/page.tsx): [삭제(Trash), 수량감소(Minus), 수량증가(Plus)].
    const [removeA, decreaseA, increaseA] = [
      cardA.getByRole('button').nth(0),
      cardA.getByRole('button').nth(1),
      cardA.getByRole('button').nth(2),
    ];
    void removeA; // A는 삭제하지 않음 — 존재만 확인.

    const qtyDisplayA = cardA.locator('span.font-bold', { hasText: /^\d+$/ });
    await expect(qtyDisplayA).toHaveText('1');
    await increaseA.click();
    await expect(qtyDisplayA).toHaveText('2');
    await decreaseA.click();
    await expect(qtyDisplayA).toHaveText('1');

    await cardB.getByRole('button').nth(0).click(); // B 삭제(Trash 버튼)
    await expect(page.locator('.rounded-sm', { hasText: productBName })).toHaveCount(0, { timeout: 10_000 });
    await expect(cardA).toBeVisible();

    // 3) 체크아웃 — 무통장입금으로 배송정보 입력 후 주문(남은 건 A 1개뿐).
    await page.goto('/checkout');
    await expect(page.locator('body')).toContainText(productAName, { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText(productBName);
    await page.locator('input[name="customerName"]').fill('E2E 테스트 구매자');
    await page.locator('input[name="phone"]').fill('010-1234-5678');
    await page.locator('input[name="address"]').fill('서울시 강남구 테스트로 1');
    await page.locator('label').filter({ hasText: '무통장입금' }).click();
    await page.locator('input[type="checkbox"]').check();

    await page.getByRole('button', { name: /결제하기/ }).click();
    await page.waitForURL(/\/order-complete/, { timeout: 20_000 });
    await expect(page.getByText('주문이 완료되었습니다')).toBeVisible();
    await expect(page.locator('body')).toContainText(productAName);

    // 4) 마이페이지 주문내역 — 방금 주문이 상품명·수량·상태로 보이는지 확인.
    await page.goto('/mypage?tab=orders');
    const orderCard = page.locator('.mypage-card', { hasText: productAName }).first();
    await expect(orderCard).toBeVisible({ timeout: 15_000 });
    await expect(orderCard).toContainText('주문접수');
    await expect(orderCard).toContainText('입금대기');
    await expect(orderCard).toContainText('배송전');
    await expect(orderCard).toContainText('1개');
  });
});
