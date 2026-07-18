import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';
import {
  MEMBER_EMAIL,
  MEMBER_PASSWORD,
  loginAsMember,
  createThrowawayProduct,
  cleanupThrowawayProducts,
  forceOrderDelivered,
} from './_lib/memberCrudHelpers';

// 골든플로우 회원 여정(wave6) — 구매평·상품문의의 "회원 라이프사이클"(작성→반영→수정→삭제).
//
// ⚠️ 중복 아님(명시) — tests/golden/admin-crud-qna-inquiries.spec.ts는 이미 회원 작성 →
// 관리자 답변 → 공개 반영 → 회원 삭제를 커버한다. 이 스펙은 그 관리자 답변 경로를 다시 타지
// 않는다 — 대신 (a) 구매평은 admin-crud-qna-inquiries가 아예 다루지 않는 도메인이고,
// (b) 상품문의는 관리자 답변 없이(= status='waiting'인 동안만 가능한) **회원 본인 수정**까지
// 커버해 admin-crud-qna-inquiries가 다루지 않는 사각지대(수정)를 메운다.
//
// 🚨 구매평 작성 게이트 — mypage/page.tsx의 writableReviews는 order.orderStatus === '배송완료'
// 인 주문항목만 노출한다(ReviewsSection.tsx:37). 무통장 주문은 생성 직후 '주문접수'이므로
// 이 스펙이 PATCH /api/admin/orders/[id]로 직접 배송완료까지 전이시킨다(관리자 UI로 하지 않는
// 이유: 관리자 측 주문상태 변경 UI 자체는 wave4 admin-crud-orders 소관이라 여기서 중복 안 함).
test.describe('골든플로우: 회원 여정 — 구매평·상품문의 회원 라이프사이클', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 상품 생성/상태전이 불가로 skip');
  test.skip(!MEMBER_EMAIL || !MEMBER_PASSWORD, 'E2E_MEMBER_* secret 미주입 — 회원 로그인 불가로 skip');

  test.use({ extraHTTPHeaders: bypassHeaders() });

  const NAME_PREFIX = 'E2E-구매평문의-';
  const UNIT_PRICE = 9_000;
  let productId: string;
  let productName: string;
  let deliveredOrderId: string;

  const runId = Date.now();
  const reviewContent = `E2E-구매평-${runId} 실제로 아이가 잘 먹었어요.`;
  const reviewContentEdited = `E2E-구매평-${runId}-수정됨`;
  const inquiryTitle = `E2E-문의-${runId}`;
  const inquiryContent = `E2E 마이페이지발 문의 본문 ${runId}`;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await loginAsAdmin(page);
    await cleanupThrowawayProducts(page, NAME_PREFIX);
    const created = await createThrowawayProduct(page, NAME_PREFIX, UNIT_PRICE);
    productId = created.id;
    productName = created.name;

    // 배송완료 게이트를 뚫을 실제 주문 하나를 회원 세션으로 만든다.
    const memberPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsMember(memberPage);
    await memberPage.goto(`/shop/${productId}`);
    await memberPage.getByRole('button', { name: '장바구니' }).click();
    await memberPage.goto('/checkout');
    await memberPage.locator('input[name="customerName"]').fill('E2E 리뷰테스터');
    await memberPage.locator('input[name="phone"]').fill('010-2222-3333');
    await memberPage.locator('input[name="address"]').fill('서울시 마포구 테스트로 2');
    await memberPage.locator('label').filter({ hasText: '무통장입금' }).click();
    await memberPage.locator('input[type="checkbox"]').check();
    await memberPage.getByRole('button', { name: /결제하기/ }).click();
    await memberPage.waitForURL(/\/order-complete/, { timeout: 20_000 });

    await memberPage.goto('/mypage?tab=orders');
    const orderCard = memberPage.locator('.mypage-card', { hasText: productName }).first();
    await expect(orderCard).toBeVisible({ timeout: 15_000 });
    const orderIdText = await orderCard.getByText(/주문번호/).textContent();
    deliveredOrderId = (orderIdText || '').replace('주문번호', '').trim();
    await memberPage.close();

    // 관리자 API로 배송완료까지 강제 전이(§파일 상단 코멘트 — 관리자 UI 자체는 다른 wave 소관).
    await forceOrderDelivered(page, deliveredOrderId);

    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupThrowawayProducts(page, NAME_PREFIX);
    await page.close();
  });

  test('구매평 작성 → 상세 반영 → 수정 → 삭제', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await loginAsMember(page);

    // 1) 작성 가능 탭에서 방금 배송완료된 주문항목으로 구매평 작성.
    await page.goto('/mypage?tab=reviews');
    const writableCard = page.locator('.mypage-card', { hasText: productName }).first();
    await expect(writableCard).toBeVisible({ timeout: 15_000 });
    await writableCard.getByRole('button', { name: '구매평 작성' }).click();

    await page.getByRole('heading', { name: '구매평 작성' }).waitFor({ state: 'visible', timeout: 15_000 });
    // 별점 4개(왼쪽부터 4번째 버튼)로 명시 선택 — 기본값(5)과 구분해 실제 클릭이 반영됐는지 확인.
    await page.locator('form button.p-1').nth(3).click();
    await page.locator('textarea').fill(reviewContent);
    await page.getByRole('button', { name: '등록하기' }).click();

    // 2) "작성한 구매평" 탭 + 상품 상세 #reviews 양쪽에 반영 확인.
    await page.getByRole('button', { name: /작성한 구매평/ }).click();
    await expect(page.locator('.mypage-card', { hasText: reviewContent })).toBeVisible({ timeout: 15_000 });

    await page.goto(`/shop/${productId}`);
    await expect(page.locator('#reviews')).toContainText(reviewContent, { timeout: 15_000 });

    // 3) 수정 — 마이페이지에서 수정 버튼으로 내용 변경 후 상세에도 반영되는지 재확인.
    await page.goto('/mypage?tab=reviews');
    await page.getByRole('button', { name: /작성한 구매평/ }).click();
    const reviewCard = page.locator('.mypage-card', { hasText: reviewContent }).first();
    await expect(reviewCard).toBeVisible({ timeout: 15_000 });
    await reviewCard.getByRole('button', { name: '수정' }).click();
    await page.getByRole('heading', { name: '구매평 수정' }).waitFor({ state: 'visible', timeout: 15_000 });
    await page.locator('textarea').fill(reviewContentEdited);
    await page.getByRole('button', { name: '수정 완료' }).click();
    await expect(page.locator('.mypage-card', { hasText: reviewContentEdited })).toBeVisible({ timeout: 15_000 });

    await page.goto(`/shop/${productId}`);
    await expect(page.locator('#reviews')).toContainText(reviewContentEdited, { timeout: 15_000 });
    await expect(page.locator('#reviews')).not.toContainText(reviewContent);

    // 4) 삭제 — 회원 본인 삭제 후 마이페이지·상세 양쪽에서 사라지는지 확인.
    await page.goto('/mypage?tab=reviews');
    await page.getByRole('button', { name: /작성한 구매평/ }).click();
    const finalReviewCard = page.locator('.mypage-card', { hasText: reviewContentEdited }).first();
    await expect(finalReviewCard).toBeVisible({ timeout: 15_000 });
    await finalReviewCard.getByRole('button', { name: '삭제' }).click();
    await expect(page.locator('.mypage-card', { hasText: reviewContentEdited })).toHaveCount(0, { timeout: 15_000 });

    await page.goto(`/shop/${productId}`);
    await expect(page.locator('#reviews')).not.toContainText(reviewContentEdited);
  });

  test('마이페이지에서 상품문의 작성(선택형) → 반영 → 답변 전 수정 → 삭제', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept().catch(() => {}));
    await loginAsMember(page);

    // 1) 마이페이지 문의 탭 — 상품 상세가 아니라 마이페이지 자체에서 상품을 선택해 작성.
    await page.goto('/mypage?tab=inquiries');
    await page.getByRole('button', { name: '문의 작성하기' }).click();
    await page.getByRole('heading', { name: '상품문의 작성' }).waitFor({ state: 'visible', timeout: 15_000 });

    // InquiryFormModal.tsx:132-136 — option value가 상품 id 그대로다.
    await page.locator('select').first().selectOption(productId);
    const titleInput = page.getByPlaceholder('문의 제목을 입력해주세요');
    await titleInput.fill(inquiryTitle);
    await expect(titleInput).toHaveValue(inquiryTitle);
    const contentInput = page.getByPlaceholder('상품에 대해 궁금한 점을 남겨주세요.');
    await contentInput.fill(inquiryContent);
    await expect(contentInput).toHaveValue(inquiryContent);
    await page.getByRole('button', { name: '등록하기' }).click();

    // 2) 반영 확인 — 답변 전이므로 "답변 대기" 상태, 수정 버튼이 보여야 한다(status==='waiting'에서만 노출).
    const inquiryCard = page.locator('.mypage-card', { hasText: inquiryTitle }).first();
    await expect(inquiryCard).toBeVisible({ timeout: 15_000 });
    await expect(inquiryCard).toContainText('답변대기');

    // 3) 답변 전 수정 — 관리자 답변을 거치지 않고 회원이 직접 내용을 고칠 수 있는지 확인
    // (admin-crud-qna-inquiries.spec.ts는 답변완료 케이스만 다루므로 이 경로는 거기 없음).
    await inquiryCard.getByRole('button', { name: '수정' }).click();
    await page.getByRole('heading', { name: '상품문의 수정' }).waitFor({ state: 'visible', timeout: 15_000 });
    const editedContent = `${inquiryContent}-수정됨`;
    await page.locator('textarea').fill(editedContent);
    await page.getByRole('button', { name: '수정 완료' }).click();
    await expect(page.locator('.mypage-card', { hasText: editedContent })).toBeVisible({ timeout: 15_000 });

    // 4) 삭제.
    const finalCard = page.locator('.mypage-card', { hasText: inquiryTitle }).first();
    await finalCard.getByRole('button', { name: '삭제' }).click();
    await expect(page.locator('.mypage-card', { hasText: inquiryTitle })).toHaveCount(0, { timeout: 15_000 });
  });
});
