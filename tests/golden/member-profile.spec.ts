import { test, expect } from '@playwright/test';
import { CRUD_ENABLED, bypassHeaders } from './_lib/adminCrudHelpers';
import { MEMBER_EMAIL, MEMBER_PASSWORD, loginAsMember } from './_lib/memberCrudHelpers';

// 골든플로우 회원 여정(wave6) — 마이페이지 프로필(회원정보 수정) + 배송 추적 모달.
//
// ✅ 실제 영속 확인(2026-07-19) — wave6 조사 중 발견했던 "회원정보 저장이 localStorage만
// 쓰고 서버에 반영되지 않는다"는 결함은 PR #171(fe/behavior-profile-save-wire, fix(mypage):
// 회원정보 저장 실배선)로 이미 고쳐져 main에 머지됐다. 지금 `ProfileSection.tsx`의 저장은
// `updateMyProfile()`(src/lib/storage.ts) → `PATCH /api/members/me`를 실제로 호출하고,
// 성공 시 서버가 돌려준 `result.user`로 로컬 캐시(setCurrentUser)를 갱신한다("서버가
// 진실이므로 200 응답을 받은 뒤에만 로컬 캐시를 갱신"). 그래서 이 스펙은 더 이상 "미영속"을
// 증명하지 않고 **실제 서버 영속**을 증명한다: 편집 → 저장(서버 200) → 새 브라우저 컨텍스트로
// 재로그인해도 서버가 재조회한 값이 그대로 보여야 한다.
//
// 🧹 테스트 후 원래 이름으로 복원한다 — 이 계정(member-e2e@test.baekjo)은 고정 공유 E2E
// 계정이라, 영속이 실제로 되는 지금은 복원하지 않으면 이름이 매 실행마다 새 값으로 계속
// 바뀌어 남는다(예전엔 미영속이라 자동으로 원복됐지만 이제는 아니다).
//
// 비밀번호 변경(PasswordChangeSection)은 의도적으로 SKIP한다 — 이 스펙이 쓰는 고정 E2E 계정
// 크리덴셜을 바꾸면 이후 모든 wave6 스펙의 로그인이 깨진다(팀 지시사항).
test.describe('골든플로우: 회원 여정 — 마이페이지 프로필·배송추적', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!MEMBER_EMAIL || !MEMBER_PASSWORD, 'E2E_MEMBER_* secret 미주입 — 회원 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });

  test('회원정보 수정은 서버(members 테이블)에 실제로 영속되어 새 세션에서도 그대로 보인다', async ({
    browser,
  }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsMember(page);
    await page.goto('/mypage?tab=profile');
    await expect(page.getByRole('heading', { name: '회원정보 수정' })).toBeVisible({ timeout: 15_000 });

    const nameInput = page.locator('input[name="name"]');
    const originalName = await nameInput.inputValue();

    const runId = Date.now();
    const editedName = `E2E프로필${runId}`;

    async function saveName(target: import('@playwright/test').Page, name: string): Promise<void> {
      await target.locator('input[name="name"]').fill(name);
      await target.getByRole('button', { name: '회원정보 저장' }).click();
      await expect(target.getByText('저장되었습니다.')).toBeVisible({ timeout: 10_000 });
    }

    await saveName(page, editedName);

    // 같은 세션·새로고침엔 당연히 반영된다(로컬 캐시가 서버 응답으로 갱신됨).
    await page.reload();
    await expect(page.locator('input[name="name"]')).toHaveValue(editedName, { timeout: 15_000 });
    await page.close();

    // 새 브라우저 컨텍스트(=localStorage 없음)로 다시 로그인 — 서버(/api/members/me)가
    // 실제로 저장한 값을 재조회해서 보여줘야 한다(예전엔 여기서 원래 값으로 되돌아갔었다).
    const freshContext = await browser.newContext({ extraHTTPHeaders: bypassHeaders() });
    const freshPage = await freshContext.newPage();
    await loginAsMember(freshPage);
    await freshPage.goto('/mypage?tab=profile');
    await expect(freshPage.locator('input[name="name"]')).toHaveValue(editedName, { timeout: 15_000 });

    // 정리 — 공유 E2E 계정 이름을 원상복구(더 이상 미영속이 아니므로 복원하지 않으면 영구 드리프트).
    await saveName(freshPage, originalName);
    await freshContext.close();
  });

  test('배송 추적 모달이 열린다(주문이 있을 때만 — 없으면 스킵)', async ({ page: sharedPage }) => {
    const page = sharedPage;
    await loginAsMember(page);
    await page.goto('/mypage?tab=orders');

    const trackButton = page.getByRole('button', { name: /배송\s*조회|배송\s*추적/ }).first();
    const hasTrackableOrder = (await trackButton.count()) > 0;
    test.skip(!hasTrackableOrder, '이 계정에 배송 추적 가능한 주문이 없음 — 렌더 확인 대상 없어 스킵');

    await trackButton.click();
    await expect(page.getByRole('dialog').or(page.locator('.fixed.inset-0'))).toBeVisible({ timeout: 10_000 });
  });
});
