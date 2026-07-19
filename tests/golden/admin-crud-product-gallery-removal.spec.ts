import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';

test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 상품 갤러리 이미지 삭제', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });

  const runId = Date.now();
  const name = `E2E-갤러리삭제-${runId}`;
  const searchPrefix = 'E2E-갤러리삭제-';
  const searchPlaceholder = '상품명 또는 상품코드 검색...';
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const mainImagePath = path.join(os.tmpdir(), `e2e-gallery-main-${runId}.png`);
  const galleryImagePath = path.join(os.tmpdir(), `e2e-gallery-extra-${runId}.png`);

  function assertNotProd(): void {
    const target = process.env.E2E_BASE_URL || process.env.BASE_URL || '';
    if (/baekjo-obj\.vercel\.app/.test(target)) {
      throw new Error(`쓰기 스펙이 production(${target})을 겨냥했습니다 — 중단. 대상은 Preview/staging뿐.`);
    }
  }

  async function cleanupStaleProducts(page: Page): Promise<void> {
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.goto('/admin/products');
      await page.getByPlaceholder(searchPlaceholder).fill(searchPrefix);
      const rows = page.locator('tr', { hasText: searchPrefix });
      const count = await rows.count();
      if (count === 0) break;
      for (let i = 0; i < count; i += 1) {
        await rows.nth(i).locator('input[type="checkbox"]').check();
      }
      const deleteButton = page.getByRole('button', { name: '삭제' });
      if ((await deleteButton.count()) === 0) break;
      await deleteButton.click();
      await page.waitForTimeout(800);
    }
  }

  test.beforeAll(async ({ browser }) => {
    assertNotProd();
    const png = Buffer.from(pngBase64, 'base64');
    fs.writeFileSync(mainImagePath, png);
    fs.writeFileSync(galleryImagePath, png);
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupStaleProducts(page);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupStaleProducts(page);
    await page.close();
    for (const imagePath of [mainImagePath, galleryImagePath]) fs.rmSync(imagePath, { force: true });
  });

  test('갤러리 이미지 업로드 → 저장 → 제거 → 저장 → 관리자 재열람 반영', async ({ page }) => {
    assertNotProd();
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));

    await loginAsAdmin(page);
    await page.goto('/admin/products/new');
    await page.locator('#product-name').fill(name);
    await page.locator('#product-brand').selectOption('b1');
    await page.locator('#product-category').selectOption({ index: 1 });
    await page.locator('#product-lifestyle').selectOption({ index: 1 });
    await page.getByRole('spinbutton').first().fill('10000');
    await page.locator('input[type="file"]').setInputFiles(mainImagePath);
    await expect(page.locator('img[alt="Uploaded"]')).toHaveCount(1, { timeout: 20_000 });
    await page.getByRole('button', { name: '이미지 추가' }).click();
    await page.locator('input[type="file"]').last().setInputFiles(galleryImagePath);
    await expect(page.locator('img[alt="Uploaded"]')).toHaveCount(2, { timeout: 20_000 });
    await page.getByLabel('스토어 노출').check();
    await page.getByRole('button', { name: '등록 완료' }).click();
    await page.waitForURL((url) => url.pathname === '/admin/products', { timeout: 20_000 });

    await page.getByPlaceholder(searchPlaceholder).fill(name);
    await page.locator('tr', { hasText: name }).locator('button[title="상품 수정"]').click();
    await expect(page).toHaveURL(/\/admin\/products\/[^/]+$/);
    const productId = new URL(page.url()).pathname.split('/').pop();
    if (!productId) throw new Error('product-id-not-found');
    await expect(page.locator('img[alt="Uploaded"]')).toHaveCount(2, { timeout: 15_000 });

    await page.getByRole('button', { name: '갤러리 이미지 1 삭제' }).click();
    await expect(page.locator('img[alt="Uploaded"]')).toHaveCount(1);
    await page.getByRole('button', { name: '수정 사항 저장' }).click();
    await page.waitForURL((url) => url.pathname === '/admin/products', { timeout: 20_000 });

    await page.goto(`/admin/products/${productId}`);
    await expect(page.locator('img[alt="Uploaded"]')).toHaveCount(1, { timeout: 15_000 });
    await page.goto(`/shop/${productId}`);
    await expect(page.locator(`img[alt="${name}"]`).first()).toBeVisible({ timeout: 15_000 });

    await page.goto('/admin/products');
    await page.getByPlaceholder(searchPlaceholder).fill(name);
    await page.locator('tr', { hasText: name }).locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: '삭제' }).click();
  });
});
