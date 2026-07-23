import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /signup(B2B 업체 탭) → 관리자 승인(pending → active).
//
// admin-crud-members.spec.ts는 고정된 테스트 계정(member-e2e@test.baekjo)의 "현재" 상태가
// pending일 때만 실제 승인 전이를 검증하고, 아니면 정직하게 skip한다(단방향 게이트라 원복 불가 —
// 그 스펙의 주석 참고). 이 스펙은 그 한계를 메운다 — **매 실행마다 새 B2B 계정을 만들어 반드시
// pending으로 시작**시켜, 실행할 때마다 결정론적으로 승인 전이 자체를 실구동 검증한다.
//
// ⚠️ B2B(파트너 아님) 탭을 고른 이유 — PartnerSignupForm은 실제 파일 업로드 플로우
// (POST /api/members/business/upload)가 있어 추가로 몰아야 하지만, B2B 폼의 파일 입력은
// 값이 제출 페이로드에 아예 반영되지 않는 장식용 필드다(handleSubmit이 체크박스 불리언만으로
// mockFiles를 구성 — 실측 확인). 텍스트/체크박스 필드만으로 유효한 신청을 완주할 수 있다.
//
// ⚠️ 이메일 인증 없음 — insertBusinessMember는 조건 없이 항상 status:'pending'으로 즉시 삽입한다
// (business/route.ts 주석: "승인 전이므로 인증 메일은 보내지 않는다"). 계정은 제출 즉시 DB에 존재한다.
//
// 🚨 이 스펙이 만드는 계정은 실제 staging 회원 레코드로 영구히 남는다(회원 삭제 API 없음) —
// member-e2e@test.baekjo(기존 wave3 스펙 대상)와 달리 이 계정은 이 스펙이 직접 만든 것이라
// active로 전이해도 "기존 계정을 건드리는" 문제가 없다. 매 실행 고유 타임스탬프 이메일 사용.
//
// 🚨 쓰기(write) 스펙 — E2E_ADMIN_CRUD=1 로 명시적으로 켜지 않으면 전체 skip. 절대 production을
// 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 회원 승인(B2B 신규가입 pending→active)', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const email = `e2e-b2b-${runId}@test.baekjo`;
  const companyName = `E2E B2B 테스트 업체 ${runId}`;

  test('B2B 신규가입(즉시 pending) → 관리자 승인 → 새로고침 후 영속성 확인', async ({ page }) => {
    // 1) B2B 탭으로 가입 신청.
    await page.goto('/signup');
    await page.getByRole('button', { name: 'B2B 업체' }).click();

    await page.getByLabel('업체명 *').fill(companyName);
    await page.getByLabel('대표자명 *').fill('E2E 테스트 대표');
    await page.getByLabel('사업자등록번호 *').fill('000-00-00000');
    await page.getByLabel('업종 *').fill('테스트업');
    await page.getByLabel('설립연도 *').fill('2020');
    await page.getByLabel('담당자명 *').fill('E2E 테스트 담당자');
    await page.getByLabel('연락처 *').fill('010-1111-2222');
    await page.getByLabel('이메일 *').fill(email);
    await page.getByLabel('사업장 주소 *').fill('서울시 테스트구 테스트로 1');
    await page.getByLabel('비밀번호 *').fill('e2eTestPw123');
    await page.getByLabel('비밀번호 확인 *').fill('e2eTestPw123');

    await page.getByLabel('업체를 한 문장으로 소개해주세요. *').fill('E2E 테스트 업체 소개');
    await page.getByLabel('주요 서비스 및 운영 내용을 알려주세요. *').fill('E2E 테스트 서비스');
    await page.getByLabel('백조 오브제와 함께하고 싶은 이유를 알려주세요. *').fill('E2E 테스트 사유');

    await page.getByLabel('사업자등록증 (필수)').check();

    await page.getByLabel('운영 시간 *').fill('평일 09:00-18:00');
    await page.getByLabel('제공 서비스 *').fill('E2E 테스트 서비스 제공');
    await page.getByLabel('서비스 가능 지역 *').fill('서울 전 지역');

    await page.getByLabel('[필수] 동의합니다.').check();

    await page.getByRole('button', { name: '가입 신청하기' }).click();
    await expect(page.getByRole('heading', { name: '가입 신청 완료' })).toBeVisible({ timeout: 15_000 });

    // 2) 관리자 API로 방금 만든 계정을 찾아 pending 상태 확인(신뢰 가능한 진실 소스).
    const adminPage = await page.context().browser()!.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(adminPage);
    const listRes = await adminPage.request.get('/api/admin/members');
    expect(listRes.ok()).toBe(true);
    const { users } = (await listRes.json()) as {
      users: Array<{ id: string; email: string; status: string; role: string }>;
    };
    const target = users.find((u) => u.email === email);
    expect(target, `${email} 계정이 admin API 목록에 없습니다`).toBeTruthy();
    expect(target!.role).toBe('b2b');
    expect(target!.status).toBe('pending'); // insertBusinessMember가 항상 강제하는 초기 상태
    const memberId = target!.id;

    // 3) 관리자 UI에서 검색 → 상세 → 승인(pending → active). 기존 members 스펙과 동일한 UI 경로.
    await adminPage.goto('/admin/members');
    await adminPage.getByPlaceholder('이름, 이메일, 연락처, 회사명 검색').fill(email);
    const row = adminPage.locator('tr', { hasText: email });
    await expect(row).toHaveCount(1, { timeout: 15_000 });
    await row.getByRole('link', { name: '상세보기' }).click();
    await expect(adminPage).toHaveURL(new RegExp(`/admin/members/${memberId}$`));
    await expect(adminPage.locator('body')).toContainText('승인 대기');

    const statusSelect = adminPage.locator('div.mb-6', { hasText: '계정 상태' }).locator('select');
    await expect(statusSelect).toBeEnabled({ timeout: 15_000 });
    await statusSelect.selectOption('active');
    // PR #196: 상태 변경 저장 전 오조작 방지 window.confirm이 뜬다 — 수락해야 PATCH가 나간다.
    adminPage.once('dialog', (dialog) => void dialog.accept());
    const [patchRes] = await Promise.all([
      adminPage.waitForResponse(
        (res) =>
          res.url().includes(`/api/admin/members/${encodeURIComponent(memberId)}`) &&
          res.request().method() === 'PATCH',
        { timeout: 30_000 },
      ),
      adminPage.getByRole('button', { name: '저장하기' }).click(),
    ]);
    expect(patchRes.ok()).toBe(true);
    await expect(adminPage.getByRole('button', { name: '저장하기' })).toBeHidden({ timeout: 30_000 });
    await expect(adminPage.locator('body')).toContainText('활성 (승인완료)', { timeout: 15_000 });

    // 4) 새로고침 후에도 유지되는지 확인 + API 재조회로 이중 확인.
    await adminPage.reload();
    await expect(adminPage.locator('body')).toContainText('활성 (승인완료)', { timeout: 15_000 });
    const verifyRes = await adminPage.request.get('/api/admin/members');
    const verified = (await verifyRes.json()) as { users: Array<{ id: string; status: string }> };
    expect(verified.users.find((u) => u.id === memberId)?.status).toBe('active');

    // 5) 승인 후의 전이 계약(#196 정지 전이 매트릭스, statusTransitions.ts): active는 select가
    //    열려 있되 전이 대상은 inactive(정지)뿐이다 — pending/rejected로의 역전이는 제공하지 않는다.
    //    (2026-07-23 개정: 종전 "단방향 게이트(select disabled)" 단언은 #196 이전 계약이었다.
    //    members_signup 도메인 스펙이 평소 CI에서 안 돌다 커버리지 전수 스윕에서 드리프트로 적발 —
    //    화면이 아니라 스펙이 낡은 케이스로 판정, 매트릭스 그대로를 더 강하게 단언한다.)
    const postApproveSelect = adminPage.locator('div.mb-6', { hasText: '계정 상태' }).locator('select');
    await expect(postApproveSelect).toBeEnabled();
    const optionValues = await postApproveSelect
      .locator('option')
      .evaluateAll((els) => els.map((el) => (el as HTMLOptionElement).value).sort());
    expect(optionValues).toEqual(['active', 'inactive']);

    await adminPage.close();
  });
});
