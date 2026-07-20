import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CRUD_ENABLED,
  bypassHeaders,
  loginAsAdmin,
  loginWithCredentials,
} from './_lib/adminCrudHelpers';

test.describe('골든플로우: 회원 여정 — 비밀번호 변경', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 임시 회원 상태 확인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });

  test('임시 이메일 회원은 마이페이지에서 비밀번호를 변경한 뒤 새 비밀번호로만 로그인된다', async ({ browser }) => {
    const runId = Date.now();
    const email = `e2e-password-${runId}@test.baekjo`;
    const initialPassword = `E2Einit${runId}`;
    const changedPassword = `E2Echanged${runId}`;

    const setupPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    const signupResponse = await setupPage.request.post('/api/members', {
      data: {
        name: `E2E비번${runId}`,
        email,
        password: initialPassword,
        phone: '010-3333-4444',
        petType: 'dog',
        breed: '테스트견',
        mainConcern: 'skin',
      },
    });
    expect(signupResponse.status()).toBe(201);

    await loginAsAdmin(setupPage);
    const listResponse = await setupPage.request.get('/api/admin/members');
    expect(listResponse.ok()).toBe(true);
    const { users } = (await listResponse.json()) as {
      users: Array<{
        readonly id: string;
        readonly email: string;
        readonly status: 'active' | 'inactive' | 'pending' | 'rejected';
      }>;
    };
    const member = users.find((user) => user.email === email);
    if (!member) {
      throw new Error(`${email} 계정이 admin API 목록에 없습니다`);
    }
    if (member.status !== 'active') {
      const activateResponse = await setupPage.request.patch(`/api/admin/members/${encodeURIComponent(member.id)}`, {
        data: { status: 'active' },
      });
      expect(activateResponse.ok()).toBe(true);
    }
    await setupPage.close();

    const changeContext = await browser.newContext({ extraHTTPHeaders: bypassHeaders() });
    const changePage = await changeContext.newPage();
    await loginWithCredentials(changePage, email, initialPassword);
    await changePage.goto('/mypage?tab=profile');
    await expect(changePage.getByRole('heading', { name: '비밀번호 변경' })).toBeVisible({ timeout: 15_000 });

    await changePage.getByLabel('현재 비밀번호').fill(initialPassword);
    await changePage.getByLabel('새 비밀번호', { exact: true }).fill(changedPassword);
    await changePage.getByLabel('새 비밀번호 확인').fill(changedPassword);
    await changePage.getByRole('button', { name: '비밀번호 변경' }).click();
    await expect(changePage.getByRole('status')).toContainText('비밀번호가 변경되었습니다.', { timeout: 15_000 });
    await changeContext.close();

    const oldPasswordContext = await browser.newContext({ extraHTTPHeaders: bypassHeaders() });
    const oldPasswordPage = await oldPasswordContext.newPage();
    await oldPasswordPage.goto('/login');
    await oldPasswordPage.locator('input[type="email"]').first().fill(email);
    await oldPasswordPage.locator('input[type="password"]').first().fill(initialPassword);
    await oldPasswordPage.getByRole('button', { name: /로그인/ }).first().click();
    await expect(oldPasswordPage.getByText('이메일 또는 비밀번호가 올바르지 않습니다.')).toBeVisible({
      timeout: 15_000,
    });
    await oldPasswordContext.close();

    const newPasswordContext = await browser.newContext({ extraHTTPHeaders: bypassHeaders() });
    const newPasswordPage = await newPasswordContext.newPage();
    await loginWithCredentials(newPasswordPage, email, changedPassword);
    await newPasswordPage.goto('/mypage?tab=profile');
    await expect(newPasswordPage.getByRole('heading', { name: '회원정보 수정' })).toBeVisible({ timeout: 15_000 });
    await newPasswordContext.close();
  });
});
