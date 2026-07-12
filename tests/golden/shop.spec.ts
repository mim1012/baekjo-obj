import { test, expect } from '@playwright/test';

// Golden Flow #2: 스토어 — 상품 카드 + 카테고리/브랜드 필터 UI 렌더 검증.
// 주의: /api/category-settings 가 현재 {} 를 반환하지만(진단 리포트 참고), 필터 그룹 제목은
// 정적이고 항목은 CategorySettingsProvider 의 defaultCategorySettings 로 폴백하므로 UI 는 정상 렌더된다.
test.describe('골든플로우 #2: 스토어', () => {
  test('상품 카드와 카테고리/브랜드 필터 UI 가 렌더된다', async ({ page }) => {
    await page.goto('/shop');

    // 페이지 헤딩
    await expect(page.getByRole('heading', { name: '전체 상품' })).toBeVisible();

    // 필터 UI: 사이드바(complementary) 안의 카테고리 · 브랜드 그룹(summary) 이 보인다.
    // (네비게이션에도 '브랜드' 링크가 있으므로 사이드바로 스코프한다.)
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.locator('summary', { hasText: '카테고리' })).toBeVisible();
    await expect(sidebar.locator('summary', { hasText: '브랜드' })).toBeVisible();

    // 카테고리 필터 항목이 default 로 폴백되어 렌더되는지(예: '사료') — {} 응답에도 필터가 비지 않음.
    await expect(sidebar.getByRole('link', { name: '사료', exact: true })).toBeVisible();

    // 상품 카드(/shop/:id 링크) 최소 1개 렌더.
    const productCards = page.locator('a[href^="/shop/"]');
    await expect(productCards.first()).toBeVisible();
    expect(await productCards.count()).toBeGreaterThan(0);
  });
});
