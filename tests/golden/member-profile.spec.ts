import { test, expect } from '@playwright/test';
import { CRUD_ENABLED, bypassHeaders } from './_lib/adminCrudHelpers';
import { MEMBER_EMAIL, MEMBER_PASSWORD, loginAsMember } from './_lib/memberCrudHelpers';

// 골든플로우 회원 여정(wave6) — 마이페이지 프로필(회원정보 수정) + 배송 추적 모달.
//
// 🚨 발견(버그 후보, mim 확인 필요) — ProfileSection.tsx:25 "회원정보 저장"은
// `setCurrentUser()`(src/lib/storage.ts:1190)만 호출한다. 이 함수는 **localStorage만 쓰고
// API 호출이 전혀 없다** — 서버 회원 레코드(members 테이블)에 반영되지 않는다. §4 원칙0
// "Mock는 DB에 시드된 순간 죽는다"의 반례로, 이 폼은 Phase 1 mock 잔재로 보인다. 이 스펙은
// 실제로 관찰 가능한 동작(같은 세션에서 로컬 반영·"저장되었습니다" 토스트)만 검증하고,
// **서버에 반영되지 않는다는 것도 명시적으로 증명**한다(새 세션/새로고침 후 서버가 재조회한
// 값으로 되돌아옴) — 조용히 넘어가지 않는다.
//
// 비밀번호 변경(PasswordChangeSection)은 의도적으로 SKIP한다 — 이 스펙이 쓰는 고정 E2E 계정
// 크리덴셜을 바꾸면 이후 모든 wave6 스펙의 로그인이 깨진다(팀 지시사항).
test.describe('골든플로우: 회원 여정 — 마이페이지 프로필·배송추적', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!MEMBER_EMAIL || !MEMBER_PASSWORD, 'E2E_MEMBER_* secret 미주입 — 회원 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });

  test('회원정보 수정은 같은 세션에서만 반영되고 새 세션에는 반영되지 않는다(서버 미영속 — 알려진 결함)', async ({
    browser,
  }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsMember(page);
    await page.goto('/mypage?tab=profile');
    await expect(page.getByRole('heading', { name: '회원정보 수정' })).toBeVisible({ timeout: 15_000 });

    const runId = Date.now();
    const editedName = `E2E프로필${runId}`;
    const nameInput = page.locator('input[name="name"]');
    await nameInput.fill(editedName);
    await page.getByRole('button', { name: '회원정보 저장' }).click();
    await expect(page.getByText('저장되었습니다.')).toBeVisible({ timeout: 10_000 });

    // 같은 세션·새로고침에는 반영된다(localStorage에 그대로 남아 getCurrentUser가 그걸 읽음).
    await page.reload();
    await expect(page.locator('input[name="name"]')).toHaveValue(editedName, { timeout: 15_000 });
    await page.close();

    // 새 브라우저 컨텍스트(=localStorage 없음)로 다시 로그인하면 서버(/api/members/me)가
    // 재조회한 원래 이름으로 돌아온다 — 서버에는 전혀 반영되지 않았다는 뜻.
    const freshContext = await browser.newContext({ extraHTTPHeaders: bypassHeaders() });
    const freshPage = await freshContext.newPage();
    await loginAsMember(freshPage);
    await freshPage.goto('/mypage?tab=profile');
    await expect(freshPage.locator('input[name="name"]')).not.toHaveValue(editedName, { timeout: 15_000 });
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
