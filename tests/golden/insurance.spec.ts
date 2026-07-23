import { test, expect } from '@playwright/test';

// Golden Flow #3 — 펫보험 분석·신청: insurance → recommend → apply → complete
//
// 신청 제출 + 증권 업로드 실구동은 write 스펙이라 이 파일(LIVE, 항상 실행)에 둘 수 없다 —
// admin-crud-insurance.spec.ts(신청→관리자 상태관리→마이페이지)와
// admin-crud-insurance-cert.spec.ts(증권 업로드→관리자 signed URL 열람→PII 파기)가
// golden-crud 게이트(E2E_ADMIN_CRUD=1) 아래에서 여정 전체를 구동한다.

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

  // U14/U15 — 증권 업로드 실구현 회귀 방지. 실제 업로드(POST /api/insurance/upload)는
  // 여기서 실행하지 않는다(실 스토리지에 파일이 남는 것을 방지) — 파일 입력이 폼에
  // 실제로 존재하는지만 확인한다. 진짜 업로드~파기는 admin-crud-insurance-cert.spec.ts.
  test('증권 파일 첨부 입력이 폼에 존재한다(선택, 업로드는 실행하지 않음)', async ({ page }) => {
    await page.goto('/insurance/apply');
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible();
    await expect(fileInput).toHaveAttribute('accept', /pdf/);
  });
});
