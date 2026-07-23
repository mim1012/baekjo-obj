import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';

// MEMBER_EMAIL/PASSWORD는 adminCrudHelpers의 공용 export가 아니다(admin-crud-qna-inquiries.spec.ts와
// 동일 패턴 — 회원 자격증명을 쓰는 스펙만 로컬로 읽는다).
const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL;
const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD;

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /insurance/apply(공개 신청 폼) → /admin/insurance
// (관리자 상담 상태 관리) → 회원 마이페이지(보험 분석 내역).
//
// ⚠️ /insurance(랜딩)와 /insurance/apply(실제 신청 폼)는 다른 화면이다 — /insurance의 "보험증권
// 업로드" 폼은 제출 데이터를 목업(고정값)으로 채우고 실제로 아무 곳에도 전송하지 않는다(실측
// 확인). 반드시 /insurance/recommend → "Link"를 거쳐 /insurance/apply로 진입해 실제 신청 폼을
// 채운다.
//
// ℹ️ 아래 두 제약은 #197(be/insurance-cert-pii-notify)로 해소됐다 (2026-07-23 현행화):
// - /insurance/apply에 증권 파일 첨부(선택)가 생겼다 — 업로드~signed URL 열람~PII 파기의
//   실구동은 admin-crud-insurance-cert.spec.ts가 담당한다. 이 스펙은 파일 없이 제출한다.
// - DELETE /api/admin/insurance/[id]가 생겨(스토리지 선삭제 포함) 정리가 가능해졌다.
//   이 스펙의 마지막 '완료' 상태 남기기는 상담 여정의 종결 검증으로 유지한다.
//
// 🚨 쓰기(write) 스펙 — E2E_ADMIN_CRUD=1 로 명시적으로 켜지 않으면 전체 skip. 절대 production을
// 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 보험 분석 신청', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');
  test.skip(!MEMBER_EMAIL || !MEMBER_PASSWORD, 'E2E_MEMBER_* secret 미주입 — 회원 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const petName = `E2E펫${runId}`;
  const memo = `E2E 상담 메모 ${runId}`;

  async function loginAsMember(page: import('@playwright/test').Page): Promise<void> {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(MEMBER_EMAIL!);
    await page.locator('input[type="password"]').fill(MEMBER_PASSWORD!);
    await page.getByRole('button', { name: /로그인/ }).first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
  }

  test('회원 신청 → 관리자 상담 상태·메모 저장 → 마이페이지 반영 확인', async ({ page }) => {
    // 1) 회원 로그인 → 실제 신청 폼(/insurance/apply) 제출.
    await loginAsMember(page);
    await page.goto('/insurance/apply');

    await page.getByPlaceholder('성명을 입력해 주세요').fill('E2E 테스트 보호자');
    await page.getByPlaceholder('010-0000-0000').fill('010-9876-5432');
    await page.getByPlaceholder('아이 이름').fill(petName);
    await page.locator('select').filter({ hasText: '강아지' }).first().selectOption('강아지');
    await page.getByPlaceholder(/말티즈|코리안 숏헤어/).fill('말티즈');
    await page.locator('input[type="number"]').first().fill('3');

    // 관심 보장 항목 — 버튼 토글, 최소 1개 필요(select/checkbox 아님).
    await page.getByRole('button', { name: '가성비 중심' }).click();

    // 필수 동의 체크박스 2개.
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    for (let i = 0; i < checkboxCount; i += 1) {
      await checkboxes.nth(i).check();
    }

    const submitButton = page.getByRole('button', { name: '무료 분석 신청하기' });
    await expect(submitButton).toBeEnabled({ timeout: 15_000 });
    await submitButton.click();
    await page.waitForURL(/\/insurance\/complete/, { timeout: 15_000 });

    // 2) 관리자로 로그인(별도 페이지) → 목록에서 방금 신청 건을 API로 찾아 상세로 이동.
    const adminPage = await page.context().browser()!.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(adminPage);
    const listRes = await adminPage.request.get('/api/admin/insurance');
    expect(listRes.ok()).toBe(true);
    const { applications } = (await listRes.json()) as { applications: Array<{ id: string; petName: string; status: string }> };
    const created = applications.find((a) => a.petName === petName);
    expect(created, `${petName} 신청 건이 admin API 목록에 없습니다`).toBeTruthy();
    const applicationId = created!.id;
    expect(created!.status).toBe('신청완료'); // 서버가 강제하는 초기 상태(route.ts:64)

    await adminPage.goto(`/admin/insurance/${applicationId}`);
    await expect(adminPage.locator('body')).toContainText(petName, { timeout: 15_000 });

    // 3) 상담 상태·메모 편집 — 배치 저장(SaveBar, dirty일 때만 노출). FormField가 htmlFor 없이
    // label을 형제로만 렌더해 getByLabel이 안 먹는다(home-settings와 동일 함정) — 컨테이너로 스코핑.
    const statusField = adminPage.locator('div.mb-6', { hasText: '상담 진행 상태' }).locator('select');
    await expect(statusField).toBeVisible({ timeout: 15_000 });

    // 빈/답변 전 상태가 화면에 우아하게 렌더되는지 확인 — 아직 아무도 상담하지 않은 신청 건은
    // select가 서버 강제 초기값(신청완료)을 보여주고 메모는 비어 있어야 한다.
    await expect(statusField).toHaveValue('신청완료');
    const memoField = adminPage.locator('div.mb-6', { hasText: '관리자 메모' }).locator('textarea');
    await expect(memoField).toHaveValue('');

    // 부정 케이스 — 화이트리스트에 없는 status는 400으로 거부되고 DB는 그대로다(ALLOWED_STATUSES,
    // insurance/[id]/route.ts:8).
    const invalidRes = await adminPage.request.patch(`/api/admin/insurance/${applicationId}`, {
      data: { status: '유효하지않은상태' },
    });
    expect(invalidRes.status()).toBe(400);
    const unchangedListRes = await adminPage.request.get('/api/admin/insurance');
    const unchangedList = (await unchangedListRes.json()) as { applications: Array<{ id: string; status: string }> };
    expect(
      unchangedList.applications.find((a) => a.id === applicationId)?.status,
      '유효하지 않은 status가 실제로 저장됐습니다',
    ).toBe('신청완료');

    await statusField.selectOption('상담중');
    await memoField.fill(memo);

    const saveBarButton = adminPage.getByRole('button', { name: '저장하기' });
    await expect(saveBarButton).toBeVisible({ timeout: 15_000 });
    const [patchRes] = await Promise.all([
      adminPage.waitForResponse(
        (res) => res.url().includes(`/api/admin/insurance/${applicationId}`) && res.request().method() === 'PATCH',
        { timeout: 15_000 },
      ),
      saveBarButton.click(),
    ]);
    expect(patchRes.ok(), `PATCH /api/admin/insurance/${applicationId} 실패(status=${patchRes.status()})`).toBe(true);
    // 저장 성공은 onUpdate()의 재조회로 화면이 다시 그려진다(alert 없음) — SaveBar가 사라짐으로 확인.
    await expect(saveBarButton).toBeHidden({ timeout: 15_000 });

    // 4) 새로고침 후에도 유지되는지 확인 + API 재조회로 이중 확인.
    await adminPage.reload();
    await expect(adminPage.locator('body')).toContainText('상담중', { timeout: 15_000 });
    const verifyRes = await adminPage.request.get('/api/admin/insurance');
    const verified = (await verifyRes.json()) as { applications: Array<{ id: string; status: string; memo?: string }> };
    const verifiedApp = verified.applications.find((a) => a.id === applicationId);
    expect(verifiedApp!.status).toBe('상담중');
    expect(verifiedApp!.memo).toBe(memo);

    // 5) 회원 마이페이지에도 상태 변경이 반영되는지 확인(InsuranceSection.tsx 상태 배지).
    await page.goto('/mypage?tab=insurance');
    const card = page.locator('body');
    await expect(card).toContainText(petName, { timeout: 15_000 });
    await expect(card).toContainText('상담중');

    // 6) "정리" — 실제 삭제 수단이 없으므로(주석 참조) 상태를 '완료'로 남겨 처리 완료임을 표시한다.
    // ⚠️ SaveBar가 사라지는 것만으로는 PATCH 성공을 보장하지 않는다(실측 — 위 3)의 첫 저장에서
    // 겪은 것과 동일한 레이스). PATCH 응답을 직접 기다리고 API 재조회로 반영을 확인한다.
    await adminPage.goto(`/admin/insurance/${applicationId}`);
    const finalStatusField = adminPage.locator('div.mb-6', { hasText: '상담 진행 상태' }).locator('select');
    await finalStatusField.selectOption('완료');
    const [cleanupPatchRes] = await Promise.all([
      adminPage.waitForResponse(
        (res) => res.url().includes(`/api/admin/insurance/${applicationId}`) && res.request().method() === 'PATCH',
        { timeout: 15_000 },
      ),
      adminPage.getByRole('button', { name: '저장하기' }).click(),
    ]);
    expect(cleanupPatchRes.ok(), `정리 PATCH 실패(status=${cleanupPatchRes.status()})`).toBe(true);
    await expect(adminPage.getByRole('button', { name: '저장하기' })).toBeHidden({ timeout: 15_000 });

    const cleanupVerifyRes = await adminPage.request.get('/api/admin/insurance');
    const cleanupVerified = (await cleanupVerifyRes.json()) as { applications: Array<{ id: string; status: string }> };
    expect(cleanupVerified.applications.find((a) => a.id === applicationId)?.status).toBe('완료');

    await adminPage.close();
  });
});
