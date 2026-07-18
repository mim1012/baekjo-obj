import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { loginAsAdmin } from './adminCrudHelpers';

// member-*.spec.ts(wave6 — 회원 여정 전수) 전용 헬퍼. 파일명이 *.spec.ts가 아니라
// Playwright 테스트로 수집되지 않는다.
//
// 🚨 이 헬퍼로 만드는 리소스(회원 세션 데이터·스로어웨이 상품·주문)는 실제 DB에 쓴다.
// 대상은 Vercel Preview 또는 staging뿐 — production을 겨냥하지 말 것.

export const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL;
export const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD;

/** 로그인 폼 셀렉터는 loginAsAdmin(adminCrudHelpers.ts)과 동일 — 계정만 다르다. */
export async function loginAsMember(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(MEMBER_EMAIL!);
  await page.locator('input[type="password"]').fill(MEMBER_PASSWORD!);
  await page
    .getByRole('button', { name: /로그인/ })
    .first()
    .click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}

const PNG_1PX_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

/**
 * 회원 여정 스펙 전용 스로어웨이(throwaway) 상품을 admin UI로 생성한다
 * (admin-crud-products.spec.ts와 동일 패턴 — REQUIRED_FIELDS 5개 + 판매가/재고/노출 토글).
 * 재고를 넉넉히(999) 줘서 수량 변경 테스트에서 재고 부족으로 막히지 않게 한다.
 * 삭제 API가 없고 취소 경로도 금지이므로(§wave6 안전 설계) 이 상품/주문은 정리하지 않고
 * E2E- 접두사로 영구 잔존을 허용한다(문서화된 결정) — 상품만은 cleanupThrowawayProducts로
 * 다음 실행 전에 정리해 목록이 무한정 쌓이지 않게 한다.
 */
export async function createThrowawayProduct(
  page: Page,
  namePrefix: string,
  priceWon: number,
): Promise<{ id: string; name: string }> {
  const runId = Date.now();
  const name = `${namePrefix}${runId}`;
  const imageFilePath = path.join(os.tmpdir(), `e2e-member-product-${runId}.png`);
  fs.writeFileSync(imageFilePath, Buffer.from(PNG_1PX_BASE64, 'base64'));

  try {
    await loginAsAdmin(page);
    await page.goto('/admin/products/new');

    await page.locator('#product-name').fill(name);
    await page.locator('#product-brand').selectOption('b1');
    await page.locator('#product-category').selectOption({ index: 1 });
    await page.locator('#product-lifestyle').selectOption({ index: 1 });
    const petTypeSelect = page.locator('select').filter({ has: page.locator('option[value="both"]') });
    await petTypeSelect.selectOption('both');
    await page.getByPlaceholder('상품 카드에 노출될 짧은 설명').fill(`${namePrefix} 테스트 상품`);

    const numberInputs = page.locator('input[type="number"]');
    await numberInputs.nth(0).fill(String(priceWon)); // 판매가
    await numberInputs.nth(2).fill('999'); // 재고

    await page.locator('input[type="file"]').setInputFiles(imageFilePath);
    await expect(page.locator('img[alt="Uploaded"]')).toBeVisible({ timeout: 20_000 });

    await page.getByLabel('스토어 노출').check();

    await page.getByRole('button', { name: /등록|저장/ }).click();
    await page.waitForURL((url) => url.pathname === '/admin/products', { timeout: 15_000 });

    // 목록에서 방금 만든 상품 행을 찾아 상세 링크의 id를 얻는다.
    await page.getByPlaceholder('상품명 또는 상품코드 검색...').fill(name);
    const row = page.locator('tr', { hasText: name }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    const editHref = await row.locator('a[href^="/admin/products/"]').first().getAttribute('href');
    const id = editHref?.split('/').filter(Boolean).pop();
    if (!id) throw new Error(`스로어웨이 상품 id를 목록에서 찾지 못함: ${name}`);

    return { id, name };
  } finally {
    fs.rmSync(imageFilePath, { force: true });
  }
}

/** 잔여 스로어웨이 상품(namePrefix로 시작) 정리 — 체크박스 + 일괄 삭제(products 목록엔 행별 삭제 없음). */
export async function cleanupThrowawayProducts(page: Page, namePrefix: string): Promise<void> {
  page.on('dialog', (dialog) => {
    dialog.accept().catch(() => {});
  });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.goto('/admin/products');
    await page.getByPlaceholder('상품명 또는 상품코드 검색...').fill(namePrefix);

    const rows = page.locator('tr', { hasText: namePrefix });
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

/**
 * 관리자 세션으로 상품 필드(name/price/isVisible 등)를 직접 PATCH한다. admin UI 폼 자체의
 * 동작(REQUIRED_FIELDS·이미지 업로드 등)은 admin-crud-products.spec.ts가 이미 커버하므로,
 * "관리자 수정 → 회원 여정 중간 화면(장바구니·체크아웃) 전파" 축을 검증하는 스펙에서는
 * UI 폼을 다시 거치지 않고 API를 직접 호출해 관심사를 분리한다(admin UI 회귀와 이 전파 회귀가
 * 뒤섞여 실패 원인을 흐리지 않게).
 */
export async function patchProductAsAdmin(
  page: Page,
  productId: string,
  fields: Partial<{ name: string; price: number; isVisible: boolean }>,
): Promise<void> {
  const response = await page.request.patch(`/api/admin/products/${productId}`, { data: fields });
  if (!response.ok()) {
    throw new Error(`상품 필드 PATCH 실패: ${response.status()} ${await response.text()}`);
  }
}

/**
 * 관리자 세션으로 주문을 배송완료까지 강제 전이시킨다. PATCH /api/admin/orders/[id]
 * (src/app/api/admin/orders/[id]/route.ts)를 직접 호출한다 — UI로 하려면 /admin/orders에서
 * 결제상태·배송상태를 각각 선택해야 하는데, 이 헬퍼는 review 스펙이 "배송완료" 게이트를
 * 뚫는 데만 필요하므로 API 직접 호출로 관리자 UI 커버리지와 중복을 피한다
 * (관리자 측 주문 상태전이 UI 자체는 wave4 admin-crud-orders 소관).
 */
export async function forceOrderDelivered(page: Page, orderId: string): Promise<void> {
  const response = await page.request.patch(`/api/admin/orders/${orderId}`, {
    data: { orderStatus: '배송완료', paymentStatus: '결제완료', deliveryStatus: '배송완료' },
  });
  if (!response.ok()) {
    throw new Error(`주문 배송완료 전이 실패: ${response.status()} ${await response.text()}`);
  }
}
