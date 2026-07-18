import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /admin/qna(qna_config 편집) → /shop/[id]#qna(공개 배선 실증).
//
// PR #160이 getMergedInquiries(src/lib/adapters.ts)를 qna_config 콘센트에 연결해, 관리자가
// /admin/qna에서 답변한 내용이 공개 상품상세 "상품 문의" 탭(#qna)에 실제로 나타나게 됐다 — 이전엔
// PR 리뷰의 1회성 수동 마커 테스트로만 증명됐다. 이 스펙이 그 증명을 상시 회귀 스펙으로 만든다.
//
// ⚠️ "새 항목 추가" 수단이 없다 — QnaDetailPanel은 items 배열의 기존 항목(id 필요)만 편집한다.
// 그래서 seed의 q1(productId:'p1', 김민수 작성)을 대상으로 답변 텍스트에 E2E 마커를 덧붙이고,
// afterAll에서 원본 답변으로 복원한다(홈설정/설문 스펙과 동일한 스냅샷/복원 원칙).
//
// ⚠️ #qna 탭은 admin-crud-qna-inquiries.spec.ts(ProductInquiry 시스템)와 **같은 DOM 섹션**이다 —
// getMergedInquiries가 qna_config(source:'seed')와 실사용자 ProductInquiry(source:'user') 행을
// 한 목록으로 병합해 렌더한다(ProductTabsClient.tsx #qna). 별도 탭이 아니므로 답변 텍스트로
// 특정해서 검증한다.
//
// 🚨 알려진 실제 버그(참고용, 이 스펙이 고치는 대상 아님) — getMergedInquiries는 리뷰용
// getMergedReviews와 달리 isVisible을 전혀 필터링하지 않는다. QnaDetailPanel의 "고객 페이지에
// 표시" 체크를 꺼도 공개 화면에서 실제로는 안 사라진다(실측 확인) — 이 스펙은 그 체크박스를
// 건드리지 않고 답변 텍스트만 편집해 그 버그를 우회한다.
//
// 🚨 쓰기(write) 스펙 — 실제 DB 싱글턴 설정(qna_config.items)의 기존 항목을 수정한다.
// E2E_ADMIN_CRUD=1 로 명시적으로 켜지 않으면 전체 skip. 절대 production을 겨냥하지 말 것.
test.describe.configure({ mode: 'serial' });

test.describe('골든플로우 #7: 관리자 CRUD 실구동 — QnA(qna_config 공개 배선 실증)', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const marker = `[E2E-QNA-${runId}]`;
  const QUESTION_SEARCH = '2개월 강아지'; // q1(productId:'p1')을 특정하는 고유 문의 내용 substring
  const PRODUCT_ID = 'p1';

  let originalAnswer: string | undefined;
  let qnaId: string | undefined;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    const res = await page.request.get('/api/qna');
    expect(res.ok()).toBe(true);
    const { items } = (await res.json()) as { items: Array<{ id: string; productId: string; answer?: string; question: string }> };
    const target = items.find((i) => i.productId === PRODUCT_ID && i.question.includes(QUESTION_SEARCH));
    expect(target, `productId=${PRODUCT_ID}의 시드 QnA 항목을 찾지 못했습니다 — 시드 데이터 확인 필요`).toBeTruthy();
    qnaId = target!.id;
    originalAnswer = target!.answer ?? '';
    // 이전 실행이 원복에 실패했다면 마커가 남아있을 수 있다 — 최소한 로그로 드러낸다.
    if (originalAnswer.includes('[E2E-QNA-')) {
      console.warn(
        `[admin-crud-qna-config] 이전 실행이 원복에 실패한 것으로 보입니다(answer에 E2E 마커 잔존). ` +
          '이 값을 스냅샷 기준으로 사용합니다.',
      );
    }
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!qnaId || originalAnswer === undefined) return;
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    const listRes = await page.request.get('/api/qna');
    const { items } = (await listRes.json()) as { items: Array<Record<string, unknown>> };
    const restoredItems = items.map((item) =>
      item.id === qnaId ? { ...item, answer: originalAnswer, status: originalAnswer ? '답변완료' : '답변대기' } : item,
    );
    const restoreRes = await page.request.put('/api/admin/qna', { data: { items: restoredItems } });
    if (!restoreRes.ok()) {
      console.error(
        `[admin-crud-qna-config] 원복 PUT 실패(status=${restoreRes.status()}) — qna_config의 ${qnaId} 항목이 ` +
          'E2E 테스트 값으로 남아있을 수 있습니다. /admin/qna에서 수동 확인이 필요합니다.',
      );
    }
    await page.close();
  });

  test('기존 QnA 답변 편집 → 공개 상품상세 #qna 탭에 반영 → 원본으로 복원', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/qna');
    await page.getByPlaceholder('작성자명, 상품명, 문의내용 검색').fill(QUESTION_SEARCH);

    // 행 자체 클릭이 아니라 행 안의 명시적 '답변/관리' 버튼을 눌러야 상세 패널이 열린다(실측 확인).
    const row = page.locator('tr', { hasText: QUESTION_SEARCH });
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.getByRole('button', { name: '답변/관리' }).click();

    const editedAnswer = `${originalAnswer} ${marker}`;
    const answerField = page.getByPlaceholder('고객에게 보여질 답변을 입력하세요.');
    await expect(answerField).toBeVisible({ timeout: 15_000 });
    await answerField.fill(editedAnswer);

    const saveButton = page.getByRole('button', { name: '저장하기' });
    await expect(saveButton).toBeVisible({ timeout: 15_000 });
    const [patchRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/qna') && res.request().method() === 'PUT'),
      saveButton.click(),
    ]);
    expect(patchRes.ok(), `PUT /api/admin/qna 실패(status=${patchRes.status()})`).toBe(true);
    await expect(saveButton).toBeHidden({ timeout: 15_000 });

    // API 재조회로 저장 확인.
    const verifyRes = await page.request.get('/api/qna');
    const verified = (await verifyRes.json()) as { items: Array<{ id: string; answer?: string }> };
    expect(verified.items.find((i) => i.id === qnaId)?.answer).toBe(editedAnswer);

    // 부정 케이스 — items가 배열이 아니면 400으로 거부되고 DB는 그대로다(isQnaConfig, qna/route.ts:12-14).
    const invalidRes = await page.request.put('/api/admin/qna', { data: { items: 'not-an-array' } });
    expect(invalidRes.status()).toBe(400);
    const unchangedRes = await page.request.get('/api/qna');
    const unchanged = (await unchangedRes.json()) as { items: Array<{ id: string; answer?: string }> };
    expect(
      unchanged.items.find((i) => i.id === qnaId)?.answer,
      '깨진 페이로드가 실제로 저장돼 방금 편집한 답변이 사라졌습니다',
    ).toBe(editedAnswer);

    // 공개 상품상세 #qna 탭에 실제로 반영되는지 확인 — 이 스펙의 핵심 회귀 방지 지점.
    await page.goto(`/shop/${PRODUCT_ID}`);
    const qnaSection = page.locator('#qna');
    await expect(qnaSection).toContainText(marker, { timeout: 15_000 });

    // 원본으로 복원(afterAll과 별개로 테스트 본문에서도 즉시 복원 — afterAll은 안전망).
    // ⚠️ 방금 /shop으로 이동해 같은 page가 admin 화면을 벗어났다 — answerField/saveButton은 이제
    // DOM에 없는 요소를 가리킨다. /admin/qna로 되돌아가 행을 다시 열어야 한다.
    await page.goto('/admin/qna');
    await page.getByPlaceholder('작성자명, 상품명, 문의내용 검색').fill(QUESTION_SEARCH);
    const restoreRow = page.locator('tr', { hasText: QUESTION_SEARCH });
    await expect(restoreRow).toBeVisible({ timeout: 15_000 });
    await restoreRow.getByRole('button', { name: '답변/관리' }).click();

    const restoreAnswerField = page.getByPlaceholder('고객에게 보여질 답변을 입력하세요.');
    await expect(restoreAnswerField).toBeVisible({ timeout: 15_000 });
    await restoreAnswerField.fill(originalAnswer!);
    const restoreSaveButton = page.getByRole('button', { name: '저장하기' });
    const [restorePatchRes] = await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/qna') && res.request().method() === 'PUT'),
      restoreSaveButton.click(),
    ]);
    expect(restorePatchRes.ok()).toBe(true);

    await page.goto(`/shop/${PRODUCT_ID}`);
    await expect(page.locator('#qna')).not.toContainText(marker);
  });
});
