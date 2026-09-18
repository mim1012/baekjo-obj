import { expect, test } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';

// 환경설정 전체 페이지 문구: 저장 → 공개 화면 반영 → 반드시 원복.
// 쓰기 테스트이므로 localhost 앱 + 승인된 staging ref에서만 실행한다.
test.describe.configure({ mode: 'serial' });

test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 전체 페이지 문구', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');
  test.use({ extraHTTPHeaders: bypassHeaders() });

  let originalSettings: { version: 1; values: Record<string, string> } | null = null;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    const response = await page.request.get('/api/page-texts');
    expect(response.ok()).toBe(true);
    originalSettings = (await response.json()).settings;
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!originalSettings) return;
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    const response = await page.request.put('/api/admin/page-texts', { data: originalSettings });
    if (!response.ok()) {
      console.error(`[admin-crud-page-texts] 원복 실패(status=${response.status()})`);
    }
    await page.close();
  });

  test('상품 목록 제목 편집 → 고객 화면 반영 → 원본 복원', async ({ page }) => {
    expect(originalSettings).toBeTruthy();
    if (!originalSettings) return;
    await loginAsAdmin(page);

    const marker = `E2E-전체페이지문구-${Date.now()}`;
    const changed = structuredClone(originalSettings);
    changed.values['shop.title'] = marker;
    const save = await page.request.put('/api/admin/page-texts', { data: changed });
    expect(save.ok()).toBe(true);

    await page.goto(`/shop?cms=${Date.now()}`);
    await expect(page.getByText(marker, { exact: true })).toBeVisible({ timeout: 15_000 });

    const restore = await page.request.put('/api/admin/page-texts', { data: originalSettings });
    expect(restore.ok()).toBe(true);
    await page.goto(`/shop?cms-restored=${Date.now()}`);
    await expect(page.getByText(originalSettings.values['shop.title'], { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(marker, { exact: true })).toHaveCount(0);
  });
});
