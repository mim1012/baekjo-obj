import { expect, test } from '@playwright/test';
import { loginWithCredentials } from './_lib/adminCrudHelpers';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.describe('진열 관리 화면 읽기 전용 동작', () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, '관리자 로그인 환경변수 미설정');

  test('진열 위치를 구분하고 순서를 바꾼 뒤 취소하면 원래 순서로 돌아온다', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.goto('/admin/products/display');

    for (const name of ['홈 추천', 'DAILY PICK', '전체 상품']) {
      await expect(page.getByRole('button', { name: new RegExp(name) })).toBeVisible();
    }
    await expect(page.getByText('고객 홈 > 오늘의 추천', { exact: true }).last()).toBeVisible();

    const orderedList = page.locator('section[aria-labelledby="ordered-products-title"]');
    const items = orderedList.locator('li');
    expect(await items.count()).toBeGreaterThan(1);
    const firstName = (await items.nth(0).locator('p').first().innerText()).trim();
    const secondName = (await items.nth(1).locator('p').first().innerText()).trim();

    await items.nth(0).getByRole('button', { name: `${firstName} 아래로 이동` }).click();
    await expect(items.nth(0).locator('p').first()).toHaveText(secondName);
    await expect(items.nth(1).locator('p').first()).toHaveText(firstName);
    await expect(page.getByRole('button', { name: '진열 변경 저장' })).toBeVisible();

    await page.getByRole('button', { name: '취소' }).click();
    await expect(items.nth(0).locator('p').first()).toHaveText(firstName);
    await expect(page.getByRole('button', { name: '진열 변경 저장' })).toHaveCount(0);
  });
});
