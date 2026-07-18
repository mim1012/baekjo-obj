import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /admin/brands → /brands, /brands/[id].
//
// ⚠️ 브랜드 삭제는 가드가 없다 — supabase/migrations/0004_products_brands.sql:17
// `brand_id text references public.brands(id) on delete set null`. 관리자 목록의 확인창 문구
// ("소속 상품이 있는 경우 문제가 발생할 수 있습니다" — src/app/admin/brands/page.tsx:64)는
// 경고일 뿐 실제 차단이 아니다: src/lib/brands/repo.ts:202-206 deleteBrand는 단순
// `delete().eq('id', id)`. 이 스펙은 상품을 하나도 연결하지 않은 신규 브랜드만 다루므로
// 삭제해도 부작용이 없다 — 그래서 "가드 우회 검증"이 아니라 정상 lifecycle(등록→수정→
// 비노출→삭제) 스펙으로 작성한다.
//
// ⚠️ BrandForm(모달, src/components/admin-new/brands/BrandForm.tsx)은 notices/concerns의
// AdminResourcePage 폼과 달리 FormField가 label에 htmlFor를 넘기지 않는다 — "진열 순서" 필드만
// 예외로 htmlFor="brand-display-order"(= input id)를 갖는다. 그래서 getByLabel은 대부분 필드에서
// 매칭되지 않는다(label이 input을 감싸지도, for로 연결되지도 않음) — 체크박스 3개(추천/노출/신규)만
// <label>이 <input>을 직접 감싸 getByLabel이 동작한다. 나머지 필드는 placeholder/select/파일input
// 으로 잡는다. 그리고 admin 목록 테이블은 모달이 열려도 DOM에 계속 남아 있고, 각 행의 노출 토글
// 버튼 aria-label이 "브랜드관 노출 켜짐/꺼짐, 클릭하여 전환"이라 체크박스 라벨("브랜드관 노출")과
// 문서 전체 기준 substring이 겹친다 — 그래서 모든 폼 필드 로케이터를 `#brand-form`(모달의
// <form id="brand-form">)으로 스코핑한다. 제출 버튼(저장/등록/수정 완료)은 모달 푸터에
// `form="brand-form"` 속성으로 연결돼 있을 뿐 실제로는 <form> 밖에 있어 스코핑하지 않는다.
//
// ⚠️ 라벨 충돌 — 제출 버튼 "브랜드 등록"(정확히 이 텍스트)은 헤더의 트리거 버튼
// "새 브랜드 등록"의 accessible name에 substring으로 포함된다("새 브랜드 등록".includes("브랜드 등록")
// === true) — getByRole 기본 substring 매칭이라 exact:true 없이는 두 버튼 다 매칭돼 strict-mode
// violation이 난다. 실측 후 exact:true로 고정했다(다른 wave의 label 충돌과 같은 종류의 함정).
//
// ⚠️ 생성 필수 필드(src/lib/brands/validate.ts:112-227, requireAll=true 경로): name·logo·
// description·philosophy·auditGrade 5개(toInsertInput이 이 5개 중 하나라도 undefined면 null을
// 반환해 400). 모달의 자체 JS 검증(BrandForm.tsx:48-49)은 name·description만 막고 logo·philosophy는
// 막지 않는다 — 빈 채로 제출하면 서버가 400을 내 등록이 조용히 실패한다(logo는 min 1자라 이미지
// 업로드 없이는 통과 불가). 그래서 이 스펙은 5개 필드를 전부 채우고, 로고는 ImageUploader(숨겨진
// input[type=file])에 1x1 PNG를 setInputFiles로 넣어 실제 업로드(스테이징 Supabase storage)를 거친다.
//
// ⚠️ 정렬 함정 — 공개/관리자 목록 둘 다 displayOrder 오름차순(미지정은 맨 뒤)으로 정렬하고,
// 공개 /brands는 PAGE_SIZE=12만 초기 렌더한다(BrandsContent.tsx). displayOrder를 안 채우면 신규
// 브랜드가 기존 브랜드 수에 따라 12건 밖으로 밀려날 수 있어(concerns 스펙의 append-only 함정과
// 같은 종류) displayOrder=0으로 명시해 항상 맨 앞에 오게 만든다.
//
// 🚨 쓰기(write) 스펙 — 실제 DB(+스토리지)에 데이터를 만들고 지운다. E2E_ADMIN_CRUD=1 로
// 명시적으로 켜지 않으면 전체 skip. 절대 production을 겨냥하지 말 것 — 대상은 Vercel Preview/
// staging뿐.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 브랜드', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const SEARCH_PREFIX = 'E2E-브랜드-';
  const name = `${SEARCH_PREFIX}${runId}`;
  const editedName = `${name}-수정`;
  const description = `E2E 한 줄 소개 ${runId}`;
  const philosophy = `E2E 브랜드 철학 스토리 ${runId}`;
  const officialUrl = `https://example.com/e2e-brand-${runId}`;
  const BRANDS_SEARCH_PLACEHOLDER = '브랜드명 검색...';

  // 1x1 투명 PNG — setInputFiles가 통과할 최소 유효 파일이면 되므로 실제 이미지 내용은 무의미하다.
  const PNG_1PX_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const logoFilePath = path.join(os.tmpdir(), `e2e-brand-logo-${runId}.png`);

  /**
   * ⚠️ 브랜드 목록은 다른 도메인(AdminResourcePage 기반, 로컬 state 즉시 갱신)과 달리
   * 삭제 성공 후 fetchData()로 서버를 통째로 재조회한다(src/app/admin/brands/page.tsx:63-69
   * handleDelete → deleteBrand → fetchData()). 이 재조회는 실제 Supabase 왕복이라
   * adminCrudHelpers.ts의 deleteMatchingAdminRows가 쓰는 고정 600ms 대기보다 느릴 수 있다 —
   * 실측(2026-07-18): 고정 대기로 삭제 버튼을 연타하면 두 번째 클릭이 아직 갱신 전인 행을
   * 노리다 서버에서 실패(alert 'network')하는데, 실패해도 다음 루프에서 행이 사라진 것처럼
   * 보여 정리가 누락된 채로 넘어갔다(스테이징에 고아 테스트 브랜드가 실제로 남는 사고 재현·수습함).
   * 그래서 이 도메인 전용 정리 함수는 행이 실제로 DOM에서 detach될 때까지 기다린 뒤 다음 삭제로 넘어간다.
   */
  async function cleanupStaleBrands(page: Page): Promise<void> {
    page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });
    await page.goto('/admin/brands');
    const search = page.getByPlaceholder(BRANDS_SEARCH_PLACEHOLDER);
    await search.waitFor({ state: 'visible', timeout: 15_000 });
    await search.fill(SEARCH_PREFIX);
    await page.waitForTimeout(500); // 클라이언트 필터 반영(디바운스 없음이지만 렌더 여유).

    for (let i = 0; i < 10; i += 1) {
      const rows = page.locator('tr', { hasText: SEARCH_PREFIX });
      if ((await rows.count()) === 0) break;
      const target = rows.first();
      await target.getByRole('button', { name: '삭제' }).click();
      // 행이 실제로 사라질 때까지 기다린다 — 고정 대기 금지(위 주석 참조).
      await target.waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {});
    }
  }

  test.beforeAll(async ({ browser }) => {
    fs.writeFileSync(logoFilePath, Buffer.from(PNG_1PX_BASE64, 'base64'));

    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupStaleBrands(page);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupStaleBrands(page);
    await page.close();
    fs.rmSync(logoFilePath, { force: true });
  });

  test('등록 → 필드 단위로 /brands·/brands/[id]에 반영 → 수정 → 비노출 전환 → 삭제 → 사라짐', async ({
    page,
  }) => {
    page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });

    await loginAsAdmin(page);
    await page.goto('/admin/brands');

    // 1) 등록 — BrandForm 모달. 필수 5필드(name/logo/description/philosophy/auditGrade) 전부 채우고
    // displayOrder=0으로 목록 최상단·PAGE_SIZE 안쪽에 고정한다.
    await page.getByRole('button', { name: '새 브랜드 등록' }).click();
    const form = page.locator('form#brand-form');
    await form.locator('input[type="file"]').setInputFiles(logoFilePath);
    // 업로드 완료(썸네일 <img alt="Uploaded"> 렌더)까지 대기 — 업로드 전 저장을 누르면 logo가
    // 빈 문자열로 남아 서버 validate(min 1자)가 400을 낸다.
    await expect(form.locator('img[alt="Uploaded"]')).toBeVisible({ timeout: 20_000 });
    await form.locator('input[placeholder="예: 지위픽"]').fill(name);
    await form.locator('select').selectOption('B+');
    await form.locator('textarea[placeholder="브랜드관에 표시할 간단한 소개"]').fill(description);
    await form
      .locator('textarea[placeholder="상세한 브랜드 스토리와 철학을 입력하세요."]')
      .fill(philosophy);
    await form.locator('input[type="url"]').fill(officialUrl);
    await form.getByLabel('신규 브랜드 뱃지').check();
    await form.getByLabel('진열 순서').fill('0');
    // ⚠️ "브랜드 등록"은 "새 브랜드 등록"(헤더 트리거)의 substring이라 exact:true 필수(위 주석).
    await page.getByRole('button', { name: '브랜드 등록', exact: true }).click();

    // 2) 관리자 목록 — 등록한 필드 전부(등급·상품수·노출상태·공식몰 URL)가 반영됐는지 행 단위로 확인.
    const adminRow = page.locator('tr', { hasText: name });
    await expect(adminRow).toBeVisible({ timeout: 15_000 });
    await expect(adminRow).toContainText('B+ 등급');
    await expect(adminRow).toContainText('0개'); // 신규 브랜드라 등록 상품 0건
    await expect(adminRow).toContainText('노출'); // isVisible 기본값 true
    await expect(adminRow.locator(`a[href="${officialUrl}"]`)).toHaveCount(1);

    // 3) 공개 /brands 목록 카드 — 이름·소개가 그대로 노출되는지 확인, 클릭해 상세로 이동(id 확보).
    // ⚠️ displayOrder=0으로 맨 앞에 고정했더니 "스포트라이트 브랜드"(1위 브랜드 소개 섹션)와
    // 전체 그리드 양쪽에 같은 <article> 마크업으로 두 번 렌더돼 strict mode violation이 났다
    // (실측) — .first()로 스코핑한다(둘 다 같은 브랜드 카드라 어느 쪽이든 검증 내용은 동일).
    await page.goto('/brands');
    const brandCard = page.locator('article', { hasText: name }).first();
    await expect(brandCard).toBeVisible({ timeout: 15_000 });
    await expect(brandCard).toContainText(description);
    await brandCard.getByRole('link').first().click();
    await expect(page).toHaveURL(/\/brands\/.+/);
    const brandId = new URL(page.url()).pathname.split('/').pop()!;

    // 3-1) isNew는 카드에 별도 배지가 없고 /brands?filter=new 탭 필터로만 드러난다
    // (BrandsContent.tsx filteredBrands: filter==='new' → brand.isNew) — 필터 탭에서도 보이는지 확인.
    await page.goto('/brands?filter=new');
    await expect(page.locator('article', { hasText: name }).first()).toBeVisible({ timeout: 15_000 });

    // 4) 공개 상세 — 이름·소개·철학·감사 상태(신규 브랜드=감사 리포트 없음)가 반영됐는지 확인.
    await page.goto(`/brands/${brandId}`);
    await expect(page.locator('h1')).toContainText(name);
    await expect(page.locator('body')).toContainText(description);
    await expect(page.locator('body')).toContainText(philosophy);
    await expect(page.locator('body')).toContainText('입점 자료 확인 중');

    // 5) 관리자로 돌아와 이름 수정(빠른 수정 모달, "수정" 버튼의 aria-label이 "{name} 빠른 수정").
    await page.goto('/admin/brands');
    await page.getByPlaceholder(BRANDS_SEARCH_PLACEHOLDER).fill(name);
    await expect(page.getByRole('button', { name: '빠른 수정' })).toHaveCount(1);
    await page.getByRole('button', { name: '빠른 수정' }).click();
    await form.locator('input[placeholder="예: 지위픽"]').fill(editedName);
    await page.getByRole('button', { name: '수정 완료' }).click();
    await expect(page.locator('table')).toContainText(editedName, { timeout: 15_000 });

    // 6) 공개 화면에 수정 반영 확인.
    await page.goto('/brands');
    await expect(page.locator('body')).toContainText(editedName);

    // 7) 노출 끄기 — 목록의 노출 토글 버튼. ⚠️ admin/brands/page.tsx:83 handleToggleVisible는
    // 낙관적 업데이트라 서버 PATCH가 끝나기 전에 행이 이미 '숨김'으로 보인다 — 그 직후 바로
    // 공개 화면을 확인하면 PATCH가 아직 커밋되지 않아 실패할 수 있다(실측). PATCH 응답 자체를
    // 기다려 실제 반영 시점을 확정한다.
    await page.goto('/admin/brands');
    await page.getByPlaceholder(BRANDS_SEARCH_PLACEHOLDER).fill(editedName);
    const toggleRow = page.locator('tr', { hasText: editedName });
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/brands/') && res.request().method() === 'PATCH'),
      toggleRow.getByRole('button', { name: /브랜드관 노출/ }).click(),
    ]);
    await expect(toggleRow).toContainText('숨김', { timeout: 15_000 });

    // 8) 비노출 확인 — 공개 목록에서 사라지고, 공개 상세도 404(getBrandById가 includeHidden 없이
    // 호출되면 is_visible:false 브랜드는 조회 자체가 안 됨 — src/lib/brands/repo.ts:149-158).
    await page.goto('/brands');
    await page.reload();
    await expect(page.locator('body')).not.toContainText(editedName);
    const hiddenDetailResponse = await page.goto(`/brands/${brandId}`);
    expect(hiddenDetailResponse?.status()).toBe(404);

    // 9) 삭제 — 상품이 없는 브랜드라 부작용 없이 삭제된다(파일 상단 주석 참조).
    await page.goto('/admin/brands');
    await page.getByPlaceholder(BRANDS_SEARCH_PLACEHOLDER).fill(editedName);
    await expect(page.getByRole('button', { name: '삭제' })).toHaveCount(1);
    await page.getByRole('button', { name: '삭제' }).click();
    await expect(page.locator('table')).not.toContainText(editedName, { timeout: 15_000 });

    // 10) 공개 화면 새로고침 후 완전히 사라졌는지, 상세도 404인지 확인(삭제가 진짜 DB에 반영됐는지 검증).
    await page.goto('/brands');
    await page.reload();
    await expect(page.locator('body')).not.toContainText(editedName);
    await expect(page.locator('body')).not.toContainText(name);
    const deletedDetailResponse = await page.goto(`/brands/${brandId}`);
    expect(deletedDetailResponse?.status()).toBe(404);
  });
});
