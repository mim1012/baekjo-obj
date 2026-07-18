import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CRUD_ENABLED,
  bypassHeaders,
  deleteMatchingAdminRows,
  loginAsAdmin,
} from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /admin/concerns → 고민을 노출하는 공개 화면.
//
// 2026-07-18 배경: 관리자 삭제가 저장 안 되고, 수정이 새로고침하면 되돌아오는 버그 2건이
// 209개 소스-계약 테스트를 통과한 채로 배포됐다 — 아무 테스트도 실제로 화면을 클릭하지
// 않았기 때문이다. 이 스펙은 브라우저로 등록 → 관리자가 입력한 필드 하나하나가
// /concerns/[slug] 상세 페이지에 정확히 반영되는지 → 삭제 → 404로 사라짐까지 실제로 클릭해
// 검증한다.
//
// ⚠️ 공개 /concerns 목록(mainConcerns = concerns.slice(0, 8), subConcerns = concerns.slice(8, 12))은
// notices 홈 위젯과 같은 구조적 함정이 있다 — 등록은 배열 끝에 append하고 목록은 앞 12건만
// 보여줘 신규 고민은 절대 그 12건에 들 수 없다(staging 실데이터가 12건을 넘는 한). #144가 고친
// 건 notices 뿐이라 concerns 목록은 아직 이 함정이 살아있다 — 여기서 검증하지 않고 팀 리드에게
// 플래그한다. slug는 title로부터 결정론적으로 생성되므로(createConcernSlug) 상세 페이지는 직접
// URL로 검증 가능하다.
//
// ⚠️ #148(AdminIdMultiPicker) — 추천 상품/브랜드 필드가 "쉼표 구분 ID" 텍스트 입력에서 이름
// 검색+체크 드롭다운으로 바뀌었다(src/components/admin/AdminIdMultiPicker.tsx). formFields의
// label도 '추천 상품 ID(쉼표 구분)' → '추천 상품'(브랜드도 동일 패턴)으로 바뀌어, 트리거 버튼의
// aria-label이 그 label 그대로 붙는다(AdminResourcePage.tsx renderField: `ariaLabel={field.label}`).
// 저장 형식(쉼표 구분 id 문자열)은 그대로라 공개 화면 소비 로직은 무변화 — 선택 UI만 바뀌었다.
//
// 🚨 쓰기(write) 스펙 — 실제 DB에 데이터를 만들고 지운다. E2E_ADMIN_CRUD=1 로 명시적으로
// 켜지 않으면 전체 skip. 절대 production을 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 고민별 케어', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  // 제목을 전부 ASCII로 구성해 slug 생성(createConcernSlug: 소문자화 + 비영숫자를 '-'로)이
  // 결정론적으로 예측 가능하게 한다 — 한글이 섞이면 slugify 결과에서 전부 탈락해 slug가
  // 'care'로 뭉개진다.
  const SEARCH_PREFIX = 'E2E-CONCERN-';
  const title = `${SEARCH_PREFIX}${runId}`;
  const expectedSlug = `e2e-concern-${runId}`;
  const icon = '🧪';
  const shortDescription = `E2E 짧은 설명 ${runId}`;
  const symptomA = `E2E증상A${runId}`;
  const symptomB = `E2E증상B${runId}`;
  const causeA = `E2E원인A${runId}`;
  const causeB = `E2E원인B${runId}`;
  const faqQuestion = `E2E질문${runId}`;
  const faqAnswer = `E2E답변${runId}`;
  const CONCERNS_SEARCH_PLACEHOLDER = '고민명 검색';

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await deleteMatchingAdminRows(page, '/admin/concerns', CONCERNS_SEARCH_PLACEHOLDER, SEARCH_PREFIX);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await deleteMatchingAdminRows(page, '/admin/concerns', CONCERNS_SEARCH_PLACEHOLDER, SEARCH_PREFIX);
    await page.close();
  });

  /**
   * AdminIdMultiPicker(#148) 트리거를 열고 이름으로 검색해 옵션을 체크한 뒤 닫는다.
   * 트리거 버튼의 aria-label은 field.label 그대로다(예: '추천 상품'·'추천 브랜드').
   */
  async function selectIdPickerOption(
    page: import('@playwright/test').Page,
    triggerLabel: string,
    optionName: string,
  ) {
    const trigger = page.getByRole('button', { name: triggerLabel, exact: true });
    await trigger.click();
    await page.getByRole('textbox', { name: `${triggerLabel} 검색` }).fill(optionName);
    await page.getByRole('option', { name: optionName }).first().click();
    await trigger.click(); // 드롭다운 닫기 — 다음 필드 조작 시 겹치는 오버레이 방지.
  }

  test('등록 → 필드 단위로 /concerns/[slug] 상세에 반영 → 삭제 → 404로 사라짐', async ({ page }) => {
    page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });

    // 추천 상품(p1)·브랜드(b1) 이름은 하드코딩하지 않고 공개 API에서 실시간 조회한다
    // (admin-crud-showcase-reviews.spec.ts와 동일한 이유 — 시드 이후 이름이 바뀔 수 있다).
    const [productRes, brandRes] = await Promise.all([
      page.request.get('/api/products/p1'),
      page.request.get('/api/brands/b1'),
    ]);
    expect(productRes.ok()).toBe(true);
    expect(brandRes.ok()).toBe(true);
    const productName: string = (await productRes.json()).product.name;
    const brandName: string = (await brandRes.json()).brand.name;

    await loginAsAdmin(page);
    // ⚠️ /admin/concerns의 "고민 등록" 버튼은 notices/reviews/kits/partners와 달리 config 로드
    // 완료를 기다리지 않고 항상 렌더된다(onCreateRow={handleCreate}, ready 가드 없음). handleCreate
    // 내부의 `if (!loaded || loadError) return;`가 로드 전 클릭을 조용히 no-op으로 삼켜서, 필드가
    // 적은 폼(이 스펙처럼 필드 9개를 채우기 전에 로드가 끝나는 경우엔 우연히 통과하지만) 필드가
    // 적었다면(예: FAQ 스펙) 로드 완료 전에 저장을 눌러 등록이 통째로 유실될 수 있다(실측:
    // admin-crud-insurance-content.spec.ts에서 이 경쟁으로 실제 실패를 재현했다). GET 응답을
    // 명시적으로 기다려 결정론적으로 만든다.
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/concerns') && res.request().method() === 'GET'),
      page.goto('/admin/concerns'),
    ]);

    // 1) 등록 — onCreateRow만 있고 onSave는 없는 화면이라 저장 버튼 라벨은 '저장'(AdminResourcePage.tsx).
    // ⚠️ '고민명'은 검색창 aria-label("고민명 검색")과 substring이 겹쳐 exact:true가 필요하다
    // (notices/reviews 스펙에서 실측한 것과 같은 함정).
    await page.getByRole('button', { name: '고민 등록' }).click();
    await page.getByLabel('고민명', { exact: true }).fill(title);
    await page.getByLabel('아이콘(이모지)').fill(icon);
    await page.getByLabel('짧은 설명').fill(shortDescription);
    await page.getByLabel('설명', { exact: true }).fill(`E2E 설명 ${runId}`);
    await page.getByLabel('확인 증상(쉼표 구분)').fill(`${symptomA}, ${symptomB}`);
    await page.getByLabel('원인 정보(쉼표 구분)').fill(`${causeA}, ${causeB}`);
    await selectIdPickerOption(page, '추천 상품', productName);
    await selectIdPickerOption(page, '추천 브랜드', brandName);
    await page.getByLabel('보험 CTA').fill(`E2E 보험CTA ${runId}`);
    await page.getByLabel('FAQ(').fill(`${faqQuestion}|${faqAnswer}`);
    await page.getByRole('button', { name: '저장' }).click();

    // 2) 관리자 목록 — 등록한 필드 전부(아이콘·고민명·증상/상품/브랜드/FAQ 개수)가 행 단위로 반영됐는지 확인.
    const adminRow = page.locator('tr', { hasText: title });
    await expect(adminRow).toBeVisible({ timeout: 15_000 });
    await expect(adminRow).toContainText(icon);
    await expect(adminRow).toContainText('2개'); // symptomsCount
    await expect(adminRow).toContainText('1개'); // productsCount/brandsCount/faqCount 공용(각각 1건)

    // 3) 공개 /concerns/[slug] 상세 — slug는 title로부터 결정론적으로 생성되므로 직접 이동해서 확인.
    await page.goto(`/concerns/${expectedSlug}`);
    await expect(page).toHaveURL(new RegExp(`/concerns/${expectedSlug}$`));
    await expect(page.locator('body')).toContainText(title);
    await expect(page.locator('body')).toContainText(icon);
    await expect(page.locator('body')).toContainText(shortDescription); // heroCopy.description 폴백
    await expect(page.locator('body')).toContainText(symptomA);
    await expect(page.locator('body')).toContainText(symptomB);
    await expect(page.locator('body')).toContainText(causeA);
    await expect(page.locator('body')).toContainText(causeB);
    await expect(page.locator('body')).toContainText(productName);
    await expect(page.locator('body')).toContainText(brandName);
    // FAQ는 네이티브 <details>/<summary>라 접혀 있어도 textContent에 남는다(클릭 불필요).
    await expect(page.locator('body')).toContainText(faqQuestion);
    await expect(page.locator('body')).toContainText(faqAnswer);

    // 4) 삭제 — 오늘 유실된 버그(삭제 미저장)를 정확히 잡는 지점이다.
    await page.goto('/admin/concerns');
    await page.getByPlaceholder(CONCERNS_SEARCH_PLACEHOLDER).fill(title);
    await expect(page.getByRole('button', { name: '삭제' })).toHaveCount(1);
    await page.getByRole('button', { name: '삭제' }).click();
    await expect(page.locator('table')).not.toContainText(title, { timeout: 15_000 });

    // 5) 상세 페이지가 404로 사라졌는지 확인(삭제가 진짜 DB에 반영됐는지 검증).
    const detailResponse = await page.goto(`/concerns/${expectedSlug}`);
    expect(detailResponse?.status()).toBe(404);
  });
});
