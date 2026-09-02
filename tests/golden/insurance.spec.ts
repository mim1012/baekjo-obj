import { expect, test } from '@playwright/test';

const HIDDEN_INSURANCE_ROUTES = [
  '/insurance',
  '/insurance/apply',
  '/insurance/complete',
  '/insurance/recommend',
  '/landing/insurance',
] as const;

test.describe('공개 보험 미노출 계약', () => {
  for (const route of HIDDEN_INSURANCE_ROUTES) {
    test(`${route}는 메인으로 리다이렉트된다`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/$/);
    });
  }
});
