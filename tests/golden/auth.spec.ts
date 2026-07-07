import { test, expect } from '@playwright/test';

// Golden Flow #6 — 회원: 가입 → 로그인 → 마이페이지
test.describe('골든플로우 #6: 회원', () => {
  test.fixme('회원가입 → 로그인 → 마이페이지 상태가 유지된다', async ({ page }) => {
    await page.goto('/signup');
    // TODO(golden): 가입 폼 입력 → 제출
    // TODO(golden): /login 에서 로그인
    await page.goto('/mypage');
    await expect(page).toHaveURL(/\/mypage/);
    // TODO(golden): 로그인 사용자 정보 노출 단언 (localStorage 세션 유지)
  });
});
