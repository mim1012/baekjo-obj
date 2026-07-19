import { test, expect } from '@playwright/test';
import { CRUD_ENABLED, bypassHeaders } from './_lib/adminCrudHelpers';
import { MEMBER_EMAIL, MEMBER_PASSWORD, loginAsMember } from './_lib/memberCrudHelpers';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 골든플로우 회원 여정(wave6) — 찜하기(위시리스트).
//
// ⚠️ 도메인 사실 — 찜하기는 DB가 아니라 `localStorage['baekjo_wishlist']`다
// (src/lib/storage.ts:42-63 getWishlist/toggleWishlist — fetch도 API 라우트도 없음).
// 토글 표면은 3곳: ProductCard.tsx(홈·쇼핑 목록 카드), ProductDetailClient.tsx(상세),
// mypage WishlistSection.tsx(전용 탭, 표시 전용 — 이 화면 자체엔 토글 버튼이 없고 해제(X)만 있다).
//
// 이게 버그가 아니라 설계임을 이 스펙이 직접 증명한다 — 같은 계정으로 로그인해도 **다른
// 브라우저 컨텍스트(fresh storage)에서는 찜한 상품이 전혀 보이지 않는다.** 다른 기기·다른
// 브라우저에서 찜 목록이 동기화되길 기대하면 안 된다는 뜻 — 이 스펙은 그 경계를 문서화한다.
//
// 🚨 E2E_ADMIN_CRUD=1 게이트를 그대로 재사용한다 — 로그인 세션을 만드는 쓰기 스펙이라
// staging/preview 전용 스위치를 존중해야 하위 계정 데이터에 대한 실수 실행을 막는다.
test.describe('골든플로우: 회원 여정 — 찜하기(위시리스트, client-local)', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!MEMBER_EMAIL || !MEMBER_PASSWORD, 'E2E_MEMBER_* secret 미주입 — 회원 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });

  const PRODUCT_ID = 'p1';

  test('shop 카드에서 찜 → 마이페이지 반영 → 상세에서 해제 → 새 컨텍스트엔 없음(계정 동기화 아님)', async ({
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

    // 상태를 모르고 시작할 수 있으므로(이전 실행 잔여) 우선 "찜하기" 상태로 정규화한다.
    if ((await wishlistButton.getAttribute('aria-label'))?.includes('해제')) {
      await wishlistButton.click();
      await expect(wishlistButton).toHaveAttribute('aria-label', `${productDisplayName} 찜하기`);
    }
    await wishlistButton.click();
    await expect(wishlistButton).toHaveAttribute('aria-label', `${productDisplayName} 찜 해제`);

    // 2) 마이페이지 전용 탭에 반영 확인.
    await page.goto('/mypage?tab=wishlist');
    await expect(page.getByRole('heading', { name: '관심 상품', exact: true })).toBeVisible({ timeout: 15_000 });
    const wishlistCard = page.locator('.mypage-card');
    await expect(wishlistCard.first()).toBeVisible({ timeout: 15_000 });

    // 3) 새로고침 후에도 유지되는지(localStorage 영속) 확인.
    await page.reload();
    await expect(page.locator('.mypage-card').first()).toBeVisible({ timeout: 15_000 });

    // 4) 상세 페이지에서 해제 → 마이페이지에서 사라짐(같은 스코핑된 로케이터 재사용 — 페이지
    // 재방문마다 요소가 새로 마운트되므로 새로 goto한 뒤 다시 잡아야 한다).
    await page.goto(`/shop/${PRODUCT_ID}`);
    const wishlistButtonAgain = page.getByRole('button', {
      name: new RegExp(`^${escapeRegExp(productDisplayName)} (찜하기|찜 해제)$`),
    });
    await expect(wishlistButtonAgain).toHaveAttribute('aria-label', `${productDisplayName} 찜 해제`);
    await wishlistButtonAgain.click();
    await expect(wishlistButtonAgain).toHaveAttribute('aria-label', `${productDisplayName} 찜하기`);

    await page.goto('/mypage?tab=wishlist');
    await expect(page.getByText('관심 상품이 없어요.')).toBeVisible({ timeout: 15_000 });

    await page.close();

    // 5) 설계 확인 — 같은 계정, 완전히 새 브라우저 컨텍스트(=localStorage 없음)로 로그인하면
    // 찜 목록은 무조건 비어 있다(DB 동기화가 아니므로). 여기서 다시 찜해서 남기지 않는다 —
    // 이 스펙은 해제까지 마쳤으므로 fresh context 도 이미 빈 상태와 같다.
    const freshContext = await browser.newContext({ extraHTTPHeaders: bypassHeaders() });
    const freshPage = await freshContext.newPage();
    await loginAsMember(freshPage);
    await freshPage.goto('/mypage?tab=wishlist');
    await expect(freshPage.getByText('관심 상품이 없어요.')).toBeVisible({ timeout: 15_000 });
    await freshContext.close();
  });
});
