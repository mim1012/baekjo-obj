import { test, expect } from '@playwright/test';

// Golden Flow #4 — 브랜드관: 목록 → 상세
test.describe('골든플로우 #4: 브랜드관', () => {
  test.fixme('오딧 통과 브랜드 목록 → 상세(/brands/[id])로 진입한다', async ({ page }) => {
    await page.goto('/brands');
    // TODO(golden): 브랜드 카드 클릭 → /brands/[id]
    await expect(page).toHaveURL(/\/brands\/.+/);
    // TODO(golden): 오딧 리포트 / 대표 상품 노출 단언
  });
});
