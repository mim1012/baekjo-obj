import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';
import { getSurface } from './_lib/fieldSurfaceMatrix';

// 골든플로우 #7 — 브랜드 폼 "전 필드 왕복" 실구동(BrandDetailEditor 기준).
//
// admin-crud-brands.spec.ts(모달 BrandForm 라이프사이클)의 자매편. 그 스펙이 빠른 등록 모달의
// 라이프사이클을 검증한다면, 이 스펙은 *전 필드 에디터* BrandDetailEditor(/admin/brands/[id])의
// 모든 필드(감사보고서 8필드·배송정책·대표상품·연관고민·검증포인트·근거출처·로고 실업로드)를 채워
//   (1) 저장 → 관리자 편집 재열람에서 필드별 왕복 검증,
//   (2) 공개 /brands/[id] 에서 공개 렌더되는 필드 검증(대표상품 섹션·연관고민 칩·이름/소개/철학).
// 를 한다.
//
// ⚠️ 독립성: representativeProductIds 는 "이 브랜드의 상품" 중에서만 고를 수 있다(ChipToggle 이
//    brandProducts=이 brandId 소속 상품으로 채워짐). 그래서 다른 스펙에 의존하지 않도록 이 스펙이
//    자체적으로 최소 상품 1건을 이 브랜드 아래 만들어 대표상품으로 연결한다(격리·병렬 안전).
// ⚠️ auditReport 는 "8필드 전부 채우거나 전부 비우거나"만 유효(all-or-nothing). 전부 채운다.
//    한 번 설정하면 UI 로 비울 수 없다(BrandDetailEditor 계약 한계) — 비우기는 시도하지 않는다.
// ⚠️ relatedConcernSlugs 는 핵심 6개(tear/skin/joint/obesity/stress/oral)만 사용해야 한다. 에디터가
//    렌더하는 concern 칩은 라이브 config(getConcernsConfigWithFallback)에서 오므로, "현재 렌더된
//    칩"을 고르면 삭제된 슬러그를 참조할 수 없다(렌더 자체가 라이브 config 기반). 첫 칩을 골라
//    라벨을 기록하고 왕복·공개에서 그 라벨을 확인한다.
// ⚠️ 로고는 실제 파일 업로드(ImageUploader) — wave-3 브랜드 스펙과 동일 패턴("#153 을 잡은 경로").
// ⚠️ 공개 상세에 auditReport 세부·배송정책은 렌더되지 않는다(상태 배지만 노출). 그 필드들은
//    관리자 왕복으로 검증한다. 공개는 대표상품·연관고민 칩·이름/소개/철학을 검증한다.
//
// 🚨 쓰기(write) 스펙 — 실제 DB(+스토리지)에 데이터를 만들고 지운다. E2E_ADMIN_CRUD=1 로
// 명시적으로 켜지 않으면 전체 skip. 절대 production 을 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 브랜드 전 필드 왕복(상세 에디터)', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });
  test.describe.configure({ mode: 'serial' });

  const runId = Date.now();
  const BRAND_PREFIX = 'E2E-필드브랜드-';
  const PRODUCT_PREFIX = 'E2E-필드브랜드상품-';
  const brandName = `${BRAND_PREFIX}${runId}`;
  const prodName = `${PRODUCT_PREFIX}${runId}`;
  const BRANDS_SEARCH_PLACEHOLDER = '브랜드명 검색...';
  const PRODUCTS_SEARCH_PLACEHOLDER = '상품명 또는 상품코드 검색...';

  // 모달 생성(BrandForm) 필드.
  const description = `E2E브랜드소개 ${runId}`;
  const philosophy = `E2E브랜드철학스토리 ${runId}`;
  const officialUrl = `https://example.com/e2e-brand-${runId}`;

  // BrandDetailEditor 전용(대형) 필드 값.
  const dispatchEstimate = `결제후1~2영업일 ${runId}`;
  const returnAddress = `서울시 어딘가 ${runId}`;
  const asNotice = `AS접수안내 ${runId}`;
  const supportContact = `010-0000-0000 ${runId}`;
  const supportHours = `평일 10-17 ${runId}`;
  const reportNo = `BOA-${runId}`;
  const auditedAt = '2026-01-15';
  const auditStatus = `검증완료 ${runId}`;
  const headline = `헤드라인 ${runId}`;
  const summaryTitle = `요약제목 ${runId}`;
  const summaryBody = `요약본문 ${runId}`;
  const selectionReason = `선정이유 ${runId}`;
  const processStep = `성분분석 ${runId}`;
  const auditPoint = `무방부제원료 ${runId}`;
  const sourceUrl = `https://example.com/e2e-source-${runId}`;

  let carrierValue = '';
  let concernLabel = '';

  const PNG_1PX_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const logoPath = path.join(os.tmpdir(), `e2e-bf-logo-${runId}.png`);
  const prodImagePath = path.join(os.tmpdir(), `e2e-bf-prod-${runId}.png`);

  function assertNotProd(): void {
    const target = process.env.E2E_BASE_URL || process.env.BASE_URL || '';
    if (/baekjo-obj\.vercel\.app/.test(target)) {
      throw new Error(`쓰기 스펙이 production(${target})을 겨냥했습니다 — 중단. 대상은 Preview/staging뿐.`);
    }
  }

  /** 브랜드 목록: 삭제 성공 후 서버 재조회(fetchData)라 고정 대기 대신 행 detach 까지 기다린다. */
  async function cleanupStaleBrands(page: Page): Promise<void> {
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await page.goto('/admin/brands');
    const search = page.getByPlaceholder(BRANDS_SEARCH_PLACEHOLDER);
    await search.waitFor({ state: 'visible', timeout: 15_000 });
    await search.fill(BRAND_PREFIX);
    await page.waitForTimeout(500);
    for (let i = 0; i < 10; i += 1) {
      const rows = page.locator('tr', { hasText: BRAND_PREFIX });
      if ((await rows.count()) === 0) break;
      const target = rows.first();
      await target.getByRole('button', { name: '삭제' }).click();
      await target.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
    }
  }

  /** 상품 목록: 체크박스 + 일괄삭제(멱등, 재검색 반복). 브랜드 삭제는 product.brand_id 를 null 로
   *  만들 뿐 상품을 지우지 않으므로(on delete set null) 상품은 별도로 정리한다. */
  async function cleanupStaleProducts(page: Page): Promise<void> {
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await page.goto('/admin/products');
      await page.getByPlaceholder(PRODUCTS_SEARCH_PLACEHOLDER).fill(PRODUCT_PREFIX);
      const rows = page.locator('tr', { hasText: PRODUCT_PREFIX });
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
    fs.writeFileSync(logoPath, Buffer.from(PNG_1PX_BASE64, 'base64'));
    fs.writeFileSync(prodImagePath, Buffer.from(PNG_1PX_BASE64, 'base64'));
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupStaleProducts(page); // 상품 먼저(브랜드 FK 참조 잔여물 제거).
    await cleanupStaleBrands(page);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupStaleProducts(page);
    await cleanupStaleBrands(page);
    await page.close();
    for (const p of [logoPath, prodImagePath]) fs.rmSync(p, { force: true });
  });

  test('상세 에디터 전 필드 등록 → 공개 반영 → 관리자 왕복 → 삭제', async ({ page }) => {
    assertNotProd();
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));

    await loginAsAdmin(page);

    // ── 1) 모달(BrandForm)로 브랜드 생성 — 필수 5필드 + officialUrl + displayOrder=0 + isNew ──
    await page.goto('/admin/brands');
    await page.getByRole('button', { name: '새 브랜드 등록' }).click();
    const modal = page.locator('form#brand-form');
    await modal.locator('input[type="file"]').setInputFiles(logoPath);
    await expect(modal.locator('img[alt="Uploaded"]')).toBeVisible({ timeout: 20_000 });
    await modal.locator('input[placeholder="예: 지위픽"]').fill(brandName);
    await modal.locator('select').selectOption('B+');
    await modal.locator('textarea[placeholder="브랜드관에 표시할 간단한 소개"]').fill(description);
    await modal
      .locator('textarea[placeholder="상세한 브랜드 스토리와 철학을 입력하세요."]')
      .fill(philosophy);
    await modal.locator('input[type="url"]').fill(officialUrl);
    await modal.getByLabel('신규 브랜드 뱃지').check();
    await modal.getByLabel('진열 순서').fill('0');
    // "브랜드 등록"은 헤더 트리거 "새 브랜드 등록"의 substring 이라 exact:true 필수(wave-3 함정).
    await page.getByRole('button', { name: '브랜드 등록', exact: true }).click();
    const adminRow = page.locator('tr', { hasText: brandName });
    await expect(adminRow).toBeVisible({ timeout: 15_000 });

    // 공개 /brands 에서 브랜드 id 확보(displayOrder=0 이라 맨 앞·PAGE_SIZE 안쪽).
    await page.goto('/brands');
    const brandCard = page.locator('article', { hasText: brandName }).first();
    await expect(brandCard).toBeVisible({ timeout: 15_000 });
    // brand-card 표면 계약(name·description·logo) 검증.
    await expect(brandCard).toContainText(brandName); // BrandCard.tsx:116
    await expect(brandCard).toContainText(description); // :118
    await expect(brandCard.locator('img').first()).toBeVisible(); // logo(:114)
    await brandCard.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/brands\/.+/);
    const brandId = new URL(page.url()).pathname.split('/').pop()!;

    // ── 2) 이 브랜드 아래 최소 상품 1건 생성(대표상품 연결용) ──
    await page.goto('/admin/products/new');
    await page.locator('#product-name').fill(prodName);
    await page.locator('#product-brand').selectOption(brandId);
    await page.locator('#product-category').selectOption({ index: 1 });
    await page.locator('#product-lifestyle').selectOption({ index: 1 });
    await page.locator('input[type="file"]').setInputFiles(prodImagePath);
    await expect(page.locator('img[alt="Uploaded"]')).toHaveCount(1, { timeout: 20_000 });
    await page.getByLabel('스토어 노출').check();
    await page.getByRole('button', { name: '등록 완료' }).click();
    await page.waitForURL((url) => url.pathname === '/admin/products', { timeout: 20_000 });

    // ── 3) BrandDetailEditor(/admin/brands/[id]) 전 필드 입력 ──
    await page.goto(`/admin/brands/${brandId}`);
    await expect(page.locator('#bd-name')).toHaveValue(brandName, { timeout: 15_000 });

    // 배송/출고/교환 정책.
    await page.locator('#ship-carrier').selectOption({ index: 1 });
    carrierValue = await page.locator('#ship-carrier').inputValue();
    await page.locator('#ship-dispatch').fill(dispatchEstimate);
    await page.locator('#ship-fee').fill('3000');
    await page.locator('#ship-free-threshold').fill('50000');
    await page.locator('#ship-return-fee').fill('3000');
    await page.locator('#ship-exchange-fee').fill('6000');
    await page.locator('#ship-return-address').fill(returnAddress);
    await page.locator('#ship-as-notice').fill(asNotice);
    await page.locator('#ship-support-contact').fill(supportContact);
    await page.locator('#ship-support-hours').fill(supportHours);

    // 감사 보고서(8필드 전부).
    await page.locator('#ar-reportNo').fill(reportNo);
    await page.locator('#ar-auditedAt').fill(auditedAt);
    await page.locator('#ar-status').fill(auditStatus);
    await page.locator('#ar-headline').fill(headline);
    await page.locator('#ar-summaryTitle').fill(summaryTitle);
    await page.locator('#ar-summary').fill(summaryBody);
    await page.locator('#ar-selectionReason').fill(selectionReason);
    await page.getByRole('button', { name: '단계 추가' }).click();
    await page.getByLabel('검증 과정 단계 1', { exact: true }).fill(processStep);

    // 대표상품 — 이 브랜드 상품(prodName) 칩 토글.
    await page.getByRole('button', { name: prodName }).click();
    await expect(page.getByRole('button', { name: prodName })).toHaveAttribute('aria-pressed', 'true');

    // 연관 고민 — 라이브 config 에서 렌더된 첫 칩 선택(삭제된 슬러그를 참조할 수 없음).
    const concernSection = page.locator('section').filter({ hasText: '연관 고민' });
    const firstConcernChip = concernSection.getByRole('button').first();
    concernLabel = (await firstConcernChip.innerText()).trim();
    await firstConcernChip.click();
    await expect(firstConcernChip).toHaveAttribute('aria-pressed', 'true');

    // 검증 포인트 · 근거 출처.
    await page.getByRole('button', { name: '포인트 추가' }).click();
    await page.getByLabel('검증 포인트 1', { exact: true }).fill(auditPoint);
    await page.getByRole('button', { name: '출처 추가' }).click();
    await page.getByLabel('근거 출처 1', { exact: true }).fill(sourceUrl);

    // 추천 노출 토글 켜기(모달에서 안 켰음) + displayOrder 유지.
    await page.getByLabel('브랜드관 추천 노출').check();

    await page.getByRole('button', { name: '저장' }).click();
    await page.waitForURL((url) => url.pathname === '/admin/brands', { timeout: 20_000 });

    // ── 4) 공개 /brands/[id] — brand-detail 표면 계약을 fieldSurfaceMatrix 에서 끌어 검증 ──
    await page.goto(`/brands/${brandId}`);
    await expect(page.locator('h1')).toContainText(brandName);
    const body = page.locator('body');
    // 매트릭스 brand-detail text 필드 → 값 존재로 일괄 검증.
    //  - relatedConcernSlugs: 선택한 concern 라벨(칩)
    //  - auditPoints: AuditAccordion 본문 체크리스트(collapse 여도 textContent 로 검증)
    //  - representativeProductIds: 대표상품 섹션의 상품명
    // ⚠️ auditReport/auditGrade/officialUrl 은 공개 렌더 PR 진행 중(fe/design-brand-audit-public)이라
    //    이 웨이브에서 공개 검증하지 않는다(matrix assertNow:false) — 관리자 왕복(아래 5)으로만 검증.
    const brandPublic: Record<string, string | undefined> = {
      name: brandName,
      description,
      philosophy,
      relatedConcernSlugs: concernLabel || undefined,
      auditPoints: auditPoint,
      representativeProductIds: prodName,
    };
    for (const f of getSurface('brand-detail').fields) {
      if (f.kind !== 'text') continue;
      const v = brandPublic[f.field];
      if (!v) continue;
      await expect(body, `brand-detail 필드 ${f.field}(${f.render})`).toContainText(v);
    }

    // ── 5) 관리자 재열람 — 대형 필드 왕복(round-trip) 검증 ──
    await page.goto(`/admin/brands/${brandId}`);
    await expect(page.locator('#bd-name')).toHaveValue(brandName, { timeout: 15_000 });
    await expect(page.locator('#bd-desc')).toHaveValue(description);
    await expect(page.locator('#bd-philosophy')).toHaveValue(philosophy);
    await expect(page.locator('#bd-official')).toHaveValue(officialUrl);
    await expect(page.locator('#bd-grade')).toHaveValue('B+');
    await expect(page.locator('#bd-order')).toHaveValue('0');
    // 배송정책.
    await expect(page.locator('#ship-carrier')).toHaveValue(carrierValue);
    await expect(page.locator('#ship-dispatch')).toHaveValue(dispatchEstimate);
    await expect(page.locator('#ship-fee')).toHaveValue('3000');
    await expect(page.locator('#ship-free-threshold')).toHaveValue('50000');
    await expect(page.locator('#ship-return-fee')).toHaveValue('3000');
    await expect(page.locator('#ship-exchange-fee')).toHaveValue('6000');
    await expect(page.locator('#ship-return-address')).toHaveValue(returnAddress);
    await expect(page.locator('#ship-as-notice')).toHaveValue(asNotice);
    await expect(page.locator('#ship-support-contact')).toHaveValue(supportContact);
    await expect(page.locator('#ship-support-hours')).toHaveValue(supportHours);
    // 감사 보고서 8필드.
    await expect(page.locator('#ar-reportNo')).toHaveValue(reportNo);
    await expect(page.locator('#ar-auditedAt')).toHaveValue(auditedAt);
    await expect(page.locator('#ar-status')).toHaveValue(auditStatus);
    await expect(page.locator('#ar-headline')).toHaveValue(headline);
    await expect(page.locator('#ar-summaryTitle')).toHaveValue(summaryTitle);
    await expect(page.locator('#ar-summary')).toHaveValue(summaryBody);
    await expect(page.locator('#ar-selectionReason')).toHaveValue(selectionReason);
    await expect(page.getByLabel('검증 과정 단계 1', { exact: true })).toHaveValue(processStep);
    // 대표상품·연관고민 칩 pressed 유지.
    await expect(page.getByRole('button', { name: prodName })).toHaveAttribute('aria-pressed', 'true');
    if (concernLabel) {
      await expect(
        page.locator('section').filter({ hasText: '연관 고민' }).getByRole('button', { name: concernLabel }),
      ).toHaveAttribute('aria-pressed', 'true');
    }
    // 검증 포인트·근거 출처·추천 토글.
    await expect(page.getByLabel('검증 포인트 1', { exact: true })).toHaveValue(auditPoint);
    await expect(page.getByLabel('근거 출처 1', { exact: true })).toHaveValue(sourceUrl);
    await expect(page.getByLabel('브랜드관 추천 노출')).toBeChecked();
    await expect(page.getByLabel('신규 브랜드 뱃지')).toBeChecked();

    // ── 6) 정리 — 상품 먼저(브랜드 FK), 그다음 브랜드 삭제 ──
    await cleanupStaleProducts(page);
    await page.goto('/admin/brands');
    await page.getByPlaceholder(BRANDS_SEARCH_PLACEHOLDER).fill(brandName);
    const delRow = page.locator('tr', { hasText: brandName });
    await delRow.first().getByRole('button', { name: '삭제' }).click();
    await delRow.first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});

    // 삭제가 진짜 DB 에 반영됐는지 — 공개 상세 404.
    const deletedResponse = await page.goto(`/brands/${brandId}`);
    expect(deletedResponse?.status()).toBe(404);
  });

  // ── 부정 입력(negative) — 필수 필드 누락 시 브랜드 등록이 거부되고 DB 는 변경되지 않는다 ──
  test('필수 필드 누락 → 브랜드 등록 거부 + DB 무변경', async ({ page }) => {
    assertNotProd();
    await loginAsAdmin(page);
    await page.goto('/admin/brands');
    await page.getByRole('button', { name: '새 브랜드 등록' }).click();

    const negBrand = `${BRAND_PREFIX}neg-${runId}`;
    // 이름만 채우고 로고·소개·철학·등급 없이 제출 → 클라 검증(BrandForm.tsx:48-49 name·description)
    // 또는 서버 400(logo min 1자)으로 거부. 어느 경로든 행이 생기면 안 된다.
    await page.locator('form#brand-form').locator('input[placeholder="예: 지위픽"]').fill(negBrand);
    await page.getByRole('button', { name: '브랜드 등록', exact: true }).click();

    // DB 무변경: 목록 재조회 시 이 이름의 행이 없다.
    await page.goto('/admin/brands');
    await page.getByPlaceholder(BRANDS_SEARCH_PLACEHOLDER).fill(negBrand);
    await expect(page.locator('tr', { hasText: negBrand })).toHaveCount(0, { timeout: 10_000 });
  });
});
