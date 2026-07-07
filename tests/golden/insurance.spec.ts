import { test, expect } from '@playwright/test';

// Golden Flow #3 — 펫보험 분석·신청: insurance → recommend → apply → complete
test.describe('골든플로우 #3: 펫보험 분석·신청', () => {
  test.fixme('보험 추천 → 신청(증권 업로드) → 완료까지 진행된다', async ({ page }) => {
    await page.goto('/insurance');
    // TODO(golden): 추천 페이지 /insurance/recommend
    // TODO(golden): 신청 폼 /insurance/apply 입력 + 증권 파일 업로드
    // TODO(golden): 제출 → /insurance/complete
    await expect(page).toHaveURL(/\/insurance\/complete/);
  });
});
