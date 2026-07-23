import { test, expect } from '@playwright/test';
import { CRUD_ENABLED, bypassHeaders } from './_lib/adminCrudHelpers';
import { MEMBER_EMAIL, MEMBER_PASSWORD, loginAsMember } from './_lib/memberCrudHelpers';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 🚨 E2E_ADMIN_CRUD=1 게이트를 그대로 재사용한다 — 로그인 세션을 만드는 쓰기 스펙이라
// staging/preview 전용 스위치를 존중해야 하위 계정 데이터에 대한 실수 실행을 막는다.
test.describe('골든플로우: 회원 여정 — 찜하기(위시리스트, DB 동기화)', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!MEMBER_EMAIL || !MEMBER_PASSWORD, 'E2E_MEMBER_* secret 미주입 — 회원 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });

  const PRODUCT_ID = 'p1';

  test('상세에서 찜 → 마이페이지 반영 → 새 컨텍스트 재로그인에도 유지 → 해제 후 DB 반영', async ({
    browser,
  }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsMember(page);

    // 1) 상세 페이지에서 찜하기 토글(홈/목록 카드 대신 상세로 고정 — id가 확실해 재현이 안정적).
    // ⚠️ 실측(2026-07-19 staging 라이브 스모크) — 상세 페이지엔 "함께 보면 좋은 상품" 등
    // 연관상품 ProductCard가 자기 찜 버튼을 또 갖고 있어 아리아라벨 정규식만으로는 strict-mode
    // 위반(다중 매치)이 난다. 본문 상품명(h1)으로 정확히 스코핑한 뒤 그 이름을 포함하는
    // 찜 버튼(ProductDetailClient의 것 — aria-label이 `${product.name} 찜하기/찜 해제`)만 특정한다.
    await page.goto(`/shop/${PRODUCT_ID}`);
    const productHeading = page.getByRole('heading', { level: 1 });
    await expect(productHeading).toBeVisible({ timeout: 15_000 });
    const productDisplayName = (await productHeading.textContent())?.trim();
    if (!productDisplayName) throw new Error('상품 상세 h1에서 상품명을 읽지 못함');

    const wishlistButton = page.getByRole('button', {
      name: new RegExp(`^${escapeRegExp(productDisplayName)} (찜하기|찜 해제)$`),
    });
    await expect(wishlistButton).toBeVisible({ timeout: 15_000 });

    // 상태를 모르고 시작할 수 있으므로(이전 실행 잔여) DB 진실 기준으로 "찜 없음"으로 정규화한다.
    // 🚨 aria-label 기반 정규화는 레이스였다(2026-07-23 CI 스윕 2회 연속 재현): 버튼의 wishlisted
    // 상태는 getWishlist() fetch 완료 후에야 동기화되는데, 그 전에 읽으면 잔여 찜이 있어도
    // '찜하기'로 보여 정규화를 건너뛰고 — 이어지는 클릭이 실제로는 '해제'로 동작한다. 그 위에
    // 뒤늦게 도착한 초기 sync(삭제 전 데이터)가 transient '찜 해제'를 그려 aria 단언까지
    // 통과시키므로, DB만 비고 마이페이지가 EmptyState로 떨어졌다(실측: 실패 아티팩트 +
    // member_wishlist 직접 조회 0행). 정규화·검증 모두 API(서버 진실)로 한다.
    const preState = await page.request.get('/api/wishlist');
    if (preState.ok()) {
      const { productIds } = (await preState.json()) as { productIds: string[] };
      if (productIds.includes(PRODUCT_ID)) {
        await page.request.delete('/api/wishlist', { data: { productId: PRODUCT_ID } });
      }
    }
    await page.reload();
    await expect(wishlistButton).toHaveAttribute('aria-label', `${productDisplayName} 찜하기`, {
      timeout: 15_000,
    });
    await wishlistButton.click();
    await expect(wishlistButton).toHaveAttribute('aria-label', `${productDisplayName} 찜 해제`);
    // 독립 경로 검증 — UI 상태가 아니라 서버 재조회로 실제 저장을 확인한다(§8-6 자기개선 루프 2단계).
    await expect(async () => {
      const res = await page.request.get('/api/wishlist');
      expect(res.ok()).toBe(true);
      const { productIds } = (await res.json()) as { productIds: string[] };
      expect(productIds).toContain(PRODUCT_ID);
    }).toPass({ timeout: 15_000 });

    await page.goto('/mypage?tab=wishlist');
    await expect(page.getByRole('heading', { name: '관심 상품', exact: true })).toBeVisible({ timeout: 15_000 });
    const wishlistCard = page.locator('.mypage-card', { hasText: productDisplayName });
    await expect(wishlistCard.first()).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await expect(page.locator('.mypage-card', { hasText: productDisplayName }).first()).toBeVisible({ timeout: 15_000 });

    await page.close();

    const freshContext = await browser.newContext({ extraHTTPHeaders: bypassHeaders() });
    const freshPage = await freshContext.newPage();
    await loginAsMember(freshPage);
    await freshPage.goto('/mypage?tab=wishlist');
    await expect(freshPage.locator('.mypage-card', { hasText: productDisplayName }).first()).toBeVisible({ timeout: 15_000 });

    await freshPage.goto(`/shop/${PRODUCT_ID}`);
    const syncedWishlistButton = freshPage.getByRole('button', {
      name: new RegExp(`^${escapeRegExp(productDisplayName)} (찜하기|찜 해제)$`),
    });
    await expect(syncedWishlistButton).toHaveAttribute('aria-label', `${productDisplayName} 찜 해제`, {
      timeout: 15_000,
    });
    // 해제 실패 시 UI가 alert를 띄우므로(핸들러 없으면 Playwright가 dismiss) 명시 수락한다.
    freshPage.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await syncedWishlistButton.click();
    // 🚨 2026-07-23 스윕 재현: 프리뷰에서 해제 POST 왕복이 기본 5s 단언보다 느려 aria가 제때
    // 안 뒤집혔다. 등록과 대칭으로 서버 재조회를 1차 판정으로 삼고(15s poll), aria는 그 뒤 확인.
    await expect(async () => {
      const res = await freshPage.request.get('/api/wishlist');
      expect(res.ok()).toBe(true);
      const { productIds } = (await res.json()) as { productIds: string[] };
      expect(productIds).not.toContain(PRODUCT_ID);
    }).toPass({ timeout: 20_000 });
    await expect(syncedWishlistButton).toHaveAttribute('aria-label', `${productDisplayName} 찜하기`, {
      timeout: 15_000,
    });

    await freshPage.goto('/mypage?tab=wishlist');
    await expect(freshPage.locator('.mypage-card', { hasText: productDisplayName })).toHaveCount(0, { timeout: 15_000 });

    await freshContext.close();
  });
});
