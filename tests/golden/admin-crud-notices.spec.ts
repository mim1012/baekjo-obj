import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CRUD_ENABLED,
  bypassHeaders,
  deleteMatchingAdminRows,
  loginAsAdmin,
} from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /admin/notices → 공지를 노출하는 모든 공개 화면.
//
// 2026-07-18 배경: 관리자 삭제가 저장 안 되고, 수정이 새로고침하면 되돌아오는 버그 2건이
// 209개 소스-계약 테스트를 통과한 채로 배포됐다 — 아무 테스트도 실제로 화면을 클릭하지
// 않았기 때문이다. 이 스펙은 브라우저로 등록 → 관리자가 입력한 필드 하나하나가 공지를
// 노출하는 모든 화면에 정확히 반영되는지 → 수정 → 삭제 → 새로고침 후 사라짐까지 실제로
// 클릭해 검증한다.
//
// ⚠️ 홈 화면 소식 위젯(HomeClient.tsx `recentNotices = notices.slice(0, 4)`)은 이 스펙의
// 검증 대상에서 제외했다 — 등록은 배열 끝에 append(admin/notices/page.tsx handleCreate:
// `[...persistedItemsRef.current, newNotice]`)하고 홈은 "최근 4건"이 아니라 배열의
// "앞에서 4건"을 보여준다. 신규 공지는 구조적으로 그 4건에 들 수 없으므로(기존 공지가
// 4건 이상이면 항상 제외) 여기서 검증하면 상시 실패하는 스펙이 된다 — 실제로는 홈이
// "최근 소식"이라는 라벨과 달리 가장 오래된 4건을 보여주는 제품 버그일 가능성이 있어
// 별도로 팀 리드에게 플래그했다.
//
// 🚨 쓰기(write) 스펙 — 실제 DB에 데이터를 만들고 지운다. E2E_ADMIN_CRUD=1 로 명시적으로
// 켜지 않으면 전체 skip. 절대 production을 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 공지사항', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const SEARCH_PREFIX = 'E2E-공지-';
  const title = `${SEARCH_PREFIX}${runId}`;
  const editedTitle = `${title}-수정`;
  const writer = `E2E작성자-${runId}`;
  const content = `E2E 테스트 본문 ${runId}`;
  // 실제 오늘 날짜(폼 기본값)와 겹치지 않는 값을 골라 "입력한 값이 그대로 반영되는지"를
  // 정확히 검증한다 — 오늘 날짜가 기본값이라 우연히 맞아떨어지는 걸 배제하기 위함.
  const date = '2030-06-15';
  const dateLabel = '2030.06.15';
  const categoryLabel = '이벤트'; // formFields의 유형 select에서 'event'를 고른다.
  const NOTICES_SEARCH_PLACEHOLDER = '제목, 본문, 작성자 검색';

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await deleteMatchingAdminRows(page, '/admin/notices', NOTICES_SEARCH_PLACEHOLDER, SEARCH_PREFIX);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await deleteMatchingAdminRows(page, '/admin/notices', NOTICES_SEARCH_PLACEHOLDER, SEARCH_PREFIX);
    await page.close();
  });

  test('등록 → 필드 단위로 모든 공개 화면에 반영 → 수정 → 삭제 → 새로고침 후 사라짐', async ({ page }) => {
    page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });

    await loginAsAdmin(page);
    await page.goto('/admin/notices');

    // 1) 등록 — onCreateRow만 있고 onSave는 없는 화면이라 저장 버튼 라벨은 '저장'(AdminResourcePage.tsx).
    // ⚠️ getByLabel은 기본 substring 매칭이라 '제목'/'본문'/'작성자'는 검색창의
    // aria-label("제목, 본문, 작성자 검색")과 겹쳐 strict-mode violation이 난다(실측) — exact:true로 고정.
    await page.getByRole('button', { name: '공지 등록' }).click();
    await page.getByLabel('제목', { exact: true }).fill(title);
    await page.getByLabel('유형').selectOption('event');
    await page.getByLabel('본문', { exact: true }).fill(content);
    await page.getByLabel('작성자', { exact: true }).fill(writer);
    await page.getByLabel('작성일').fill(date);
    await page.getByRole('button', { name: '저장' }).click();

    // 2) 관리자 목록 — 등록한 필드 전부(유형·제목·작성자·작성일)가 정확히 반영됐는지 행 단위로 확인.
    const adminRow = page.locator('tr', { hasText: title });
    await expect(adminRow).toBeVisible({ timeout: 15_000 });
    await expect(adminRow).toContainText(categoryLabel);
    await expect(adminRow).toContainText(writer);
    await expect(adminRow).toContainText(dateLabel);

    // 3) 공개 /notices 목록 — 제목·분류 배지·작성일이 그대로 노출되는지 확인.
    await page.goto('/notices');
    const publicListItem = page.locator('li', { hasText: title });
    await expect(publicListItem).toBeVisible();
    await expect(publicListItem).toContainText(categoryLabel);
    await expect(publicListItem).toContainText(dateLabel);

    // 4) 공지 클릭 → 상세 페이지 — 제목·본문·작성자·작성일이 전부 반영되는지 확인.
    await publicListItem.getByRole('link', { name: title }).first().click();
    await expect(page).toHaveURL(/\/notices\/.+/);
    await expect(page.locator('h1')).toContainText(title);
    await expect(page.locator('body')).toContainText(content);
    await expect(page.locator('body')).toContainText(writer);
    await expect(page.locator('body')).toContainText(dateLabel);

    // 5) 관리자로 돌아와 제목 수정
    await page.goto('/admin/notices');
    await page.getByPlaceholder(NOTICES_SEARCH_PLACEHOLDER).fill(title);
    await expect(page.getByRole('button', { name: '수정' })).toHaveCount(1);
    await page.getByRole('button', { name: '수정' }).click();
    await page.getByLabel('제목', { exact: true }).fill(editedTitle);
    await page.getByRole('button', { name: '저장' }).click();
    await expect(page.locator('table')).toContainText(editedTitle, { timeout: 15_000 });

    // 6) 공개 화면에 수정 반영 확인
    await page.goto('/notices');
    await expect(page.locator('body')).toContainText(editedTitle);

    // 7) 삭제 — 이 리로드 스텝이 오늘 유실된 버그(삭제 미저장)를 정확히 잡는 지점이다.
    await page.goto('/admin/notices');
    await page.getByPlaceholder(NOTICES_SEARCH_PLACEHOLDER).fill(editedTitle);
    await expect(page.getByRole('button', { name: '삭제' })).toHaveCount(1);
    await page.getByRole('button', { name: '삭제' }).click();
    await expect(page.locator('table')).not.toContainText(editedTitle, { timeout: 15_000 });

    // 8) 공개 화면 새로고침 후 완전히 사라졌는지 확인(삭제가 진짜 DB에 반영됐는지 검증).
    await page.goto('/notices');
    await page.reload();
    await expect(page.locator('body')).not.toContainText(editedTitle);
    await expect(page.locator('body')).not.toContainText(title);
  });
});
