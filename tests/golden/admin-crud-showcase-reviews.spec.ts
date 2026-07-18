import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CRUD_ENABLED,
  bypassHeaders,
  deleteMatchingAdminRows,
  loginAsAdmin,
} from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /admin/reviews → /reviews 왕복(전시 후기).
//
// 2026-07-18 배경: 관리자 삭제가 저장 안 되고, 수정이 새로고침하면 되돌아오는 버그 2건이
// 209개 소스-계약 테스트를 통과한 채로 배포됐다 — 아무 테스트도 실제로 화면을 클릭하지
// 않았기 때문이다. 이 스펙은 브라우저로 등록→공개 반영→숨김 토글→공개에서 사라짐→삭제→
// 관리자 새로고침 후 사라짐까지 전부 실제로 클릭해 확인한다.
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

  test('등록 → 공개 반영 → 숨김 토글 → 공개에서 사라짐 → 삭제 → 관리자 새로고침 후 사라짐', async ({
    page,
  }) => {
    page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });

    await loginAsAdmin(page);
    await page.goto('/admin/reviews');

    // 1) 등록 — onCreateRow만 있고 onSave는 없는 화면이라 저장 버튼 라벨은 '저장'(AdminResourcePage.tsx).
    await page.getByRole('button', { name: '후기 등록' }).click();
    await page.getByLabel('상품 ID').fill('p1');
    await page.getByLabel('반려동물').selectOption('dog');
    await page.getByLabel('견종/묘종').fill('골든리트리버');
    await page.getByLabel('후기 내용').fill(content);
    await page.getByRole('button', { name: '저장' }).click();
    await expect(page.locator('table')).toContainText(content, { timeout: 15_000 });

    // 2) 공개 /reviews에 반영 확인
    await page.goto('/reviews');
    await expect(page.locator('body')).toContainText(content);

    // 3) 관리자로 돌아와 노출 상태를 숨김으로 토글
    await page.goto('/admin/reviews');
    await page.getByPlaceholder(REVIEWS_SEARCH_PLACEHOLDER).fill(content);
    await expect(page.getByRole('button', { name: '수정' })).toHaveCount(1);
    await page.getByRole('button', { name: '수정' }).click();
    await page.getByLabel('노출 상태').selectOption('false');
    await page.getByRole('button', { name: '저장' }).click();
    await expect(page.locator('table')).toContainText('숨김', { timeout: 15_000 });

    // 4) 공개 화면에서 숨김 반영 확인(서버가 isVisible!==false로 필터링).
    await page.goto('/reviews');
    await expect(page.locator('body')).not.toContainText(content);

    // 5) 삭제 — 오늘 유실된 버그(삭제 미저장)를 정확히 잡는 지점이다.
    await page.goto('/admin/reviews');
    await page.getByPlaceholder(REVIEWS_SEARCH_PLACEHOLDER).fill(content);
    await expect(page.getByRole('button', { name: '삭제' })).toHaveCount(1);
    await page.getByRole('button', { name: '삭제' }).click();
    await expect(page.locator('table')).not.toContainText(content, { timeout: 15_000 });

    // 6) 관리자 목록 새로고침 후 완전히 사라졌는지 확인(삭제가 진짜 DB에 반영됐는지 검증).
    await page.reload();
    await page.getByPlaceholder(REVIEWS_SEARCH_PLACEHOLDER).fill(content);
    await expect(page.getByRole('button', { name: '수정' })).toHaveCount(0);
  });
});
