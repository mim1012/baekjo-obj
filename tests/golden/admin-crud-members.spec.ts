import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /admin/members → 회원 승인/상태 관리 패널.
//
// 이 도메인은 notices/home-settings와 근본적으로 다르다 — 자유롭게 왕복 가능한 필드가 아니라
// **단방향 상태 게이트**다. MemberRoleStatusPanel.tsx:23의 `canUpdate = isPending && !isAdmin`이
// "승인 대기(pending) 상태에서만" 변경을 허용하도록 select 자체를 disabled 시키고, 서버도 동일한
// 규칙을 강제한다 — src/app/api/admin/members/[id]/route.ts:8(TARGET_STATUSES=['active','rejected']만
// 허용) + :56(`target.status !== 'pending'`이면 409 conflict) + repo.ts:317
// (`.eq('status', expectedCurrentStatus)`로 DB 레벨 조건부 업데이트, expectedCurrentStatus는
// 라우트가 'pending'으로 하드코딩). 즉 pending → active/rejected는 관리자의 "결정"이며 되돌리는
// API가 존재하지 않는다(rejected/active → pending 전환 라우트 없음, pending 자체도
// TARGET_STATUSES에 없어 시도해도 400).
//
// 그래서 이 스펙은 다른 wave의 snapshot/restore 패턴과 겉모습은 같지만 의미가 다르다:
// - member-e2e@test.baekjo가 **현재 pending일 때만** 실제 상태 변경(pending → active)과
//   새로고침 후 영속성 검증을 수행한다 — 이게 이 스펙의 핵심 회귀 방지 지점("저장은 됐는데
//   새로고침하면 되돌아온다" 버그 클래스, admin-crud-notices.spec.ts와 동일한 관심사).
// - **pending이 아니면(canUpdate=false, SaveBar 자체가 렌더되지 않음) 상태 변경 스텝 전체를
//   test.skip으로 건너뛴다** — UI가 애초에 변경을 허용하지 않는 상태에서 억지로 select를
//   조작하려 하면 disabled 필드를 채우려는 무의미한 실패만 남는다.
// - **원복(restore)은 이 도메인에서 API가 지원하지 않으므로 "성공을 기대하지 않는 안전망 시도"로만
//   구현한다** — home-settings의 afterAll처럼 실패를 허용하고 로그로 남긴다(단, 여기서는 실패가
//   버그가 아니라 설계된 단방향 게이트라는 점이 다르다). 이 스펙을 실행하면 member-e2e@test.baekjo는
//   pending → active로 **영구 전이**되며, 다음 실행을 위해 이 계정을 다시 pending으로 되돌리는 것은
//   시드/마이그레이션 등 별도 경로가 필요하다(§ 열린 위험 — 보고서 참고).
//
// 🚨 쓰기(write) 스펙 — 실제 DB에 데이터를 만든다(승인 처리는 되돌릴 수 없음). E2E_ADMIN_CRUD=1 로
// 명시적으로 켜지 않으면 전체 skip. 절대 production을 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
// 🚫 새 회원 가입(signup) 금지, member-e2e@test.baekjo 외 계정(특히 admin@naver.com) 절대 건드리지 않음.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 회원 상태 관리', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const TARGET_EMAIL = 'member-e2e@test.baekjo';
  const MEMBERS_SEARCH_PLACEHOLDER = '이름, 이메일, 연락처, 회사명 검색';

  // beforeAll/afterAll 양쪽에서 참조 — afterAll은 mutated가 true일 때만(=실제로 pending→active
  // 전이를 실행했을 때만) 원복을 "시도"한다. home-settings의 `if (!originalSettings) return;`와
  // 동일한 얼리 가드 역할.
  let originalStatus: string | undefined;
  let memberId: string | undefined;
  let mutated = false;

  test.afterAll(async ({ browser }) => {
    if (!mutated || !memberId || !originalStatus) return;
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    // ⚠️ 이 PATCH는 성공을 기대하지 않는다 — originalStatus는 항상 'pending'인데(mutated=true는
    // pending일 때만 세팅됨) 서버가 'pending'을 TARGET_STATUSES로 허용하지 않아(route.ts:8) 400이,
    // 설령 그 검증을 통과해도 현재 status가 이미 'active'라 `.eq('status','pending')` 조건부
    // 업데이트가 걸려(repo.ts:317) 데이터가 안 바뀐다. 실패는 버그가 아니라 설계된 단방향 게이트다 —
    // 그래도 "복원 실패는 반드시 시끄럽게 알린다"는 이 프로젝트의 원칙(home-settings 패턴)은 지킨다.
    const restoreRes = await page.request.patch(`/api/admin/members/${encodeURIComponent(memberId)}`, {
      data: { status: originalStatus },
    });
    if (!restoreRes.ok()) {
      console.warn(
        `[admin-crud-members] member-e2e@test.baekjo를 '${originalStatus}'로 되돌리는 시도가 ` +
          `실패했습니다(status=${restoreRes.status()}) — 이 도메인은 pending→active/rejected가 ` +
          '단방향 게이트라 API 차원에서 복원이 불가능합니다(설계된 동작). 다음 실행을 위해 이 ' +
          '테스트 계정을 pending으로 되돌리려면 시드/마이그레이션 등 별도 경로가 필요합니다.',
      );
    } else {
      console.warn('[admin-crud-members] 예상과 달리 원복 PATCH가 성공했습니다 — API 동작이 바뀌었는지 확인 필요.');
    }
    await page.close();
  });

  test('회원 상세 조회 → (pending인 경우만) 승인 처리 → 새로고침 후 영속성 확인', async ({ page }) => {
    await loginAsAdmin(page);

    // 1) API로 현재 상태 스냅샷 — UI 검색/클릭보다 먼저, 신뢰 가능한 진실 소스로 기록해둔다.
    const listRes = await page.request.get('/api/admin/members');
    expect(listRes.ok()).toBe(true);
    const { users } = (await listRes.json()) as { users: Array<{ id: string; email: string; status: string; role: string }> };
    const target = users.find((u) => u.email === TARGET_EMAIL);
    expect(target, `${TARGET_EMAIL} 테스트 계정이 회원 목록에 없습니다 — 스테이징 시드를 확인하세요.`).toBeTruthy();
    memberId = target!.id;
    originalStatus = target!.status;
    // 실수로 다른 계정(특히 admin)을 건드리지 않도록 이중 확인.
    expect(target!.role, 'member-e2e@test.baekjo가 admin 역할이면 이 스펙 대상이 아닙니다').not.toBe('admin');

    // 2) 목록 화면에서 검색 → 상세보기 클릭 (UI를 통한 탐색 — 골든플로우 #7 소모 대상 그 자체).
    await page.goto('/admin/members');
    await page.getByPlaceholder(MEMBERS_SEARCH_PLACEHOLDER).fill(TARGET_EMAIL);
    const row = page.locator('tr', { hasText: TARGET_EMAIL });
    await expect(row).toHaveCount(1, { timeout: 15_000 });
    await row.getByRole('link', { name: '상세보기' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/members/${memberId}$`));
    await expect(page.locator('body')).toContainText(TARGET_EMAIL);

    // 3) 현재 상태 배지가 API 스냅샷과 일치하는지 확인 (MemberDetailPage.tsx:78-86 getStatusBadge).
    const statusLabels: Record<string, string> = {
      active: '활성 (승인완료)',
      pending: '승인 대기',
      inactive: '비활성 (정지)',
      rejected: '반려',
    };
    const expectedLabel = statusLabels[originalStatus] ?? originalStatus;
    await expect(page.locator('body')).toContainText(expectedLabel);

    // 4) ⚠️ pending이 아니면 MemberRoleStatusPanel.tsx:23의 canUpdate가 false라 select가
    // disabled이고 SaveBar 자체가 렌더되지 않는다 — 억지로 조작할 대상이 없으므로 여기서 skip한다.
    test.skip(
      originalStatus !== 'pending',
      `member-e2e@test.baekjo가 현재 '${originalStatus}' 상태라 이 admin 패널은 상태 변경을 ` +
        "허용하지 않습니다(canUpdate=isPending && !isAdmin, MemberRoleStatusPanel.tsx:23). " +
        '승인 대기(pending)일 때만 실제 CRUD(승인→영속성 확인)를 수행합니다.',
    );

    // --- 아래는 originalStatus === 'pending'일 때만 실행된다 ---

    const statusSelect = page.locator('div.mb-6', { hasText: '계정 상태' }).locator('select');
    await expect(statusSelect).toBeEnabled({ timeout: 15_000 });
    await statusSelect.selectOption('active');
    // PR #196: 상태 변경 저장 전 오조작 방지 window.confirm이 뜬다 — 수락해야 PATCH가 나간다.
    page.once('dialog', (dialog) => void dialog.accept());
    await page.getByRole('button', { name: '저장하기' }).click();

    // 5) 승인 처리는 alert가 아니라 onUpdate()로 화면을 다시 그린다 — 배지 텍스트 갱신으로 성공 확인.
    mutated = true; // 여기서부터는 afterAll이 원복을 시도해야 하는 상태 — 실패는 위 주석대로 예상된 것.
    await expect(page.locator('body')).toContainText(statusLabels.active, { timeout: 15_000 });

    // 6) 새로고침 후에도 유지되는지 확인 — "저장은 됐는데 새로고침하면 되돌아온다" 버그 클래스를
    // 정확히 잡는 지점(admin-crud-notices.spec.ts의 삭제-후-새로고침 검증과 동일한 관심사).
    await page.reload();
    await expect(page.locator('body')).toContainText(statusLabels.active, { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText(statusLabels.pending);

    // 7) 승인 후에는 UI 자체가 더 이상 변경 수단을 제공하지 않는다(select disabled, SaveBar 없음) —
    // 원복은 afterAll의 API 레벨 시도(성공 기대 안 함)에 맡긴다. 여기서는 그 사실 자체를 확인해
    // "복원 수단이 없다"는 문서화된 제약이 실제로도 그런지 검증한다.
    const selectAfterApproval = page.locator('div.mb-6', { hasText: '계정 상태' }).locator('select');
    await expect(selectAfterApproval).toBeDisabled();
  });
});
