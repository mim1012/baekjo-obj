import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CRUD_ENABLED,
  bypassHeaders,
  deleteMatchingAdminRows,
  loginAsAdmin,
} from './_lib/adminCrudHelpers';

// 현재 공개 홈페이지의 상품 카드 태그와 /shop 고민 필터를 실제 관리자 화면으로 왕복 검증한다.
// 쓰기 스펙이므로 승인된 staging에서 E2E_ADMIN_CRUD=1일 때만 실행한다.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 상품 태그', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });

  const runId = Date.now();
  const SEARCH_PREFIX = 'E2E-상품태그-';
  const name = `${SEARCH_PREFIX}${runId}`;
  const editedName = `${name}-수정`;
  const searchPlaceholder = '상품 태그 이름 검색';

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await deleteMatchingAdminRows(page, '/admin/products/tags', searchPlaceholder, SEARCH_PREFIX);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await deleteMatchingAdminRows(page, '/admin/products/tags', searchPlaceholder, SEARCH_PREFIX);
    await page.close();
  });

  test('등록 → 스토어 필터 반영 → 수정 → 새로고침 영속 → 삭제', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await loginAsAdmin(page);
    await page.goto('/admin/products/tags');

    await page.getByRole('button', { name: '상품 태그 등록' }).click();
    await page.getByLabel('고객에게 보이는 태그 이름').fill(name);
    await page.getByLabel('상품 카드에 보이기').selectOption('true');
    await page.getByLabel('스토어 고민 필터에도 보이기').selectOption('true');
    await page.getByRole('button', { name: '등록하고 고객 화면에 반영' }).click();
    await expect(page.locator('tr', { hasText: name })).toBeVisible({ timeout: 15_000 });

    await page.goto('/shop');
    await expect(page.locator('body')).toContainText(name, { timeout: 15_000 });

    await page.goto('/admin/products/tags');
    await page.getByPlaceholder(searchPlaceholder).fill(name);
    await page.getByRole('button', { name: '수정' }).click();
    await page.getByLabel('고객에게 보이는 태그 이름').fill(editedName);
    await page.getByRole('button', { name: '수정하고 고객 화면에 반영' }).click();

    await page.reload();
    await page.getByPlaceholder(searchPlaceholder).fill(editedName);
    await expect(page.locator('tr', { hasText: editedName })).toBeVisible({ timeout: 15_000 });
    await page.goto('/shop');
    await expect(page.locator('body')).toContainText(editedName, { timeout: 15_000 });

    await page.goto('/admin/products/tags');
    await page.getByPlaceholder(searchPlaceholder).fill(editedName);
    await page.getByRole('button', { name: '삭제' }).click();
    await page.reload();
    await page.getByPlaceholder(searchPlaceholder).fill(editedName);
    await expect(page.getByRole('button', { name: '수정' })).toHaveCount(0);
    await page.goto('/shop');
    await expect(page.locator('body')).not.toContainText(editedName);
  });

  test('상품 등록 화면에서 새 태그 등록 → 자동 선택 → 공용 태그 목록 반영', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await loginAsAdmin(page);
    await page.goto('/admin/products/new');

    await page.getByLabel('목록에 없는 새 태그 등록').fill(name);
    await page.getByRole('button', { name: '등록하고 이 상품에 선택' }).click();
    await expect(page.getByRole('status')).toContainText('공용 목록에 등록하고 이 상품에 선택했습니다.');
    await expect(page.getByRole('button', { name: `✓ ${name}` })).toBeVisible();

    await page.goto('/admin/products/tags');
    await page.getByPlaceholder(searchPlaceholder).fill(name);
    await expect(page.locator('tr', { hasText: name })).toBeVisible({ timeout: 15_000 });
  });
});
