import { expect, test, type Page } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CRUD_ENABLED,
  bypassHeaders,
  loginAsAdmin,
} from './_lib/adminCrudHelpers';

test.describe('골든플로우: 실제 판매자 CRUD 실구동', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');
  test.use({ extraHTTPHeaders: bypassHeaders() });

  const runId = Date.now();
  const prefix = 'E2E-판매자-';
  const displayName = `${prefix}${runId}`;
  const editedPhone = '02-9999-0001';

  async function cleanup(page: Page): Promise<void> {
    const response = await page.request.get('/api/admin/sellers');
    if (!response.ok()) return;
    const { sellers } = (await response.json()) as { sellers: Array<{ id: string; displayName: string }> };
    for (const seller of sellers.filter((item) => item.displayName.startsWith(prefix))) {
      await page.request.delete(`/api/admin/sellers/${encodeURIComponent(seller.id)}`);
    }
  }

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await cleanup(page);
  });

  test.afterEach(async ({ page }) => {
    await cleanup(page);
  });

  test('등록 → 검증 완료 → 상품 선택 가능 → 수정 왕복 → 삭제', async ({ page }) => {
    await page.goto('/admin/sellers');
    await page.getByRole('button', { name: '새 판매자 등록' }).click();
    await page.getByLabel('고객 표시명').fill(displayName);
    await page.getByLabel('상호(법인명)').fill(`테스트상호 ${runId}`);
    await page.getByLabel('대표자명').fill('테스트대표');
    await page.getByLabel('사업자등록번호').fill(`000-00-${String(runId).slice(-5)}`);
    await page.getByLabel('통신판매업 신고번호').fill(`테스트-${runId}호`);
    await page.getByLabel('고객센터 연락처').fill('02-0000-0000');
    await page.getByLabel('사업장 주소').fill('서울특별시 테스트구 판매자로 1');
    await page.getByLabel('반품지 주소').fill('서울특별시 테스트구 반품로 2');
    await page.getByLabel('고객센터 이메일').fill('golden-seller@example.test');
    await page.getByLabel('기본 배송비').fill('3500');
    await page.getByLabel('무료배송 기준').fill('60000');
    await page.getByLabel('출고 예정').fill('결제 완료 후 2영업일 이내 출고');
    await page.getByLabel('교환·반품 조건').fill('상품 수령 후 7일 이내 접수');
    await page.getByLabel('운영 상태').selectOption('verified');
    await page.getByRole('button', { name: '판매자 등록', exact: true }).click();

    const row = page.locator('tr', { hasText: displayName });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row).toContainText('검증 완료');

    const listResponse = await page.request.get('/api/admin/sellers');
    const { sellers } = (await listResponse.json()) as { sellers: Array<{ id: string; displayName: string; phone: string; shippingFee: number }> };
    const seller = sellers.find((item) => item.displayName === displayName);
    expect(seller).toBeTruthy();
    expect(seller?.shippingFee).toBe(3500);

    await page.goto('/admin/products/new');
    await expect(page.locator('#product-seller')).toContainText(`${displayName} · 검증 완료`);

    await page.goto('/admin/sellers');
    await page.getByLabel(`${displayName} 수정`).click();
    await page.getByLabel('고객센터 연락처').fill(editedPhone);
    await page.getByRole('button', { name: '수정 저장' }).click();
    await expect(page.locator('tr', { hasText: displayName })).toContainText(editedPhone, { timeout: 15_000 });

    const updated = await page.request.get('/api/admin/sellers');
    const updatedBody = (await updated.json()) as { sellers: Array<{ id: string; displayName: string; phone: string }> };
    expect(updatedBody.sellers.find((item) => item.id === seller!.id)?.phone).toBe(editedPhone);

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByLabel(`${displayName} 삭제`).click();
    await expect(page.locator('tr', { hasText: displayName })).toHaveCount(0, { timeout: 15_000 });
  });
});
