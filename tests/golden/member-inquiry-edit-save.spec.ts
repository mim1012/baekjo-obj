import { test, expect, type Page } from '@playwright/test';

// 골든플로우 #7 인접 회귀 — 회원 마이페이지(/mypage?tab=inquiries)에서 본인 상품문의 "수정".
//
// 🚨 실버그 회귀 박제(wave-6 e2e 발견, 이 브랜치에서 수정) — InquiryFormModal.tsx가 마이페이지
// 수정 모드에서 product prop을 안 받는데, selectedProductId 초기값·재동기화가 product?.id에만
// 의존해 selectedProduct가 영원히 undefined였다. 상품 select 자체는 수정 중 잠겨 있어(의도된
// 동작 — 문의 대상 상품은 안 바꿈) 사용자가 값을 넣을 방법도 없었다. 그 결과 저장 버튼의 disable
// 조건(!selectedProduct && !product)이 항상 참이라 **수정 모달을 열면 저장 버튼이 영구 비활성**
// 이었다 — 클릭 자체가 불가능해 회원은 자기 문의를 절대 수정할 수 없었다(실사용자 영향 있는
// 실제 배포 결함). 고침: initialData에 productId를 추가로 넘겨(mypage/page.tsx) 상품 select가
// 잠긴 채로도 selectedProductId가 채워지게 했다(InquiryFormModal.tsx).
//
// 🚨 정본에겐 관리자 답변 이후엔 서버가 회원 수정을 반영하지 않는다(storage.ts 주석,
// PATCH /api/inquiries/[id]) — 그래서 이 스펙은 관리자 답변 없이 "작성 직후(답변대기 상태)"
// 수정만 검증한다(그게 이 버그가 원래 항상 재현되던 경로이기도 하다).
//
// 🚨 쓰기(write) 스펙 — 실제 DB에 데이터를 만들고 수정하고 지운다. E2E_MEMBER_* secret이
// 없으면 전체 skip. 절대 production을 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
test.describe('회귀: 마이페이지 상품문의 수정 저장 가능 여부(wave-6 발견 버그)', () => {
  const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL;
  const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD;

  test.skip(
    !MEMBER_EMAIL || !MEMBER_PASSWORD,
    'E2E_MEMBER_* secret 미주입(member-e2e@test.baekjo) — 회원 로그인 불가로 skip',
  );

  const runId = Date.now();
  const SEARCH_PREFIX = 'E2E-문의수정-';
  const title = `${SEARCH_PREFIX}${runId}`;
  const content = `E2E 테스트 문의 본문(원본) ${runId}`;
  const editedContent = `E2E 테스트 문의 본문(수정됨) ${runId}`;
  const PRODUCT_ID = 'p1';

  async function loginAsMember(page: Page): Promise<void> {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(MEMBER_EMAIL!);
    await page.locator('input[type="password"]').fill(MEMBER_PASSWORD!);
    await page.getByRole('button', { name: /로그인/ }).first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
  }

  /** 회원 본인 삭제 경로로 잔여 테스트 문의를 정리한다(관리자 삭제 버튼은 비영속 — 다른 스펙과 동일 이유). */
  async function cleanupStaleInquiries(page: Page): Promise<void> {
    page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });
    await loginAsMember(page);
    await page.goto('/mypage?tab=inquiries');
    for (let i = 0; i < 10; i += 1) {
      const staleCard = page.locator('.mypage-card', { hasText: SEARCH_PREFIX }).first();
      if ((await staleCard.count()) === 0) break;
      await staleCard.getByRole('button', { name: '삭제' }).click();
      await page.waitForTimeout(600);
    }
  }

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await cleanupStaleInquiries(page);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await cleanupStaleInquiries(page);
    await page.close();
  });

  test('문의 작성 → 마이페이지 수정 모달 → 저장 버튼 활성화 → 수정 저장 → API 재조회로 확인', async ({ page }) => {
    // 삭제(handleDeleteInquiry)는 window.confirm을 띄운다 — 핸들러 없이 클릭하면 Playwright가
    // 기본적으로 dismiss(취소 취급)해 삭제가 조용히 무시된다(실측).
    page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });

    // 1) 문의 작성(답변 전 상태로 남겨야 이후 수정이 서버에 반영된다).
    await loginAsMember(page);
    // 🚨 하이드레이션 레이스(2026-07-23 CI 첫 실구동에서 적발): ProductTabsClient의 user는
    // getSessionUser()의 /api/members/me fetch가 끝나야 채워진다(useState(null) 시작). 그 전에
    // 문의하기를 클릭하면 user===null 분기가 alert(위 dialog 핸들러가 조용히 수락함)→/login
    // 리다이렉트로 빠져 '상품문의 작성' 모달이 영영 안 뜬다. 세션 fetch 완료를 기다린 뒤
    // 클릭하고, 그래도 리다이렉트에 밀렸으면 상품 페이지 재진입 후 재시도한다.
    const gotoProductWithSession = async () => {
      await Promise.all([
        page
          .waitForResponse((res) => res.url().includes('/api/members/me'), { timeout: 20_000 })
          .catch(() => {}),
        page.goto(`/shop/${PRODUCT_ID}`),
      ]);
    };
    await gotoProductWithSession();
    await expect(async () => {
      if (!page.url().includes(`/shop/${PRODUCT_ID}`)) await gotoProductWithSession();
      await page.getByRole('button', { name: '문의하기' }).click();
      await page.getByRole('heading', { name: '상품문의 작성' }).waitFor({ state: 'visible', timeout: 5_000 });
    }).toPass({ timeout: 45_000 });
    const titleInput = page.getByPlaceholder('문의 제목을 입력해주세요');
    await titleInput.fill(title);
    await expect(titleInput).toHaveValue(title);
    const contentInput = page.getByPlaceholder('상품에 대해 궁금한 점을 남겨주세요.');
    await contentInput.fill(content);
    await expect(contentInput).toHaveValue(content);
    const createSubmitButton = page.getByRole('button', { name: '등록하기' });
    await expect(createSubmitButton).toBeEnabled({ timeout: 15_000 });
    await createSubmitButton.click();
    // 제출 완료(모달 닫힘)를 기다린 뒤 이동한다 — 곧바로 페이지를 옮기면 POST가 끝나기 전에
    // 네비게이션이 겹치는 레이스가 있을 수 있다(실측 — 첫 시도에서 카드가 아예 안 보였음).
    await expect(page.getByRole('heading', { name: '상품문의 작성' })).toBeHidden({ timeout: 15_000 });

    // 2) 마이페이지 → 방금 작성한 문의 카드의 "수정" 클릭 → 수정 모달.
    const card = page.locator('.mypage-card', { hasText: title });
    await expect(async () => {
      await page.goto('/mypage?tab=inquiries');
      await expect(card).toBeVisible({ timeout: 5_000 });
    }).toPass({ timeout: 20_000 });
    await card.getByRole('button', { name: '수정' }).click();
    await expect(page.getByRole('heading', { name: '상품문의 수정' })).toBeVisible({ timeout: 15_000 });

    // 3) 핵심 회귀 확인 — 고치기 전에는 이 버튼이 절대 활성화되지 않았다(selectedProduct가
    // 영원히 undefined였음). 폼이 기존 값으로 미리 채워지는지도 함께 확인.
    const editTitleInput = page.getByPlaceholder('문의 제목을 입력해주세요');
    await expect(editTitleInput).toHaveValue(title);
    const editContentInput = page.getByPlaceholder('상품에 대해 궁금한 점을 남겨주세요.');
    await expect(editContentInput).toHaveValue(content);
    const editSubmitButton = page.getByRole('button', { name: '수정 완료' });
    await expect(
      editSubmitButton,
      '수정 모달의 저장 버튼이 비활성 상태입니다 — productId 미배선 회귀(wave-6 버그)가 재발했을 수 있습니다',
    ).toBeEnabled({ timeout: 15_000 });

    // 4) 실제로 내용을 바꾸고 저장 — 모달이 닫히는 것으로 1차 확인.
    await editContentInput.fill(editedContent);
    await editSubmitButton.click();
    await expect(page.getByRole('heading', { name: '상품문의 수정' })).toBeHidden({ timeout: 15_000 });

    // 5) API 재조회로 실제 저장 확인(모달이 닫힌 것만으로는 신뢰하지 않는다).
    await expect(async () => {
      const res = await page.request.get('/api/inquiries/mine');
      expect(res.ok()).toBe(true);
      const { inquiries } = (await res.json()) as { inquiries: Array<{ title: string; content: string }> };
      const updated = inquiries.find((i) => i.title === title);
      expect(updated, `${title} 문의가 본인 목록 API에 없습니다`).toBeTruthy();
      expect(updated!.content).toBe(editedContent);
    }).toPass({ timeout: 15_000 });

    // 6) 새로고침 후에도 유지되는지 확인.
    await page.reload();
    await expect(page.locator('.mypage-card', { hasText: title })).toContainText(editedContent, {
      timeout: 15_000,
    });

    // 7) 정리 — 회원 본인 삭제 경로.
    const cleanupCard = page.locator('.mypage-card', { hasText: title });
    await cleanupCard.getByRole('button', { name: '삭제' }).click();
    await expect(page.locator('.mypage-card', { hasText: title })).toHaveCount(0, { timeout: 15_000 });
  });
});
