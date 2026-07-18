import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';
import { getSurface } from './_lib/fieldSurfaceMatrix';

// 골든플로우 #7 — 상품 폼 "전 필드 왕복" 실구동.
//
// admin-crud-products.spec.ts(라이프사이클: 등록→노출→가격수정→비노출→삭제)의 자매편.
// 그 스펙이 핵심 lifecycle 을 검증한다면, 이 스펙은 ProductForm 의 *모든 필드*를 한 번에 채워
//   (1) 저장 → 관리자 편집 폼 재열람에서 필드별 왕복(round-trip) 검증,
//   (2) 공개 /shop/[id] 에서 공개 렌더되는 필드 검증(옵션 셀렉터·구매정보·적립·성분/사용법 등),
//   (3) ProductDetailEditor(/admin/products/[id]/editor)로 detailBlocks(text+image) 저장 →
//       공개 #story 에 순서대로 렌더 검증,
//   (4) 같은 상품에 경계값/특수문자(XSS)/price=0 수정 패스 → 크래시·미이스케이프 렌더 없음 확인.
// 를 한다. 상품 폼은 이 레포에서 가장 큰 폼이라 필드가 조용히 깨지기 쉽다(필드 커버리지 감사:
// tests/admin/product-brand-field-coverage.spec.ts).
//
// ⚠️ 필수 5필드는 name·brandId·category·lifestyleCategory·image(ProductForm REQUIRED_FIELDS).
//    나머지는 선택이지만 이 스펙은 ProductForm 이 노출하는 전 필드를 채운다.
// ⚠️ 신규 상품 isVisible 기본 false — "스토어 노출" 토글을 켜야 공개 검증이 가능하다.
// ⚠️ 대표 이미지는 실제 파일 업로드(ImageUploader, 숨겨진 input[type=file]) — 1x1 PNG setInputFiles.
// ⚠️ detailBlocks 이미지 블록 src 는 Supabase storage publicUrl 이라, 검증기(validate.isAllowedBlockImageSrc)
//    가 NEXT_PUBLIC_SUPABASE_URL 오리진만 통과시킨다. Vercel Preview 는 이 값이 설정돼 있고,
//    로컬 실행 시엔 dev 서버 기동 env 에 NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL 을 넣어야 한다
//    (안 넣으면 이미지 블록 저장이 400 → 이 스펙 실패로 그 설정 누락을 드러낸다).
//
// 🚨 쓰기(write) 스펙 — 실제 DB(+스토리지)에 데이터를 만들고 지운다. E2E_ADMIN_CRUD=1 로
// 명시적으로 켜지 않으면 전체 skip. 절대 production 을 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 상품 폼 전 필드 왕복', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });
  // 한 파일 내 3개 테스트가 같은 접두사 데이터를 만들고 지우므로 직렬 실행(병렬 시 서로의 정리에 걸림).
  test.describe.configure({ mode: 'serial' });

  // wave-3 상품 스펙과 겹치지 않는 고유 접두사 — 병렬 실행 시 서로의 정리에 걸리지 않게 한다
  // ("E2E-상품-" 검색이 "E2E-필드상품-" 을 substring 매칭하지 않는다).
  const runId = Date.now();
  const SEARCH_PREFIX = 'E2E-필드상품-';
  const name = `${SEARCH_PREFIX}${runId}`;
  const PRODUCTS_SEARCH_PLACEHOLDER = '상품명 또는 상품코드 검색...';

  // 필드별 고유 값(runId 포함 — 공개 화면 substring 검증 시 다른 상품과 충돌하지 않게).
  const summary = `E2E한줄설명 ${runId}`;
  const description = `E2E상세설명 ${runId}`;
  const ingredients = `닭고기40% 현미 연어오일 ${runId}`;
  const howToUse = `하루60g 2회급여 ${runId}`;
  const recommended = `알러지반려견 ${runId}`;
  const cautionText = `개봉후냉장보관 ${runId}`;
  const deliveryEstimate = `오후2시이전당일출고 ${runId}`;
  const shippingNotice = `제주추가배송비 ${runId}`;
  const returnNotice = `수령후7일이내 ${runId}`;
  const sellerName = `백조오브제셀렉션 ${runId}`;
  const opt1Name = `2kg-${runId}`;
  const opt2Name = `5kg-${runId}`;
  const price = 12000;
  const salePrice = 9000;
  const stock = 50;
  const shippingFee = 3000;
  const pointsRate = 5;
  const detailText = `E2E상세본문텍스트블록 ${runId}`;
  const detailImageAlt = `E2E상세이미지 ${runId}`;

  const PNG_1PX_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const mainImagePath = path.join(os.tmpdir(), `e2e-pf-main-${runId}.png`);
  const galleryImagePath = path.join(os.tmpdir(), `e2e-pf-gallery-${runId}.png`);
  const blockImagePath = path.join(os.tmpdir(), `e2e-pf-block-${runId}.png`);

  // 저장 후 재열람 왕복에 쓰려고 생성 시 실제 선택된 동적 카테고리 값을 붙잡아 둔다.
  let categoryValue = '';
  let lifestyleValue = '';

  /** prod 도메인 안전가드 — 실 데이터 쓰기 스펙이 실수로 production 을 겨냥하지 못하게 막는다. */
  function assertNotProd(): void {
    const target = process.env.E2E_BASE_URL || process.env.BASE_URL || '';
    if (/baekjo-obj\.vercel\.app/.test(target)) {
      throw new Error(`쓰기 스펙이 production(${target})을 겨냥했습니다 — 중단. 대상은 Preview/staging뿐.`);
    }
  }

  /** SEARCH_PREFIX 로 시작하는 잔여 테스트 상품을 체크박스+일괄삭제로 정리(멱등, 재검색 반복). */
  async function cleanupStaleProducts(page: Page): Promise<void> {
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
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
    assertNotProd();
    const png = Buffer.from(PNG_1PX_BASE64, 'base64');
    fs.writeFileSync(mainImagePath, png);
    fs.writeFileSync(galleryImagePath, png);
    fs.writeFileSync(blockImagePath, png);
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
    for (const p of [mainImagePath, galleryImagePath, blockImagePath]) fs.rmSync(p, { force: true });
  });

  test('전 필드 등록 → 공개 반영 → detailBlocks → 관리자 왕복 → 경계/XSS 수정 → 삭제', async ({
    page,
  }) => {
    assertNotProd();
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));

    await loginAsAdmin(page);
    await page.goto('/admin/products/new');

    // ── 1) 기본 정보 ──
    await page.locator('#product-name').fill(name);
    await page.locator('#product-brand').selectOption('b1');
    // brandName(=선택 브랜드 옵션 텍스트) — 공개 카드/상세가 brandName 을 렌더하므로 붙잡아 검증에 쓴다.
    const brandNameText = (await page.locator('#product-brand option:checked').innerText()).trim();
    await page.locator('#product-category').selectOption({ index: 1 });
    await page.locator('#product-lifestyle').selectOption({ index: 1 });
    categoryValue = await page.locator('#product-category').inputValue();
    lifestyleValue = await page.locator('#product-lifestyle').inputValue();
    // 반려동물 select 는 htmlFor 없이 라벨만 — option value="both" 를 가진 유일한 select 로 특정.
    const petSelect = page.locator('select').filter({ has: page.locator('option[value="both"]') });
    await petSelect.selectOption('dog');
    await page.getByPlaceholder('상품 카드에 노출될 짧은 설명').fill(summary);
    await page
      .getByPlaceholder('간단한 상세 설명 (선택 — 상세페이지 에디터로 본문을 만들 거라면 비워두세요)')
      .fill(description);

    // ── 2) 가격·재고·배송비 (spinbutton 문서순서: price·salePrice·stock·shippingFee) ──
    const spin = page.getByRole('spinbutton');
    await spin.nth(0).fill(String(price));
    await spin.nth(1).fill(String(salePrice));
    await spin.nth(2).fill(String(stock));
    await spin.nth(3).fill(String(shippingFee));

    // ── 3) 적립금 지급 + 적립률 ──
    await page.getByText('적립금 지급').click();
    await page.getByPlaceholder('상품금액 기준. 배송비 제외').fill(String(pointsRate));

    // ── 4) 옵션 2개 (OptionEditor 는 빈 상태로 시작 → 추가 버튼으로 행 생성) ──
    await page.getByRole('button', { name: '옵션 추가' }).click();
    await page.getByLabel('옵션 1 이름').fill(opt1Name);
    await page.getByLabel('옵션 1 가격').fill('20000');
    await page.getByRole('button', { name: '옵션 추가' }).click();
    await page.getByLabel('옵션 2 이름').fill(opt2Name);
    await page.getByLabel('옵션 2 가격').fill('45000');

    // ── 5) 상세 정보(성분/사용법/추천/주의) ──
    await page.getByPlaceholder('예: 닭고기 40%, 현미, 연어오일…').fill(ingredients);
    await page.getByPlaceholder('예: 체중 5kg 기준 하루 60g, 2회 나눠 급여').fill(howToUse);
    await page.getByRole('button', { name: '추천 대상 추가' }).click();
    await page.getByLabel('추천 대상 1', { exact: true }).fill(recommended);
    await page.getByRole('button', { name: '주의사항 추가' }).click();
    await page.getByLabel('주의사항 1', { exact: true }).fill(cautionText);

    // ── 6) 배송·판매자 안내 ──
    await page.getByPlaceholder('예: 오후 2시 이전 주문 시 당일 출고').fill(deliveryEstimate);
    await page.getByPlaceholder('예: 제주/도서산간 추가 배송비').fill(shippingNotice);
    await page.getByPlaceholder('예: 단순 변심 시 수령 후 7일 이내').fill(returnNotice);
    await page.getByPlaceholder('예: 백조오브제').fill(sellerName);

    // ── 7) 대표 이미지(단일 file input) + 갤러리 1장(추가 후 마지막 file input) ──
    await page.locator('input[type="file"]').setInputFiles(mainImagePath);
    await expect(page.locator('img[alt="Uploaded"]')).toHaveCount(1, { timeout: 20_000 });
    await page.getByRole('button', { name: '이미지 추가' }).click();
    await page.locator('input[type="file"]').last().setInputFiles(galleryImagePath);
    await expect(page.locator('img[alt="Uploaded"]')).toHaveCount(2, { timeout: 20_000 });

    // ── 8) 노출 토글(스토어 노출/추천/베스트) — ToggleRow 는 label 이 input 을 감싸 getByLabel 동작 ──
    await page.getByLabel('스토어 노출').check();
    await page.getByLabel('추천 상품 (MD)').check();
    await page.getByLabel('베스트 상품').check();

    // 저장 → 목록으로 이동(ProductForm.tsx router.push('/admin/products')).
    await page.getByRole('button', { name: '등록 완료' }).click();
    await page.waitForURL((url) => url.pathname === '/admin/products', { timeout: 20_000 });

    // ── 9) 공개 /shop 카드 — shop-card 표면 계약(뱃지·brandName·후기수) 검증 ──
    await page.goto(`/shop?search=${encodeURIComponent(name)}`);
    const shopCard = page.locator('article', { hasText: name }).first();
    await expect(shopCard).toBeVisible({ timeout: 15_000 });
    await expect(shopCard).toContainText('BEST'); // isBest 뱃지(shop-card:86-90)
    await expect(shopCard).toContainText('SELECTED'); // isRecommended 뱃지(:91-95)
    await expect(shopCard).toContainText('후기'); // reviewCount(:160)
    if (brandNameText) await expect(shopCard).toContainText(brandNameText); // brandName(:45,134)
    await page.getByRole('link', { name: `${name} 상세 보기` }).first().click();
    await expect(page).toHaveURL(/\/shop\/.+/);
    const productId = new URL(page.url()).pathname.split('/').pop()!;

    // ── 10) 공개 상세 — shop-detail 표면 계약을 fieldSurfaceMatrix 에서 끌어 검증 ──
    await expect(page.locator('h1')).toContainText(name);
    const body = page.locator('body');
    // 매트릭스 text 필드 → 값 존재로 일괄 검증(ad-hoc 하드코딩 대신 계약에서 파생).
    const publicValues: Record<string, string | undefined> = {
      name,
      salePrice: '9,000',
      price: '12,000',
      description,
      ingredients,
      howToUse,
      recommendedFor: recommended,
      caution: cautionText,
      shippingFee: '3,000',
      deliveryEstimate,
      returnNotice,
      sellerName,
      pointsRate: `${pointsRate}%`, // "…{rate}% 적립 설정"
      brandName: brandNameText,
    };
    for (const f of getSurface('shop-detail').fields) {
      if (f.kind !== 'text') continue;
      const v = publicValues[f.field];
      if (!v) continue;
      await expect(body, `shop-detail 필드 ${f.field}(${f.render})`).toContainText(v);
    }
    // derived/select/image 필드 — 개별 검증.
    await expect(body).toContainText('구매평 0개'); // rating/reviewCount(derived, 기본 0)
    const optionSelect = page.locator('select').filter({ hasText: opt1Name }); // options(select)
    await expect(optionSelect).toContainText(opt1Name);
    await expect(optionSelect).toContainText(opt2Name);
    await expect(page.locator(`img[alt="${name}"]`).first()).toBeVisible(); // image/images

    // ── 11) detailBlocks: ProductDetailEditor 로 text+image 블록 저장 ──
    await page.goto(`/admin/products/${productId}/editor`);
    await page.getByRole('button', { name: '텍스트 추가' }).click();
    await page
      .getByPlaceholder('텍스트를 입력하세요. 입력한 그대로(평문) 표시됩니다.')
      .fill(detailText);
    await page.getByRole('button', { name: '이미지 추가' }).click();
    await page.locator('input[type="file"]').last().setInputFiles(blockImagePath);
    await expect(page.locator('img[alt="Uploaded"]')).toHaveCount(1, { timeout: 20_000 });
    await page.getByPlaceholder('이미지 설명 (대체 텍스트)').fill(detailImageAlt);
    await page.getByRole('button', { name: '상세페이지 저장' }).click();
    await page.waitForURL((url) => url.pathname === '/admin/products', { timeout: 20_000 });

    // ── 12) 공개 #story — detailBlocks 가 순서대로(text → image) 렌더 ──
    await page.goto(`/shop/${productId}`);
    const story = page.locator('#story');
    await expect(async () => {
      await page.reload();
      await expect(story).toContainText(detailText); // text 블록
      await expect(story.locator(`img[alt="${detailImageAlt}"]`)).toHaveCount(1); // image 블록
    }).toPass({ timeout: 20_000 });
    // 순서: text 블록이 image 블록보다 먼저 나온다(#story .map 순서 보존).
    const storyText = await story.innerText();
    expect(storyText).toContain(detailText);

    // ── 13) 관리자 편집 폼 재열람 — 필드별 왕복(round-trip) 검증 ──
    await page.goto(`/admin/products/${productId}`);
    await expect(page.locator('#product-name')).toHaveValue(name);
    await expect(page.locator('#product-brand')).toHaveValue('b1');
    await expect(page.locator('#product-category')).toHaveValue(categoryValue);
    await expect(page.locator('#product-lifestyle')).toHaveValue(lifestyleValue);
    await expect(page.locator('select').filter({ has: page.locator('option[value="both"]') })).toHaveValue('dog');
    await expect(page.getByPlaceholder('상품 카드에 노출될 짧은 설명')).toHaveValue(summary);
    await expect(
      page.getByPlaceholder('간단한 상세 설명 (선택 — 상세페이지 에디터로 본문을 만들 거라면 비워두세요)'),
    ).toHaveValue(description);
    const editSpin = page.getByRole('spinbutton');
    await expect(editSpin.nth(0)).toHaveValue(String(price));
    await expect(editSpin.nth(1)).toHaveValue(String(salePrice));
    await expect(editSpin.nth(2)).toHaveValue(String(stock));
    await expect(editSpin.nth(3)).toHaveValue(String(shippingFee));
    await expect(page.getByPlaceholder('상품금액 기준. 배송비 제외')).toHaveValue(String(pointsRate));
    await expect(page.getByLabel('옵션 1 이름')).toHaveValue(opt1Name);
    await expect(page.getByLabel('옵션 1 가격')).toHaveValue('20000');
    await expect(page.getByLabel('옵션 2 이름')).toHaveValue(opt2Name);
    await expect(page.getByLabel('옵션 2 가격')).toHaveValue('45000');
    await expect(page.getByPlaceholder('예: 닭고기 40%, 현미, 연어오일…')).toHaveValue(ingredients);
    await expect(page.getByPlaceholder('예: 체중 5kg 기준 하루 60g, 2회 나눠 급여')).toHaveValue(howToUse);
    await expect(page.getByLabel('추천 대상 1', { exact: true })).toHaveValue(recommended);
    await expect(page.getByLabel('주의사항 1', { exact: true })).toHaveValue(cautionText);
    await expect(page.getByPlaceholder('예: 오후 2시 이전 주문 시 당일 출고')).toHaveValue(deliveryEstimate);
    await expect(page.getByPlaceholder('예: 제주/도서산간 추가 배송비')).toHaveValue(shippingNotice);
    await expect(page.getByPlaceholder('예: 단순 변심 시 수령 후 7일 이내')).toHaveValue(returnNotice);
    await expect(page.getByPlaceholder('예: 백조오브제')).toHaveValue(sellerName);
    await expect(page.getByLabel('스토어 노출')).toBeChecked();
    await expect(page.getByLabel('추천 상품 (MD)')).toBeChecked();
    await expect(page.getByLabel('베스트 상품')).toBeChecked();
    // 대표 이미지 + 갤러리 1장 = Uploaded 미리보기 2장 이상.
    await expect(page.locator('img[alt="Uploaded"]').first()).toBeVisible({ timeout: 15_000 });
    expect(await page.locator('img[alt="Uploaded"]').count()).toBeGreaterThanOrEqual(2);

    // ── 14) 경계값 + 특수문자(XSS) + price=0 수정 패스(같은 상품) ──
    // 경계: name 을 MAX_NAME(200) 길이로(접두사는 유지해 정리 검색에 계속 잡히게).
    const boundaryName = SEARCH_PREFIX + 'x'.repeat(200 - SEARCH_PREFIX.length);
    // 특수문자/이스케이프: 벤치 태그 문자열이 평문(escaped)으로 렌더되는지(=미실행) 검증용.
    const xssProbe = `<e2e-xss-${runId}> "'&> 🐶`;
    // 경계: description 을 MAX_LONG_TEXT(3000) 근처로.
    const longDescription = xssProbe + ' ' + '가'.repeat(2900);

    await page.locator('#product-name').fill(boundaryName);
    await page.getByPlaceholder('상품 카드에 노출될 짧은 설명').fill(xssProbe);
    await page
      .getByPlaceholder('간단한 상세 설명 (선택 — 상세페이지 에디터로 본문을 만들 거라면 비워두세요)')
      .fill(longDescription);
    // price=0 은 salePrice > price 위반이 되므로 salePrice 도 0 으로 낮춘다(검증기 교차검증 통과).
    const boundarySpin = page.getByRole('spinbutton');
    await boundarySpin.nth(1).fill('0'); // salePrice
    await boundarySpin.nth(0).fill('0'); // price
    await page.getByRole('button', { name: '수정 사항 저장' }).click();
    await page.waitForURL((url) => url.pathname === '/admin/products', { timeout: 20_000 });

    // 공개 상세 재확인 — 크래시 없이 로드되고, 태그 문자열이 평문으로(escaped) 렌더된다.
    await page.goto(`/shop/${productId}`);
    await expect(async () => {
      await page.reload();
      await expect(page.locator('h1')).toContainText(boundaryName.slice(0, 30));
    }).toPass({ timeout: 20_000 });
    // 이스케이프 확인: `<e2e-xss-...>` 가 실제 DOM 요소가 아니라 텍스트로 존재하면
    // toContainText 가 매치된다(HTML 파싱됐다면 알 수 없는 태그라 textContent 에 안 남는다).
    await expect(page.locator('body')).toContainText(`<e2e-xss-${runId}>`);

    // ── 15) 정리 — 리뷰/문의 없는 신규 상품이라 정상 삭제. 목록에서 체크박스+일괄삭제 ──
    await page.goto('/admin/products');
    await page.getByPlaceholder(PRODUCTS_SEARCH_PLACEHOLDER).fill(SEARCH_PREFIX);
    const delRow = page.locator('tr', { hasText: SEARCH_PREFIX });
    await delRow.first().locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: '삭제' }).click();
    await page.getByPlaceholder(PRODUCTS_SEARCH_PLACEHOLDER).fill(SEARCH_PREFIX);
    await expect(page.locator('table')).not.toContainText(SEARCH_PREFIX, { timeout: 15_000 });

    // 삭제가 진짜 DB 에 반영됐는지 — 공개 상세 404.
    const deletedResponse = await page.goto(`/shop/${productId}`);
    expect(deletedResponse?.status()).toBe(404);
  });

  // ── 빈 상태(empty-state) 변형 — 그레이스풀 렌더 검증(재고0 품절·옵션 없음·detailBlocks 없음) ──
  // ⚠️ "이미지 없음" 변형은 admin 폼으로 만들 수 없다(REQUIRED_FIELDS 에 image 포함 — 폼이 막음).
  //    이미지 없는 상품은 레거시 시드 데이터로만 존재 → 카드/상세 placeholder 렌더는 코드 분기
  //    (ProductCard.tsx:124 "상품 이미지 준비 중", ProductDetailClient.tsx:148-156)로만 커버되며
  //    이 스펙 범위 밖(폼 경계). 나머지 빈 상태(재고0·옵션無·detailBlocks無)는 폼으로 재현·검증한다.
  test('빈 상태 변형 — 재고0 품절 뱃지·옵션 없음·detailBlocks 없음 그레이스풀 렌더', async ({ page }) => {
    assertNotProd();
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await loginAsAdmin(page);
    await page.goto('/admin/products/new');

    const emptyName = `${SEARCH_PREFIX}empty-${runId}`;
    await page.locator('#product-name').fill(emptyName);
    await page.locator('#product-brand').selectOption('b1');
    await page.locator('#product-category').selectOption({ index: 1 });
    await page.locator('#product-lifestyle').selectOption({ index: 1 });
    const spin = page.getByRole('spinbutton');
    await spin.nth(0).fill('10000'); // price
    await spin.nth(2).fill('0'); // stock=0 → 품절
    await page.locator('input[type="file"]').setInputFiles(mainImagePath); // 대표 이미지는 필수
    await expect(page.locator('img[alt="Uploaded"]')).toHaveCount(1, { timeout: 20_000 });
    await page.getByLabel('스토어 노출').check();
    await page.getByRole('button', { name: '등록 완료' }).click();
    await page.waitForURL((url) => url.pathname === '/admin/products', { timeout: 20_000 });

    // 카드: 재고0 → "잠시 품절" 뱃지(shop-card stock 계약), 리터럴 undefined 없음.
    await page.goto(`/shop?search=${encodeURIComponent(emptyName)}`);
    const card = page.locator('article', { hasText: emptyName }).first();
    await expect(card).toBeVisible({ timeout: 15_000 });
    await expect(card).toContainText('잠시 품절'); // ProductCard.tsx:70,96-100
    await expect(card).not.toContainText('undefined');
    await page.getByRole('link', { name: `${emptyName} 상세 보기` }).first().click();
    const emptyId = new URL(page.url()).pathname.split('/').pop()!;

    // 상세: 옵션 셀렉터 없음 + 품절 버튼 + 단일 이미지 폴백(크래시·리터럴 undefined 없음).
    await expect(page.locator('h1')).toContainText(emptyName);
    await expect(page.getByText('옵션 선택')).toHaveCount(0); // no-options(ProductDetailClient.tsx:211)
    await expect(page.getByRole('button', { name: '품절' }).first()).toBeVisible(); // :289/:297
    await expect(page.locator('body')).not.toContainText('undefined');
    await expect(page.locator(`img[alt="${emptyName}"]`).first()).toBeVisible(); // 이미지 폴백 그레이스풀

    // 정리 — 이 상품만.
    await page.goto('/admin/products');
    await page.getByPlaceholder(PRODUCTS_SEARCH_PLACEHOLDER).fill(emptyName);
    await page.locator('tr', { hasText: emptyName }).first().locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: '삭제' }).click();
    await page.getByPlaceholder(PRODUCTS_SEARCH_PLACEHOLDER).fill(emptyName);
    await expect(page.locator('table')).not.toContainText(emptyName, { timeout: 15_000 });
    // 삭제 반영 확인.
    const gone = await page.goto(`/shop/${emptyId}`);
    expect(gone?.status()).toBe(404);
  });

  // ── 부정 입력(negative) — 필수 필드 누락 시 UI 가 거부하고 DB 는 변경되지 않는다 ──
  test('필수 필드 누락 → 등록 거부(에러 배너) + DB 무변경', async ({ page }) => {
    assertNotProd();
    await loginAsAdmin(page);
    await page.goto('/admin/products/new');

    const negName = `${SEARCH_PREFIX}neg-${runId}`;
    // 상품명만 채우고 브랜드·카테고리·라이프스타일·이미지(나머지 필수 4개)는 비운 채 저장.
    await page.locator('#product-name').fill(negName);
    await page.getByRole('button', { name: '등록 완료' }).click();

    // 거부: 에러 배너 노출 + /new 에 머무름(리다이렉트 없음).
    // ⚠️ getByRole('alert')는 Next 의 빈 __next-route-announcer__ 와 2건 매치되므로 텍스트로 특정.
    await expect(page.getByText(/필수 항목/).first()).toBeVisible(); // ProductForm.tsx:212 setError
    await expect(page).toHaveURL(/\/admin\/products\/new$/);

    // DB 무변경: 목록 재조회(서버 fetch) 시 이 이름의 행이 없다.
    await page.goto('/admin/products');
    await page.getByPlaceholder(PRODUCTS_SEARCH_PLACEHOLDER).fill(negName);
    await expect(page.locator('tr', { hasText: negName })).toHaveCount(0, { timeout: 10_000 });
  });
});
