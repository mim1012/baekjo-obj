import { test, expect, type Page } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /admin/inquiries → 상품 상세 "문의" 탭(병합 뷰).
//
// ⚠️ 도메인 주의 — "QnA"와 "상품문의(inquiries)"는 이 코드베이스에서 서로 다른 두 존재다.
// - `src/data/qna.ts`(seedQna) — 게시판형 정적 시드. `src/lib/adapters.ts:2`가
//   `import { qnaList as seedQna } from '@/data/qna'`로 그대로 읽어와 getMergedInquiries에서
//   병합한다. **DB 이관 안 됨 — admin에 이 seed를 편집하는 경로가 없다.** 후기(showcase_reviews)는
//   이미 DB config로 이관됐지만 QnA는 아직 정적 파일 그대로다(2026-07-18 프로젝트 메모 확인).
// - `ProductInquiry`(product_inquiries 테이블) — 로그인 회원이 상품 상세에서 남기는 1:1 문의.
//   `src/lib/inquiries/repo.ts`가 유일한 DB 접근 계층이고, `/admin/inquiries`가 이걸 관리한다.
// 이 스펙은 **DB 백엔드가 실제로 있고 admin이 실제로 손댈 수 있는 ProductInquiry 쪽만** CRUD한다.
// seedQna(정적)는 건드리지 않는다 — 애초에 admin 편집 경로가 없어 CRUD 대상이 될 수 없다.
//
// ⚠️ 관리자 삭제 버튼 없음(설계 확정, wave-4 스윕 2026-07-19) — `src/app/admin/inquiries/page.tsx`는
// `AdminResourcePage`에 `onDeleteRow`도 `onSave`도 넘기지 않는다. 2026-07-18엔 이 조합이
// `canDeleteRows`를 참으로 만들어(구 조건 `onDeleteRow != null || onSave == null`) 삭제 버튼이
// **보이는데 눌러도 로컬에서만 숨겨지는 가짜(비영속) 삭제**였다. wave-4 스윕에서 그 조건 자체를
// `onDeleteRow != null`로 고쳐 이 클래스의 버그를 구조적으로 제거했다 — 그 결과 `/admin/inquiries`는
// 이제 삭제 버튼이 **아예 렌더링되지 않는다**(의도된 상태). 상품 Q&A는 공개 답변 이력이 있는
// 고객 문의라 관리자가 임의로 지우는 게 도메인상 맞지 않다고 판단해, "삭제 API를 새로 만들어
// 배선"이 아니라 "버튼을 숨긴다"쪽을 택했다 — 그래서 이 스펙은 여전히 관리자 삭제 버튼을
// 정리(cleanup) 경로로 쓰지 않는다.
//
// ✅ 실제 정리 경로 = 회원 본인 삭제(`DELETE /api/inquiries/[id]`, `deleteInquiryByOwner`,
// `src/lib/inquiries/repo.ts:137`) — status 제약이 없어 관리자가 답변완료 처리한 뒤에도 작성자
// 본인은 지울 수 있다. UI는 `/mypage?tab=inquiries`의 "삭제" 버튼(`InquiriesSection.tsx:168-174`,
// `page.tsx:237-244`의 `handleDeleteInquiry` → `deleteProductInquiry`). 이 스펙은 beforeAll/afterAll
// 모두 회원 세션으로 이 경로를 통해 잔여 E2E 데이터를 정리한다.
//
// 🚨 회원 생성 필요 — 문의 작성은 로그인 회원만 가능하다. 스테이징 전용 고정 회원 계정
// `member-e2e@test.baekjo`를 쓴다(admin@naver.com 등 다른 계정 데이터에는 손대지 않는다).
// 이 계정의 자격증명은 아직 CI 워크플로(golden-crud.yml)에 등록돼 있지 않다 — E2E_MEMBER_EMAIL/
// E2E_MEMBER_PASSWORD 시크릿이 없으면 이 스펙 전체가 skip된다(다른 wave의 것처럼 시크릿 등록은
// 별도 작업으로 남겨둠 — 이 PR 범위 밖).
//
// 🚨 쓰기(write) 스펙 — 실제 DB에 데이터를 만들고 지운다. E2E_ADMIN_CRUD=1 로 명시적으로
// 켜지 않으면 전체 skip. 절대 production을 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 상품문의(ProductInquiry)', () => {
  const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL;
  const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD;

  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 관리자 로그인 불가로 skip');
  test.skip(
    !MEMBER_EMAIL || !MEMBER_PASSWORD,
    'E2E_MEMBER_* secret 미주입(member-e2e@test.baekjo) — 회원 로그인 불가로 skip',
  );

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const SEARCH_PREFIX = 'E2E-문의-';
  const title = `${SEARCH_PREFIX}${runId}`;
  const content = `E2E 테스트 문의 본문 ${runId}`;
  const answer = `E2E-답변-${runId}`;
  const PRODUCT_ID = 'p1';
  const INQUIRIES_SEARCH_PLACEHOLDER = '문의 내역 검색...';

  /** 로그인 폼 셀렉터는 loginAsAdmin(adminCrudHelpers.ts)과 동일 — 계정만 다르다. */
  async function loginAsMember(page: Page): Promise<void> {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(MEMBER_EMAIL!);
    await page.locator('input[type="password"]').fill(MEMBER_PASSWORD!);
    await page
      .getByRole('button', { name: /로그인/ })
      .first()
      .click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
  }

  /**
   * 회원 본인 삭제 경로로 SEARCH_PREFIX 로 시작하는 잔여 테스트 문의를 전부 지운다
   * (§관리자 삭제 버튼은 비영속이라 못 씀 — 위 코멘트 참조). /mypage 문의 탭에는 검색창이
   * 없어 deleteMatchingAdminRows를 그대로 재사용할 수 없다 — 행 텍스트로 직접 스코핑한다.
   */
  async function cleanupMemberInquiries(page: Page): Promise<void> {
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
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await cleanupMemberInquiries(page);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await cleanupMemberInquiries(page);
    await page.close();
  });

  test('회원이 문의 작성 → 관리자가 답변 → 공개 문의 탭에 반영 → 회원이 정리', async ({ browser }) => {
    // 상품명은 하드코딩하지 않고 실시간 조회한다(showcase-reviews 스펙과 동일 이유 —
    // 재시드로 시드 파일 값과 실제 staging 값이 갈릴 수 있다).
    const memberPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    memberPage.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });

    // 1) 회원으로 로그인 → 상품 상세 "문의하기" 모달로 문의 작성.
    await loginAsMember(memberPage);
    await memberPage.goto(`/shop/${PRODUCT_ID}`);
    await memberPage.getByRole('button', { name: '문의하기' }).click();
    // ⚠️ 모달이 뜨자마자 fill()하면 값이 조용히 안 먹는 레이스가 실측됐다(스크린샷으로 빈 입력칸
    // 확인) — 모달 제목이 뜬 뒤, fill 직후 실제 값이 반영됐는지 확인하고서 다음으로 넘어간다.
    await memberPage.getByRole('heading', { name: '상품문의 작성' }).waitFor({ state: 'visible', timeout: 15_000 });
    const titleInput = memberPage.getByPlaceholder('문의 제목을 입력해주세요');
    await titleInput.fill(title);
    await expect(titleInput).toHaveValue(title);
    const contentInput = memberPage.getByPlaceholder('상품에 대해 궁금한 점을 남겨주세요.');
    await contentInput.fill(content);
    await expect(contentInput).toHaveValue(content);
    // 비밀글 토글은 건드리지 않는다(기본값 false) — 이후 검증을 로그인 없이도 볼 수 있는
    // 공개 상태로 유지하기 위함.
    const submitButton = memberPage.getByRole('button', { name: '등록하기' });
    await expect(submitButton).toBeEnabled({ timeout: 15_000 });
    await submitButton.click();

    // 등록 완료 후 모달이 닫히고 문의 탭 카운트/목록에 반영됐는지로 성공을 확인.
    await memberPage.goto(`/shop/${PRODUCT_ID}`);
    await expect(memberPage.locator('#qna')).toContainText(title, { timeout: 15_000 });
    await expect(memberPage.locator('#qna')).toContainText('답변대기');

    // 2) 관리자로 로그인(별도 페이지/컨텍스트 — 계정 전환) → /admin/inquiries에서 검색 → 답변 등록.
    const adminPage = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    adminPage.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });
    await loginAsAdmin(adminPage);
    await adminPage.goto('/admin/inquiries');
    await adminPage.getByPlaceholder(INQUIRIES_SEARCH_PLACEHOLDER).fill(title);

    // ⚠️ 'tr'만으로 스코핑하면 행을 확장했을 때 AdminResourcePage.tsx:393-395의 확장 패널
    // (별도 형제 <tr><td colSpan>...)도 title 텍스트를 포함해 strict-mode 위반이 난다(2026-07-18
    // e2e 실측 — #157 머지 후 첫 실구동에서 발견). 클릭 가능한 요약 행에만 있는
    // cursor-pointer 클래스(AdminResourcePage.tsx:368)로 확장 패널을 명시적으로 제외한다.
    const adminRow = adminPage.locator('tr.cursor-pointer', { hasText: title });
    await expect(adminRow).toBeVisible({ timeout: 15_000 });
    await expect(adminRow).toContainText('답변대기');

    // 행 클릭 → 확장(renderExpandedRow, AdminResourcePage.tsx:353-355) → 질문 내용 확인 → 답변 입력.
    await adminRow.click();
    await expect(adminPage.getByText(content)).toBeVisible({ timeout: 15_000 });
    const answerTextarea = adminPage.getByPlaceholder('고객의 문의에 친절하게 답변해주세요.');
    await expect(answerTextarea).toBeVisible();
    await answerTextarea.fill(answer);
    await adminPage.getByRole('button', { name: '답변 등록하기' }).click();

    // 답변 등록은 alert 로 확인되므로(handleAnswerSubmit) 상태 배지가 답변완료로 바뀔 때까지 대기.
    await adminPage.getByPlaceholder(INQUIRIES_SEARCH_PLACEHOLDER).fill(title);
    await expect(adminRow).toContainText('답변완료', { timeout: 15_000 });
    await adminPage.close();

    // 3) 공개 상품 상세 문의 탭(getMergedInquiries 병합 뷰) — 질문·답변 텍스트가 필드 단위로 반영되는지 확인.
    await memberPage.goto(`/shop/${PRODUCT_ID}`);
    const qnaSection = memberPage.locator('#qna');
    await expect(qnaSection).toContainText(title, { timeout: 15_000 });
    await expect(qnaSection).toContainText(content);
    await expect(qnaSection).toContainText('답변완료');
    await expect(qnaSection).toContainText(answer);

    // 4) 정리 — 회원 본인 삭제 경로(관리자 삭제 버튼은 비영속이라 못 씀. 위 코멘트 참조).
    await memberPage.goto('/mypage?tab=inquiries');
    const myInquiryCard = memberPage.locator('.mypage-card', { hasText: title });
    await expect(myInquiryCard).toBeVisible({ timeout: 15_000 });
    await myInquiryCard.getByRole('button', { name: '삭제' }).click();
    await expect(memberPage.locator('.mypage-card', { hasText: title })).toHaveCount(0, { timeout: 15_000 });

    // 5) 새로고침 후에도 사라졌는지 확인(진짜 DB 삭제인지 검증) + 공개 화면에서도 사라졌는지 확인.
    await memberPage.reload();
    await expect(memberPage.locator('.mypage-card', { hasText: title })).toHaveCount(0);

    await memberPage.goto(`/shop/${PRODUCT_ID}`);
    await expect(memberPage.locator('#qna')).not.toContainText(title);

    await memberPage.close();
  });
});
