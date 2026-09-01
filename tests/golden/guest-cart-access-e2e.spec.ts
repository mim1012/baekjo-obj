import { expect, test } from '@playwright/test';

test('비회원의 장바구니 페이지 접근은 로그인으로 이동한다', async ({ page }) => {
  const sessionResponse = page.waitForResponse('**/api/members/me');
  await page.goto('/cart');
  expect((await sessionResponse).status()).toBe(200);
  await expect(page).toHaveURL(/\/login\?redirect=\/cart$/);
  await page.screenshot({ path: '.omx/evidence/member-only-commerce/cart-redirect.png', fullPage: true });
});
