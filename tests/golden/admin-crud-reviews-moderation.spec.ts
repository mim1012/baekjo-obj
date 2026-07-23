import { test, expect, type Page } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';
import {
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
  loginAsMember,
  createThrowawayProduct,
  cleanupThrowawayProducts,
  forceOrderPurchaseConfirmed,
} from './_lib/memberCrudHelpers';

// 골든플로우 #7 — 구매평(product_reviews) 검수(moderation) 실구동 스펙.
// 커버리지 감사 EXCLUDED("체크아웃 전체 선행 필요 — PR 범위 밖")로 보류돼 있던 G1 공백을 메운다
// (docs/testing/golden-spec-coverage.md §5 G1, 2026-07-23).
//
// 검증 계약(#195 be/review-moderation-rating):
//   회원이 실제 구매(주문→구매확정)로 작성 자격을 얻어 남긴 구매평을, 관리자가 /admin/reviews
//   "구매평 관리" 탭에서 숨김/노출/삭제한다. 숨김(hidden) 리뷰는 (a) 공개 상세 #reviews에서
//   사라지고 (b) DB 트리거 0070이 published만 집계하므로 products.rating/review_count에서도
//   빠진다 — (b)를 공개 API 재조회라는 독립 경로로 검증한다(§8-6 자기개선 루프 2단계:
//   관리자 화면의 배지 변화만 믿지 않는다).
//
// ⚠️ member-review-inquiry.spec.ts와 중복 아님(명시) — 그 스펙은 "회원 본인" 라이프사이클
// (작성→수정→본인 삭제)이고, 이 스펙은 "관리자" moderation(숨김→재노출→강제 삭제) + 별점
// 집계 반영이다. 셋업(구매확정 주문 만들기)만 같은 헬퍼를 재사용한다.
//
// 🚨 쓰기(write) 스펙 — 실제 DB에 상품·주문·리뷰를 만들고 지운다. 대상은 Vercel Preview/staging뿐.
test.describe('골든플로우: 관리자 구매평 검수(숨김→별점 제외→재노출→삭제)', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150_000);

  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 관리자 검수 불가로 skip');
  test.skip(!MEMBER_EMAIL || !MEMBER_PASSWORD, 'E2E_MEMBER_* secret 미주입 — 구매평 작성 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });

  const NAME_PREFIX = 'E2E-구매평검수-';
  const UNIT_PRICE = 8_000;
  const runId = Date.now();
  const reviewContent = `E2E-검수대상-구매평-${runId} 관리자 숨김 테스트용.`;
  let productId: string;
  let productName: string;

  /** 공개 상품 API 재조회 — 0070 트리거의 rating/review_count 반영을 화면과 독립된 경로로 검증. */
  async function fetchPublicProduct(page: Page): Promise<{ rating: number; reviewCount: number }> {
    const res = await page.request.get(`/api/products/${encodeURIComponent(productId)}`);
    expect(res.ok(), `GET /api/products/${productId} 실패(${res.status()})`).toBe(true);
    const { product } = (await res.json()) as { product: { rating: number; reviewCount: number } };
    return { rating: product.rating, reviewCount: product.reviewCount };
  }

  test.beforeAll(async ({ browser }) => {
    // 훅 타임아웃은 describe 레벨 setTimeout(150s)이 적용되지 않는다(테스트 전용) —
    // 첫 실구동(2026-07-23)에서 "beforeAll hook timeout of 60000ms exceeded"로 실증.
    // 이 셋업은 체크아웃→구매확정→구매평 작성까지 포함해 프리뷰에서 60s를 넘는다.
    test.setTimeout(180_000);
    // 1) 관리자: 일회용 상품 생성(+이전 실행 잔재 정리).
    const adminPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    adminPage.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await loginAsAdmin(adminPage);
    await cleanupThrowawayProducts(adminPage, NAME_PREFIX);
    const created = await createThrowawayProduct(adminPage, NAME_PREFIX, UNIT_PRICE);
    productId = created.id;
    productName = created.name;

    // 2) 회원: 실제 체크아웃(무통장)으로 주문 생성 — 구매평 자격의 유일한 정상 경로.
    const memberPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsMember(memberPage);
    await memberPage.goto(`/shop/${productId}`);
    await memberPage.getByRole('button', { name: '장바구니' }).first().click();
    await memberPage.goto('/checkout');
    await memberPage.locator('input[name="customerName"]').fill('E2E 검수테스터');
    await memberPage.locator('input[name="phone"]').fill('010-4444-5555');
    await memberPage.locator('input[name="address"]').fill('서울시 마포구 검수로 1');
    await memberPage.locator('label').filter({ hasText: '무통장입금' }).click();
    await memberPage.locator('input[type="checkbox"]').check();
    await memberPage.getByRole('button', { name: /결제하기/ }).click();
    await memberPage.waitForURL(/\/order-complete/, { timeout: 20_000 });

    await expect(async () => {
      await memberPage.goto('/mypage?tab=orders');
      await expect(memberPage.locator('.mypage-card', { hasText: productName }).first()).toBeVisible({
        timeout: 5_000,
      });
    }).toPass({ timeout: 45_000 });
    const orderCard = memberPage.locator('.mypage-card', { hasText: productName }).first();
    const orderIdText = await orderCard.getByText(/주문번호/).textContent();
    const orderId = (orderIdText || '').replace('주문번호', '').trim();

    // 3) 관리자 API로 구매확정까지 강제 전이(관리자 주문 UI 자체는 admin-crud-orders 소관).
    await forceOrderPurchaseConfirmed(adminPage, orderId);

    // 4) 회원: 구매평 작성(별점 4점) — 마이페이지 "작성 가능" 목록 UI는 회원측 읽기 스테일
    //    버그(격리 중 — memory wishlist-desync-repro-2026-07-23)에 취약해 45s 폴링으로도
    //    실패가 재현됐다(2026-07-23 run 30001827338). 이 스펙의 목적은 "관리자 검수"이므로
    //    작성은 API 직접 POST로 만든다 — 서버가 주문 소유권과 구매확정 자격
    //    (canReviewOrderItem)을 자체 repo 읽기로 재검증하므로 자격 우회가 아니다.
    //    회원 작성 UI 경로 자체는 member-review-inquiry.spec.ts 소관.
    const reviewRes = await memberPage.request.post('/api/reviews', {
      data: { orderId, productId, rating: 4, content: reviewContent },
    });
    if (reviewRes.status() !== 201) {
      throw new Error(`구매평 API 작성 실패(${reviewRes.status()}): ${await reviewRes.text()}`);
    }

    await memberPage.close();
    await adminPage.close();
  });

  test.afterAll(async ({ browser }) => {
    test.setTimeout(120_000);
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await loginAsAdmin(page);
    await cleanupThrowawayProducts(page, NAME_PREFIX);
    await page.close();
  });

  test('공개 반영 확인 → 관리자 숨김 → 별점 집계 제외 → 재노출 → 강제 삭제', async ({ page, browser }) => {
    // 0) 전제 확인 — 리뷰가 공개 상세에 보이고, 0070 트리거가 rating=4.0/count=1을 집계했다.
    await page.goto(`/shop/${productId}`);
    await expect(page.locator('#reviews')).toContainText(reviewContent, { timeout: 15_000 });
    await expect(async () => {
      const { rating, reviewCount } = await fetchPublicProduct(page);
      expect(reviewCount).toBe(1);
      expect(rating).toBe(4);
    }).toPass({ timeout: 15_000 });

    // 1) 관리자 — /admin/reviews "구매평 관리" 탭에서 검수 대상 행 확인(노출중).
    const adminPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(adminPage);
    await adminPage.goto('/admin/reviews');
    // 탭 버튼은 role="tab" 명시라 button 롤로는 안 잡힌다(첫 실구동 실증 — 화면엔 있는데 미발견).
    await adminPage.getByRole('tab', { name: '구매평 관리' }).click();
    await adminPage.getByPlaceholder('상품명, 작성 내용 검색').fill(String(runId));
    const row = adminPage.locator('tr', { hasText: reviewContent });
    await expect(row).toHaveCount(1, { timeout: 15_000 });
    await expect(row).toContainText('노출중');

    const confirmDialog = adminPage.locator('div.z-\\[101\\]');

    // 2) 숨김 — ConfirmDialog 수락 후 배지가 '숨김'으로.
    await row.getByRole('button', { name: '숨기기' }).click();
    await expect(confirmDialog.getByRole('heading', { name: '구매평을 숨길까요?' })).toBeVisible();
    await confirmDialog.getByRole('button', { name: '확인' }).click();
    await expect(row).toContainText('숨김', { timeout: 15_000 });

    // 3) 독립 경로 검증 — 공개 상세에서 사라지고, 0070 집계에서도 빠진다(rating 0/count 0).
    await page.goto(`/shop/${productId}`);
    await expect(page.locator('#reviews')).not.toContainText(reviewContent, { timeout: 15_000 });
    await expect(async () => {
      const { rating, reviewCount } = await fetchPublicProduct(page);
      expect(reviewCount).toBe(0);
      expect(rating).toBe(0);
    }).toPass({ timeout: 15_000 });

    // 4) 재노출 — 배지 복귀 + 공개 상세·집계 원복.
    await row.getByRole('button', { name: '노출하기' }).click();
    await expect(confirmDialog.getByRole('heading', { name: '구매평을 다시 노출할까요?' })).toBeVisible();
    await confirmDialog.getByRole('button', { name: '확인' }).click();
    await expect(row).toContainText('노출중', { timeout: 15_000 });

    await page.goto(`/shop/${productId}`);
    await expect(page.locator('#reviews')).toContainText(reviewContent, { timeout: 15_000 });
    await expect(async () => {
      const { rating, reviewCount } = await fetchPublicProduct(page);
      expect(reviewCount).toBe(1);
      expect(rating).toBe(4);
    }).toPass({ timeout: 15_000 });

    // 5) 관리자 강제 삭제 — 행 소멸 + 공개 상세·집계에서 최종 소거(이게 곧 테스트 데이터 정리).
    await row.getByRole('button', { name: '삭제' }).click();
    await expect(confirmDialog.getByRole('heading', { name: '구매평을 삭제할까요?' })).toBeVisible();
    await confirmDialog.getByRole('button', { name: '삭제' }).click();
    await expect(adminPage.locator('tr', { hasText: reviewContent })).toHaveCount(0, { timeout: 15_000 });

    await page.goto(`/shop/${productId}`);
    await expect(page.locator('#reviews')).not.toContainText(reviewContent, { timeout: 15_000 });
    await expect(async () => {
      const { reviewCount } = await fetchPublicProduct(page);
      expect(reviewCount).toBe(0);
    }).toPass({ timeout: 15_000 });

    await adminPage.close();
  });
});
