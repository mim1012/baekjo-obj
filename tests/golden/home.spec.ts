import { test, expect } from '@playwright/test';

// Golden Flow: 홈 — home DB 콘센트(listProducts/listBrands, force-dynamic SSR) 검증.
// "오늘의 추천" 섹션 헤딩 + 상품 카드가 실제로 렌더되는지 확인한다(200만 확인하지 않는다).
test.describe('골든플로우: 홈', () => {
  test('오늘의 추천 섹션 헤딩과 상품 카드가 렌더된다', async ({ page }) => {
    await page.goto('/');

    // bestProducts 섹션 헤딩(기본값 "Audit를 통과한 오늘의 추천") — 부분 일치로 CMS 변경에 강건.
    await expect(page.getByText('오늘의 추천').first()).toBeVisible();

    // 상품 카드 = /shop/:id 로 가는 링크. 최소 1개 렌더 → listProducts DB 콘센트 정상.
    const productCards = page.locator('a[href^="/shop/"]');
    await expect(productCards.first()).toBeVisible();
    expect(await productCards.count()).toBeGreaterThan(0);
  });
});
