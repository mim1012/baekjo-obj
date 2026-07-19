import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /landing/care-kit#partner(공개 제휴 문의 폼) →
// /admin/partner-inquiries(관리자 상태·메모 관리).
//
// ⚠️ 이 도메인은 신규 등록 버튼이 없다(page.tsx 주석 — onCreateRow 미지정, 공개 랜딩 폼 제출만
// 쌓인다). 관리자 쪽은 수정 모달에서 상태/메모를 저장하는 즉시 PATCH다(2026-07-18 즉시저장 전환).
//
// 🚨 삭제/정리 수단이 없다 — DELETE 라우트가 아예 없고, AdminResourcePage의 '삭제' 버튼은
// onDeleteRow가 지정되지 않아 로컬 state만 지우는 가짜 삭제다(새로고침하면 되돌아옴, 실측 확인).
// 이 스펙이 만드는 테스트 문의는 staging에 영구히 남는다 — 상태를 '완료'로 남겨 "처리 완료" 신호를
// 주는 것 외에 진짜 정리는 불가능하다(팀리드 지시 "삭제 경로 없으면 문서화" 원칙 적용).
//
// 🚨 쓰기(write) 스펙 — E2E_ADMIN_CRUD=1 로 명시적으로 켜지 않으면 전체 skip. 절대 production을
// 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — B2B 제휴 문의', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const companyName = `E2E-제휴-${runId}`;
  const contactPerson = 'E2E 테스트 담당자';
  const memo = `E2E 관리자 메모 ${runId}`;
  const INQUIRIES_SEARCH_PLACEHOLDER = '업체명·담당자·문의 내용 검색...';

  test('공개 폼 제출 → 관리자 검색 → 상태·메모 저장 → 새로고침 후 영속성 확인', async ({ page }) => {
    // 1) 공개 제휴 문의 폼 제출(로그인 불필요 — 익명 리드 폼).
    await page.goto('/landing/care-kit#partner');
    await page.locator('#partner-company').fill(companyName);
    await page.locator('#partner-contact-name').fill(contactPerson);
    await page.locator('#partner-contact-phone').fill('010-1234-5678');
    await page.locator('#partner-email').fill(`e2e-partner-${runId}@test.baekjo`);
    await page.locator('#partner-type').selectOption('etc');
    await page.locator('#partner-inquiry').fill(`E2E 테스트 문의 내용 ${runId}`);
    await page.locator('#partner-agree').check();

    const submitButton = page.getByRole('button', { name: '제휴 문의 제출하기' });
    await expect(submitButton).toBeEnabled();
    await submitButton.click();
    await expect(page.getByText(/제휴 문의가 접수되었습니다/)).toBeVisible({ timeout: 15_000 });

    // 2) 관리자로 검색 → 수정 모달 열기.
    await loginAsAdmin(page);
    await page.goto('/admin/partner-inquiries');
    await page.getByPlaceholder(INQUIRIES_SEARCH_PLACEHOLDER).fill(companyName);

    const row = page.locator('tr.cursor-pointer', { hasText: companyName });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText('접수'); // 초기 상태 — PARTNER_INQUIRY_STATUSES[0]

    await row.getByRole('button', { name: '수정' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    await dialog.getByLabel('상태').selectOption('상담중');
    await dialog.getByLabel('메모').fill(memo);
    await dialog.getByRole('button', { name: '저장' }).click();
    await expect(dialog).toBeHidden({ timeout: 15_000 });

    // 저장 반영을 목록에서 확인 — 검색 재입력으로 최신 목록을 다시 불러온다.
    await page.getByPlaceholder(INQUIRIES_SEARCH_PLACEHOLDER).fill(companyName);
    await expect(row).toContainText('상담중', { timeout: 15_000 });

    // 3) 새로고침 후에도 유지되는지 확인.
    await page.reload();
    await page.getByPlaceholder(INQUIRIES_SEARCH_PLACEHOLDER).fill(companyName);
    const reloadedRow = page.locator('tr.cursor-pointer', { hasText: companyName });
    await expect(reloadedRow).toContainText('상담중', { timeout: 15_000 });

    // 확장 패널에서 메모·문의 전문이 반영됐는지 필드 단위로 확인(renderExpandedRow).
    await reloadedRow.click();
    await expect(page.getByText(memo)).toBeVisible({ timeout: 15_000 });

    // API 재조회로도 이중 확인.
    const verifyRes = await page.request.get('/api/admin/partner-inquiries');
    expect(verifyRes.ok()).toBe(true);
    const { inquiries } = (await verifyRes.json()) as { inquiries: Array<{ id: string; companyName: string; status: string; memo?: string }> };
    const created = inquiries.find((i) => i.companyName === companyName);
    expect(created, '방금 제출한 제휴 문의가 admin API 목록에 없습니다').toBeTruthy();
    expect(created!.status).toBe('상담중');
    expect(created!.memo).toBe(memo);

    // 부정 케이스 — 화이트리스트에 없는 status 값은 400으로 거부되고 DB는 그대로다
    // (validatePatchBody, partner-inquiries/[id]/route.ts).
    const invalidRes = await page.request.patch(`/api/admin/partner-inquiries/${created!.id}`, {
      data: { status: '유효하지않은상태' },
    });
    expect(invalidRes.status()).toBe(400);
    const unchangedRes = await page.request.get('/api/admin/partner-inquiries');
    const unchanged = (await unchangedRes.json()) as { inquiries: Array<{ id: string; status: string }> };
    expect(
      unchanged.inquiries.find((i) => i.id === created!.id)?.status,
      '유효하지 않은 status가 실제로 저장됐습니다',
    ).toBe('상담중');

    // 4) "정리" — 실제 삭제 수단이 없으므로(주석 참조) 상태를 '완료'로 남겨 처리 완료임을 표시한다.
    // 이 문의는 staging에 영구히 남는다 — 알려진 제약(팀리드 보고 대상).
    // ⚠️ 모달이 닫히는 것(toBeHidden)만으로는 PATCH가 실제로 성공했는지 보장하지 않는다 — 실측
    // 결과 이 마지막 단계가 네트워크 완료를 기다리지 않아 여러 실행에서 실제로는 '상담중'에
    // 머물러 있었다(admin API 재조회로 확인). PATCH 응답 자체를 명시적으로 기다린다.
    await page.getByPlaceholder(INQUIRIES_SEARCH_PLACEHOLDER).fill(companyName);
    await page.locator('tr.cursor-pointer', { hasText: companyName }).getByRole('button', { name: '수정' }).click();
    await page.getByRole('dialog').getByLabel('상태').selectOption('완료');
    const [cleanupPatchRes] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/admin/partner-inquiries/') && res.request().method() === 'PATCH',
        { timeout: 15_000 },
      ),
      page.getByRole('dialog').getByRole('button', { name: '저장' }).click(),
    ]);
    expect(cleanupPatchRes.ok(), `정리 PATCH 실패(status=${cleanupPatchRes.status()})`).toBe(true);
    await expect(page.getByRole('dialog')).toBeHidden({ timeout: 15_000 });

    // 정리가 실제로 반영됐는지 API 재조회로 확인 — "닫혔으니 됐겠지"를 신뢰하지 않는다.
    const cleanupVerifyRes = await page.request.get('/api/admin/partner-inquiries');
    const cleanupVerified = (await cleanupVerifyRes.json()) as { inquiries: Array<{ companyName: string; status: string }> };
    expect(cleanupVerified.inquiries.find((i) => i.companyName === companyName)?.status).toBe('완료');
  });
});
