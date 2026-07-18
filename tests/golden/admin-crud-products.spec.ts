import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CRUD_ENABLED,
  bypassHeaders,
  loginAsAdmin,
} from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /admin/products/new → /shop, /shop/[id].
//
// ⚠️ 생성 필수 필드 — 클라이언트(ProductForm.tsx:26-28 REQUIRED_FIELDS)는 name·brandId·
// category·lifestyleCategory·image 5개만 막는다. 서버(src/lib/products/validate.ts
// validateProductFields requireAll=true)는 그 위에 price·petType·ageGroup·stock·description도
// 필수로 보되, price는 isNullableNum이라 null 허용("가격 미정"), ageGroup은 폼에 입력 UI가
// 없고 항상 'all'을 보낸다(formPayload.ts:210 `ageGroup: form.ageGroup ?? 'all'`), stock/price는
// formData 초기값이 0이라 안 건드려도 유효한 값이 전송된다(formPayload.ts:106-134). 그래서 실제로
// 사람이 채워야 하는 건 name·brandId·category·lifestyleCategory·image 뿐이다.
//
// ⚠️ 대표 이미지는 필수이고 실제 파일 업로드다(ImageUploader.tsx — 숨겨진 input[type=file]).
// setInputFiles로 1x1 PNG를 넣고 업로드 완료(썸네일 <img alt="Uploaded"> 렌더)를 기다린다.
//
// ⚠️ 신규 상품은 isVisible 기본값이 **false**다(ProductForm.tsx:117) — "스토어 노출" 토글을 켜지
// 않으면 /shop에 안 보인다. 등록 직후 토글을 켜서 공개 화면 검증이 가능하게 한다.
//
// ⚠️ category/lifestyleCategory는 관리자가 설정하는 동적 목록(categorySettings)이라 특정 값을
// 하드코딩하지 않고 플레이스홀더 다음 첫 옵션(index 1)을 선택한다.
//
// ⚠️ 관리자 목록에는 행별 삭제 버튼이 없다 — 체크박스로 선택 후 하단에 뜨는 일괄 작업 바
// (숨김 처리/노출 처리/삭제)만 있다(AdminProductsClient.tsx:297-345). 삭제·숨김 전환 둘 다
// window.confirm을 띄운다. 리뷰/문의가 달린 상품은 삭제 대신 숨김을 유도하는 안내가 뜨지만,
// 이 스펙의 신규 상품은 리뷰/문의가 전혀 없으므로 정상 삭제된다.
//
// 🚨 쓰기(write) 스펙 — 실제 DB(+스토리지)에 데이터를 만들고 지운다. E2E_ADMIN_CRUD=1 로
// 명시적으로 켜지 않으면 전체 skip. 절대 production을 겨냥하지 말 것 — 대상은 Vercel Preview/
// staging뿐. staging 공개 /shop에 테스트 상품이 잠깐 노출되는 것은 허용되나(스테이징 한정),
// 생애주기를 짧게 유지하고 반드시 정리한다.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 상품', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const SEARCH_PREFIX = 'E2E-상품-';
  const name = `${SEARCH_PREFIX}${runId}`;
  const editedPrice = 15_000;
  const summary = `E2E 한줄설명 ${runId}`;
  const PRODUCTS_SEARCH_PLACEHOLDER = '상품명 또는 상품코드 검색...';

  const PNG_1PX_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const imageFilePath = path.join(os.tmpdir(), `e2e-product-image-${runId}.png`);

  /** 관리자 목록에서 SEARCH_PREFIX로 시작하는 잔여 테스트 상품을 체크박스+일괄삭제로 정리한다.
   * 상품 목록엔 행별 삭제가 없어 notices류의 deleteMatchingAdminRows를 그대로 못 쓴다. */
  async function cleanupStaleProducts(page: import('@playwright/test').Page): Promise<void> {
    page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });

    // ⚠️ 이전 구현은 매 반복 `rows.first()`만 다시 골라 체크했다 — 체크는 행을 사라지게 하지
    // 않으므로(bulk 삭제 전까지) 이 호출은 멱등이라 항상 같은 첫 행만 체크되고, 잔여 상품이
    // 2건 이상이면 매 실행 1건만 지워지고 나머지는 계속 쌓였다(리뷰 LOW-B, 2026-07-18).
    // 이제 한 번의 검색 결과에서 인덱스로 전부 순회해 체크한 뒤 일괄삭제하고, 그래도 남은
    // 잔여물(부분 실패·새로 늘어난 잔여물 등)을 잡기 위해 재검색까지 몇 차례 반복한다.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.goto('/admin/products');
      await page.getByPlaceholder(PRODUCTS_SEARCH_PLACEHOLDER).fill(SEARCH_PREFIX);

      const rows = page.locator('tr', { hasText: SEARCH_PREFIX });
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
    fs.writeFileSync(imageFilePath, Buffer.from(PNG_1PX_BASE64, 'base64'));
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
    fs.rmSync(imageFilePath, { force: true });
  });

  test('등록 → 노출 켜기 → 필드 단위로 /shop·/shop/[id]에 반영 → 가격 수정 → 비노출 → 삭제 → 사라짐', async ({
    page,
  }) => {
    page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });

    await loginAsAdmin(page);
    await page.goto('/admin/products/new');

    // 1) 등록 — 필수 5필드 + 판매가/재고/한줄설명/반려동물(필드 검증용으로 명시 선택).
    const nameInput = page.locator('#product-name');
    await nameInput.fill(name);
    await page.locator('#product-brand').selectOption('b1');
    await page.locator('#product-category').selectOption({ index: 1 });
    await page.locator('#product-lifestyle').selectOption({ index: 1 });
    // 반려동물 select는 htmlFor 없이 라벨만 있다 — option value="both" 를 가진 유일한 select로 특정한다.
    const petTypeSelect = page.locator('select').filter({ has: page.locator('option[value="both"]') });
    await petTypeSelect.selectOption('dog');
    await page.getByPlaceholder('상품 카드에 노출될 짧은 설명').fill(summary);

    const priceInput = page.locator('input[type="number"]').first();
    await priceInput.fill('10000');

    await page.locator('input[type="file"]').setInputFiles(imageFilePath);
    await expect(page.locator('img[alt="Uploaded"]')).toBeVisible({ timeout: 20_000 });

    // 신규 상품은 isVisible 기본 false — 토글을 켜야 공개 화면에서 검증할 수 있다.
    // ToggleRow의 <label>이 체크박스를 직접 감싸므로 getByLabel이 정상 동작한다(브랜드/설정 폼과
    // 다른 패턴 — ProductForm.tsx:706-716 참고).
    await page.getByLabel('스토어 노출').check();

    // 저장 성공 시 개별 상품 페이지가 아니라 목록으로 이동한다(ProductForm.tsx:235 router.push
    // ('/admin/products')) — 실측 전에는 개별 페이지로 갈 거라 잘못 가정했다.
    await page.getByRole('button', { name: '등록 완료' }).click();
    await page.waitForURL((url) => url.pathname === '/admin/products', { timeout: 15_000 });

    // 2) 관리자 목록 — 이름·가격·노출 상태가 반영됐는지 확인.
    await page.getByPlaceholder(PRODUCTS_SEARCH_PLACEHOLDER).fill(name);
    await page.getByPlaceholder(PRODUCTS_SEARCH_PLACEHOLDER).fill(name);
    const adminRow = page.locator('tr', { hasText: name });
    await expect(adminRow).toBeVisible({ timeout: 15_000 });
    await expect(adminRow).toContainText('10,000');
    await expect(adminRow).toContainText('노출');

    // 3) 공개 /shop 검색 결과 — 이름·가격이 카드에 반영되는지 확인, 클릭해 상세로 이동.
    // ⚠️ ProductCard.tsx:74 — 카드 전체를 덮는 <Link>는 absolute overlay라 텍스트가 없고
    // aria-label(`${name} 상세 보기`)만 갖는다. 상품명 텍스트는 그 형제 요소에 있어
    // `locator('a', {hasText: name})`는 항상 매치 0건이었다(실측) — 카드 컨테이너(article)로
    // 존재를 확인하고, 클릭은 aria-label로 그 안의 링크를 특정한다.
    // ⚠️ 품절(stock=0) 상품이 검색 결과 그리드에 순간적으로 두 번 렌더되는 레이스가 실측됐다
    // (2026-07-18 — 재시도 시 1건으로 정상화됨, Next.js fetch-cache 하이드레이션 지연으로 추정,
    // 상품 가격 수정 후 새로고침 재시도 패턴과 동일 계열). 존재 확인·클릭 모두 `.first()`로
    // 스코핑해 중복 렌더가 strict-mode 위반을 내지 않게 한다(brands 스펙의 displayOrder=0
    // 중복 카드 대응과 동일한 방어).
    await page.goto(`/shop?search=${encodeURIComponent(name)}`);
    const shopCard = page.locator('article', { hasText: name }).first();
    await expect(shopCard).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('body')).toContainText('10,000');
    await page.getByRole('link', { name: `${name} 상세 보기` }).first().click();
    await expect(page).toHaveURL(/\/shop\/.+/);
    const productId = new URL(page.url()).pathname.split('/').pop()!;

    // 4) 공개 상세 — 이름·가격·한줄설명이 필드 단위로 반영되는지 확인.
    await expect(page.locator('h1')).toContainText(name);
    await expect(page.locator('body')).toContainText('10,000');

    // 5) 관리자로 돌아와 가격 수정.
    // ⚠️ 고정 대기(waitForTimeout)로 저장 완료를 가정했다가 실제로 커밋되기 전에 다음 화면을
    // 확인해 플레이키하게 실패한 적이 실측됐다 — 저장 성공 시 ProductForm.tsx가 '/admin/products'
    // 로 이동하므로(생성과 동일 패턴) 그 네비게이션을 기다려 결정론적으로 만든다.
    await page.goto(`/admin/products/${productId}`);
    const editPriceInput = page.locator('input[type="number"]').first();
    await editPriceInput.fill(String(editedPrice));
    await page.getByRole('button', { name: '수정 사항 저장' }).click();
    await page.waitForURL((url) => url.pathname === '/admin/products', { timeout: 15_000 });

    // 6) 공개 상세에 가격 수정 반영 확인.
    // ⚠️ URL 이동을 기다린 뒤에도 이 확인이 가끔 이전 가격("10,000")을 보여주는 게 실측됐다 —
    // /shop/[id]가 force-dynamic이라도 그 안에서 쓰는 fetch가 Next의 데이터 캐시에 한 번
    // 걸릴 수 있어 보인다. toPass로 재조회(reload)를 반복해 캐시가 풀릴 때까지 기다린다.
    await page.goto(`/shop/${productId}`);
    await expect(async () => {
      await page.reload();
      await expect(page.locator('body')).toContainText('15,000');
    }).toPass({ timeout: 20_000 });

    // 7) 비노출 전환 — 관리자 목록에서 체크박스 선택 후 일괄 "숨김 처리".
    await page.goto('/admin/products');
    await page.getByPlaceholder(PRODUCTS_SEARCH_PLACEHOLDER).fill(name);
    await page.locator('tr', { hasText: name }).locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: '숨김 처리' }).click();
    await page.getByPlaceholder(PRODUCTS_SEARCH_PLACEHOLDER).fill(name);
    await expect(page.locator('tr', { hasText: name })).toContainText('숨김', { timeout: 15_000 });

    // 8) 비노출 확인 — 공개 상세가 404(getProductById가 includeHidden 없이 호출되면 비노출 상품은
    // 조회 자체가 안 됨, /shop/[id]/page.tsx는 product 없으면 notFound()).
    const hiddenResponse = await page.goto(`/shop/${productId}`);
    expect(hiddenResponse?.status()).toBe(404);

    // 9) 삭제 — 리뷰/문의가 없는 신규 상품이라 정상 삭제된다.
    await page.goto('/admin/products');
    await page.getByPlaceholder(PRODUCTS_SEARCH_PLACEHOLDER).fill(name);
    await page.locator('tr', { hasText: name }).locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: '삭제' }).click();
    await page.getByPlaceholder(PRODUCTS_SEARCH_PLACEHOLDER).fill(name);
    await expect(page.locator('table')).not.toContainText(name, { timeout: 15_000 });

    // 10) 삭제 후 상세도 404인지 확인(삭제가 진짜 DB에 반영됐는지 검증).
    const deletedResponse = await page.goto(`/shop/${productId}`);
    expect(deletedResponse?.status()).toBe(404);
  });
});
