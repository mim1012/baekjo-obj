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

// LIVE preview 검증 — 신청 폼이 로드되고 상호작용 가능한지만 확인한다.
// 🚫 제출하지 않는다(실 DB 에 write 발생 방지).
test.describe('골든플로우 #3 (LIVE): 보험 분석 신청 폼', () => {
  test('/insurance/apply 폼 필드가 렌더되고 입력 가능하다 (제출하지 않음)', async ({ page }) => {
    await page.goto('/insurance/apply');

    // 제목 + 핵심 폼 필드 렌더.
    await expect(page.getByRole('heading', { name: '보험 분석 신청' })).toBeVisible();
    const name = page.locator('input[name="name"]');
    const phone = page.locator('input[name="phone"]');
    const petName = page.locator('input[name="petName"]');
    await expect(name).toBeVisible();
    await expect(phone).toBeVisible();
    await expect(petName).toBeVisible();

    // 상호작용 가능성 확인(입력만, 제출 금지).
    await name.fill('테스트');
    await expect(name).toHaveValue('테스트');

    // 제출 버튼 존재 확인 — 클릭하지 않는다.
    await expect(page.getByRole('button', { name: /무료 분석 신청하기/ })).toBeVisible();
  });
});
