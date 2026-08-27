import { expect, test } from '@playwright/test';

const credentials = {
  email: process.env.E2E_ADMIN_EMAIL ?? '',
  password: process.env.E2E_ADMIN_PASSWORD ?? '',
};

test.describe('Credentials 로그인 redirect hygiene', () => {
  test.skip(!credentials.email || !credentials.password, 'E2E_ADMIN_* secret 미주입 — 로그인 회귀 스킵');

  test('관리자 가드에서 돌아온 error 쿼리가 성공 로그인을 실패로 오인시키지 않는다', async ({ page }) => {
    await page.goto('/login?error=admin', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type="email"]').fill(credentials.email);
    await page.locator('input[type="password"]').fill(credentials.password);

    await Promise.all([
      page.waitForURL((url) => url.pathname === '/admin', { timeout: 20_000 }),
      page.getByRole('button', { name: '로그인', exact: true }).click(),
    ]);

    await expect(page).toHaveURL(/\/admin$/);
  });
});
