import { test, expect } from '@playwright/test';

// 골든플로우 #2 보강 — 판매가가 아직 없는 상품도 액션 영역이 사라지면 안 된다.
test.describe('골든플로우 #2: 상품 상세 구매 액션', () => {
  test('상품 상세는 장바구니와 결제 액션의 현재 상태를 항상 보여준다', async ({ page }) => {
    await page.goto('/shop');

    const firstProductLink = page.locator('a[href^="/shop/"]').first();
    await expect(firstProductLink).toBeVisible();
    const href = await firstProductLink.getAttribute('href');
    expect(href).toMatch(/^\/shop\//);

    await page.goto(href!);

    await expect(page.getByRole('button', { name: /장바구니|장바구니 준비중/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /바로구매|결제 준비중/ }).first()).toBeVisible();
    await expect(page.getByText('로그인 후 가격 확인')).toHaveCount(0);
  });
});
