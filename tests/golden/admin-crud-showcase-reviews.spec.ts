import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CRUD_ENABLED,
  bypassHeaders,
  deleteMatchingAdminRows,
  loginAsAdmin,
} from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /admin/reviews → 전시 후기를 노출하는 모든 공개 화면.
//
// 2026-07-18 배경: 관리자 삭제가 저장 안 되고, 수정이 새로고침하면 되돌아오는 버그 2건이
// 209개 소스-계약 테스트를 통과한 채로 배포됐다 — 아무 테스트도 실제로 화면을 클릭하지
// 않았기 때문이다. 이 스펙은 브라우저로 등록 → 관리자가 입력한 필드 하나하나가 전시 후기를
// 노출하는 모든 화면(공개 /reviews, 홈 후기 레일, 브랜드관, 상품 상세 구매평 탭)에 정확히
// 반영되는지 → 숨김 토글 → 모든 화면에서 사라짐 → 삭제 → 새로고침 후 사라짐까지 실제로
// 클릭해 검증한다.
//
// p1(productId)은 브랜드 b1 소속이다(supabase/migrations/0004b_seed_products_brands.sql:13
// `('p1', 'b1', ...)`) — 그래서 브랜드관 검증은 /brands/b1(§8-2 visual.spec.ts도 같은 슬러그
// 사용)을 겨냥한다. 상품명도 같은 시드 행의 '페네핏 팔레트 파우더 본품팩'을 그대로 쓴다.
//
// 🚨 쓰기(write) 스펙 — 실제 DB에 데이터를 만들고 지운다. E2E_ADMIN_CRUD=1 로 명시적으로
// 켜지 않으면 전체 skip. 절대 production을 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 전시 후기', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const SEARCH_PREFIX = 'E2E-후기-';
  const content = `${SEARCH_PREFIX}${runId}`;
  const PRODUCT_ID = 'p1';
  const BRAND_PATH = '/brands/b1'; // p1의 brand_id = 'b1' (supabase/migrations/0004b_seed_products_brands.sql:13)
  const breed = '골든리트리버';
  const age = '3살';
  const usePeriod = '2개월';
  const rating = 4;
  const REVIEWS_SEARCH_PLACEHOLDER = '상품명, 견종, 후기 내용 검색';

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await deleteMatchingAdminRows(page, '/admin/reviews', REVIEWS_SEARCH_PLACEHOLDER, SEARCH_PREFIX);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await deleteMatchingAdminRows(page, '/admin/reviews', REVIEWS_SEARCH_PLACEHOLDER, SEARCH_PREFIX);
    await page.close();
  });

  /** ReviewCard(공개 /reviews·홈 레일·브랜드관 공용 컴포넌트)의 카드를 content로 스코핑한다. */
  function reviewCard(page: Page, scope?: Locator): Locator {
    return (scope ?? page).locator('article', { hasText: content });
  }

  /** ReviewCard 카드 안의 별점 aria-label(`${rating}점`)과 breed·age·usePeriod 메타 라인을 확인한다. */
  async function expectReviewCardFields(card: Locator) {
    await expect(card).toBeVisible();
    await expect(card.getByRole('img', { name: `${rating}점` })).toBeVisible();
    await expect(card).toContainText(`${breed} · ${age} · ${usePeriod}`);
    await expect(card).toContainText(content);
  }

  test('등록 → 필드 단위로 모든 공개 화면에 반영 → 숨김 토글 → 모든 화면에서 사라짐 → 삭제 → 사라짐', async ({
    page,
  }) => {
    page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });

    // 상품명은 하드코딩하지 않고 공개 API에서 실시간 조회한다 — 시드 파일의 이름은 재시드·
    // 관리자 편집으로 갈릴 수 있다(실측: 0004b 시드는 '페네핏 팔레트 파우더 본품팩'이지만
    // staging 실제 값은 '페네핏 팔레트파우더 2.0 루틴 케어 5종'이었다, 2026-07-18 로컬 라이브 런).
    const productResponse = await page.request.get(`/api/products/${PRODUCT_ID}`);
    expect(productResponse.ok()).toBe(true);
    const { product } = await productResponse.json();
    const PRODUCT_NAME: string = product.name;

    await loginAsAdmin(page);
    await page.goto('/admin/reviews');

    // 1) 등록 — onCreateRow만 있고 onSave는 없는 화면이라 저장 버튼 라벨은 '저장'(AdminResourcePage.tsx).
    // isPhotoReview/isBest의 select 기본값은 둘 다 options[0]='true' 라 명시적으로 'false'를 골라야
    // "사진 없음·BEST 아님"이라는 필드값이 실제로 반영되는지 검증할 수 있다.
    await page.getByRole('button', { name: '후기 등록' }).click();
    await page.getByLabel('상품 ID').fill(PRODUCT_ID);
    await page.getByLabel('반려동물').selectOption('dog');
    await page.getByLabel('견종/묘종').fill(breed);
    await page.getByLabel('나이').fill(age);
    await page.getByLabel('사용 기간').fill(usePeriod);
    await page.getByLabel('별점').fill(String(rating));
    // ⚠️ getByLabel은 기본 substring 매칭이라 '후기 내용'은 검색창의
    // aria-label("상품명, 견종, 후기 내용 검색")과 겹쳐 strict-mode violation이 난다(실측) — exact:true로 고정.
    await page.getByLabel('후기 내용', { exact: true }).fill(content);
    await page.getByLabel('사진 후기 여부').selectOption('false');
    await page.getByLabel('노출 상태').selectOption('true');
    await page.getByLabel('BEST 여부').selectOption('false');
    await page.getByRole('button', { name: '저장' }).click();

    // 2) 관리자 목록 — 등록한 필드 전부(상품·반려동물·별점·사진·후기내용·노출상태)가 행 단위로 반영됐는지 확인.
    const adminRow = page.locator('tr', { hasText: content });
    await expect(adminRow).toBeVisible({ timeout: 15_000 });
    await expect(adminRow).toContainText(`${breed} / ${age}`);
    await expect(adminRow).toContainText(String(rating));
    await expect(adminRow).toContainText('없음'); // 사진 열 — isPhotoReview=false
    await expect(adminRow).toContainText('노출중'); // isVisible=true, isBest=false

    // 3) 공개 /reviews — 별점 aria-label·견종/나이/사용기간 메타·내용이 카드에 정확히 반영되는지 확인.
    await page.goto('/reviews');
    await expectReviewCardFields(reviewCard(page));

    // 4) 홈 후기 레일 — 홈은 전시 후기를 페이지네이션 없이 전부 렌더한다(HomeClient.tsx `reviews.map`).
    // 상품명(productId→name 매핑)까지 카드에 실리는지 함께 확인.
    await page.goto('/');
    const homeCard = reviewCard(page);
    await expectReviewCardFields(homeCard);
    await expect(homeCard).toContainText(PRODUCT_NAME);

    // 5) 브랜드관(b1) — p1이 속한 브랜드 페이지의 "반려가족 후기" 레일에도 상품명과 함께 반영되는지 확인.
    await page.goto(BRAND_PATH);
    const brandCard = reviewCard(page);
    await expectReviewCardFields(brandCard);
    await expect(brandCard).toContainText(PRODUCT_NAME);

    // 6) 상품 상세(/shop/p1) 구매평 탭 — getMergedReviews(showcase+user 병합, adapters.ts)로 반영되는지 확인.
    // ProductTabsClient.tsx는 source==='seed'(전시 후기)일 때 견종·나이·사용기간을 뱃지로,
    // ReviewCard와 다른 마크업으로 렌더하므로 #reviews 섹션 범위에서 텍스트 포함 여부로 확인한다.
    await page.goto(`/shop/${PRODUCT_ID}`);
    const productReviewsSection = page.locator('#reviews');
    await expect(productReviewsSection).toContainText(content);
    await expect(productReviewsSection).toContainText(breed);
    await expect(productReviewsSection).toContainText(age);
    await expect(productReviewsSection).toContainText(`${usePeriod} 사용`);

    // 7) 관리자로 돌아와 노출 상태를 숨김으로 토글
    await page.goto('/admin/reviews');
    await page.getByPlaceholder(REVIEWS_SEARCH_PLACEHOLDER).fill(content);
    await expect(page.getByRole('button', { name: '수정' })).toHaveCount(1);
    await page.getByRole('button', { name: '수정' }).click();
    await page.getByLabel('노출 상태').selectOption('false');
    await page.getByRole('button', { name: '저장' }).click();
    await expect(page.locator('table')).toContainText('숨김', { timeout: 15_000 });

    // 8) 숨김이 모든 공개 화면(서버가 isVisible!==false로 필터링)에서 사라졌는지 확인 —
    // 관리자 목록에는 여전히 '숨김' 상태로 남아 있어야 한다(삭제와 다름).
    await page.goto('/reviews');
    await expect(page.locator('body')).not.toContainText(content);

    await page.goto('/');
    await expect(page.locator('body')).not.toContainText(content);

    await page.goto(BRAND_PATH);
    await expect(page.locator('body')).not.toContainText(content);

    await page.goto(`/shop/${PRODUCT_ID}`);
    await expect(page.locator('#reviews')).not.toContainText(content);

    await page.goto('/admin/reviews');
    await page.getByPlaceholder(REVIEWS_SEARCH_PLACEHOLDER).fill(content);
    await expect(page.locator('table')).toContainText('숨김');

    // 9) 삭제 — 오늘 유실된 버그(삭제 미저장)를 정확히 잡는 지점이다.
    await expect(page.getByRole('button', { name: '삭제' })).toHaveCount(1);
    await page.getByRole('button', { name: '삭제' }).click();
    await expect(page.locator('table')).not.toContainText(content, { timeout: 15_000 });

    // 10) 관리자 목록 새로고침 후 완전히 사라졌는지 확인(삭제가 진짜 DB에 반영됐는지 검증).
    await page.reload();
    await page.getByPlaceholder(REVIEWS_SEARCH_PLACEHOLDER).fill(content);
    await expect(page.getByRole('button', { name: '수정' })).toHaveCount(0);
  });
});
