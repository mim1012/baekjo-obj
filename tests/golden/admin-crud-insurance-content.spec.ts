import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CRUD_ENABLED,
  bypassHeaders,
  deleteMatchingRowsWithin,
  loginAsAdmin,
} from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /admin/insurance-content(FAQ 섹션) → 공개 /insurance FAQ.
//
// ⚠️ FAQ만 다룬다 — 동의 문서(consents)는 건드리지 않는다. 법정 동의문(privacy/analysis)이
// 섞여 있어 잘못 건드리면 실제 보험 신청 동의 절차가 깨진다. FAQ는 빈 배열도 허용하는
// append-CRUD라 notices/concerns와 같은 패턴 A이고 복원이 필요 없다(등록한 내 행만 지우면 끝).
//
// /admin/insurance-content 페이지 안에 AdminResourcePage 인스턴스가 "동의 문서"·"FAQ" 두 개
// 있다(같은 페이지, 같은 컨테이너: <div className="space-y-10"><AdminResourcePage .../ 동의
// 문서/><AdminResourcePage .../ FAQ/></div>). 전역 '삭제' 버튼을 그냥 찾으면 검색으로 걸러지지
// 않은 동의 문서 행까지 지울 위험이 있어, deleteMatchingRowsWithin으로 FAQ 섹션(두 번째
// AdminResourcePage 루트 div)에만 스코핑한다.
//
// 🚨 쓰기(write) 스펙 — 실제 DB에 데이터를 만들고 지운다. E2E_ADMIN_CRUD=1 로 명시적으로
// 켜지 않으면 전체 skip. 절대 production을 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 보험 FAQ', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const SEARCH_PREFIX = 'E2E-질문-';
  const question = `${SEARCH_PREFIX}${runId}`;
  const answer = `E2E-답변-${runId}`;
  const FAQ_SEARCH_PLACEHOLDER = '질문 검색';

  // /admin/insurance-content의 두 번째 AdminResourcePage(FAQ) 루트를 스코핑한다 — 코드상
  // <div className="space-y-10"> 아래 두 인스턴스가 직계 자식으로 나란히 렌더된다(§ 위 주석).
  function faqSection(page: import('@playwright/test').Page) {
    return page.locator('div.space-y-10 > div').nth(1);
  }

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await page.goto('/admin/insurance-content');
    await deleteMatchingRowsWithin(page, faqSection(page), FAQ_SEARCH_PLACEHOLDER, SEARCH_PREFIX);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await page.goto('/admin/insurance-content');
    await deleteMatchingRowsWithin(page, faqSection(page), FAQ_SEARCH_PLACEHOLDER, SEARCH_PREFIX);
    await page.close();
  });

  test('FAQ 등록 → 필드 단위로 공개 /insurance에 반영 → 삭제 → 사라짐', async ({ page }) => {
    page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });

    await loginAsAdmin(page);
    // ⚠️ /admin/insurance-content의 "FAQ 등록" 버튼은 notices/reviews/kits/partners와 달리
    // config 로드 완료를 기다리지 않고 항상 렌더된다(onCreateRow={handleCreateFaq}, ready 가드
    // 없음). handleCreateFaq 내부의 `if (!loaded || loadError) return;`가 로드 전 클릭을 조용히
    // no-op으로 삼킨다 — FAQ 폼은 필드가 질문/답변 2개뿐이라 로드가 끝나기 전에 저장까지 눌러버릴
    // 만큼 빠르고, 실측으로 실제 등록 유실을 재현했다(전체 카운트가 안 늘어남). GET 응답을
    // 명시적으로 기다려 결정론적으로 만든다.
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/admin/insurance-content') && res.request().method() === 'GET',
      ),
      page.goto('/admin/insurance-content'),
    ]);

    const section = faqSection(page);

    // 1) 등록 — onCreateRow만 있고 onSave는 없는 화면이라 저장 버튼 라벨은 '저장'(AdminResourcePage.tsx).
    // ⚠️ '질문'은 FAQ 섹션 검색창 aria-label("질문 검색")과 substring이 겹쳐 exact:true가 필요하다.
    await section.getByRole('button', { name: 'FAQ 등록' }).click();
    await section.getByLabel('질문', { exact: true }).fill(question);
    await section.getByLabel('답변', { exact: true }).fill(answer);
    await section.getByRole('button', { name: '저장' }).click();

    // 2) 관리자 목록(FAQ 섹션만) — 질문·답변 요약이 반영됐는지 확인.
    const adminRow = section.locator('tr', { hasText: question });
    await expect(adminRow).toBeVisible({ timeout: 15_000 });
    await expect(adminRow).toContainText(answer.slice(0, 30)); // aSummary는 60자 초과 시 말줄임 — 앞부분만 확인.

    // 3) 공개 /insurance FAQ 아코디언 — 질문은 항상 보이고, 답변은 React 상태로 조건부 렌더라
    // 클릭해서 펼쳐야 DOM에 나타난다(concerns의 네이티브 <details>와 다른 패턴).
    await page.goto('/insurance');
    const faqItem = page.locator('[role="button"]', { hasText: question });
    await expect(faqItem).toBeVisible({ timeout: 15_000 });
    await faqItem.click();
    await expect(faqItem).toContainText(answer);

    // 4) 삭제 — 오늘 유실된 버그(삭제 미저장)를 정확히 잡는 지점이다.
    await page.goto('/admin/insurance-content');
    const sectionAfterReload = faqSection(page);
    await sectionAfterReload.getByPlaceholder(FAQ_SEARCH_PLACEHOLDER).fill(question);
    await expect(sectionAfterReload.getByRole('button', { name: '삭제' })).toHaveCount(1);
    await sectionAfterReload.getByRole('button', { name: '삭제' }).click();
    await expect(sectionAfterReload.locator('table')).not.toContainText(question, { timeout: 15_000 });

    // 5) 공개 화면 새로고침 후 완전히 사라졌는지 확인(삭제가 진짜 DB에 반영됐는지 검증).
    await page.goto('/insurance');
    await page.reload();
    await expect(page.locator('body')).not.toContainText(question);
  });
});
