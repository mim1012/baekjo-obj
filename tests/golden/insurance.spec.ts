import { test, expect } from '@playwright/test';
import { FEATURES } from '../../src/config/features';

// LIVE preview 검증 — 신청 폼이 로드되고 상호작용 가능한지만 확인한다.
// 🚫 제출하지 않는다(실 DB 에 write 발생 방지).
test.describe('골든플로우 #3 (LIVE): 보험 분석 신청 폼', () => {
  test('/insurance/apply 폼 필드가 렌더되고 입력 가능하다 (제출하지 않음)', async ({ page }) => {
    await page.goto('/insurance/apply');

    if (!FEATURES.insurance) {
      await expect(page).toHaveURL(/\/$/);
      return;
    }

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

  // U14/U15 — 증권 업로드 실구현 회귀 방지. 실제 업로드(POST /api/insurance/upload)는
  // 여기서 실행하지 않는다(실 스토리지에 파일이 남는 것을 방지) — 파일 입력이 폼에
  // 실제로 존재하는지만 확인한다. 진짜 업로드~파기는 admin-crud-insurance-cert.spec.ts.
  test('증권 파일 첨부 입력이 폼에 존재한다(선택, 업로드는 실행하지 않음)', async ({ page }) => {
    await page.goto('/insurance/apply');
    if (!FEATURES.insurance) {
      await expect(page).toHaveURL(/\/$/);
      return;
    }
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();
    await expect(fileInput).toHaveAttribute('accept', /pdf/);
  });
});
