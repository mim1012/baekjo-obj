import { test, expect } from '@playwright/test';

// Golden Flow #5 — 케어키트 B2B 파트너 신청
test.describe('골든플로우 #5: 케어키트 B2B 신청', () => {
  test.fixme('파트너 신청 폼을 제출하면 접수된다', async ({ page }) => {
    await page.goto('/landing/care-kit');
    await expect(page).toHaveURL(/\/landing\/care-kit/);
    // TODO(golden): 파트너(병원/장례식장 등) 신청 폼 입력
    // TODO(golden): 제출 → 접수 확인 메시지 노출 단언
  });
});
