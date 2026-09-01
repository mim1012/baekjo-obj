import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CRUD_ENABLED,
  bypassHeaders,
  deleteMatchingAdminRows,
  loginAsAdmin,
} from './_lib/adminCrudHelpers';

// 실제 공개 화면 /landing/care-kit의 카드만 검증한다.
// 쓰기 스펙이므로 승인된 staging에서 E2E_ADMIN_CRUD=1일 때만 실행한다.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 케어 키트', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });

  const runId = Date.now();
  const SEARCH_PREFIX = 'E2E-키트-';
  const name = `${SEARCH_PREFIX}${runId}`;
  const editedName = `${name}-수정`;
  const target = `E2E대상-${runId}`;
  const purpose = `E2E목적-${runId}`;
  const item = `E2E구성품-${runId}`;
  const searchPlaceholder = '키트명, 구성품 검색';

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await deleteMatchingAdminRows(page, '/admin/kits', searchPlaceholder, SEARCH_PREFIX);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await deleteMatchingAdminRows(page, '/admin/kits', searchPlaceholder, SEARCH_PREFIX);
    await page.close();
  });

  test('등록 → 고객 화면 반영 → 수정 → 새로고침 영속 → 삭제', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await loginAsAdmin(page);
    await page.goto('/admin/kits');

    await page.getByRole('button', { name: '키트 등록' }).click();
    await page.getByLabel('키트명', { exact: true }).fill(name);
    await page.getByLabel('키트 유형').selectOption('hospital');
    await page.getByLabel('추천 대상').fill(target);
    await page.getByLabel('제공 목적').fill(purpose);
    await page.getByRole('button', { name: '주요 구성품 추가' }).click();
    await page.getByLabel('주요 구성품 1', { exact: true }).fill(item);
    await page.getByLabel('고객 화면 노출 상태').selectOption('true');
    await page.getByRole('button', { name: '등록하고 고객 화면에 반영' }).click();
    await expect(page.locator('tr', { hasText: name })).toBeVisible({ timeout: 15_000 });

    await page.goto('/landing/care-kit');
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('body')).toContainText(target);
    await expect(page.locator('body')).toContainText(item);

    await page.goto('/admin/kits');
    await page.getByPlaceholder(searchPlaceholder).fill(name);
    await page.getByRole('button', { name: '수정' }).click();
    await page.getByLabel('키트명', { exact: true }).fill(editedName);
    await page.getByRole('button', { name: '수정하고 고객 화면에 반영' }).click();
    await page.reload();
    await page.getByPlaceholder(searchPlaceholder).fill(editedName);
    await expect(page.locator('tr', { hasText: editedName })).toBeVisible({ timeout: 15_000 });

    await page.getByRole('button', { name: '삭제' }).click();
    await page.reload();
    await page.getByPlaceholder(searchPlaceholder).fill(editedName);
    await expect(page.getByRole('button', { name: '수정' })).toHaveCount(0);
    await page.goto('/landing/care-kit');
    await expect(page.getByRole('heading', { name: editedName, exact: true })).toHaveCount(0);
  });
});
