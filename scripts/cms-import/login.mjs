export async function loginWithHydration(page, email, password) {
  await Promise.all([
    page.waitForResponse((response) => new URL(response.url()).pathname === '/api/page-texts' && response.ok(), { timeout: 30_000 }),
    page.goto('/login', { waitUntil: 'domcontentloaded' }),
  ]);
  await page.waitForLoadState('networkidle', { timeout: 15_000 });
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname === '/admin', { timeout: 30_000 }),
    page.getByRole('button', { name: '로그인', exact: true }).click(),
  ]);
}
