import type { Locator, Page } from '@playwright/test';

// admin-crud-*.spec.ts 전용 헬퍼. 파일명이 *.spec.ts 가 아니라 Playwright 테스트로 수집되지 않는다.
//
// 🚨 쓰기(write) 스펙 전용 — 이 헬퍼를 쓰는 스펙은 실제 DB에 create/update/delete 를 실행한다.
// 절대 production을 겨냥하지 말 것. 대상은 Vercel Preview 또는 staging뿐이다(§10-8 SUPABASE_URL
// project ref로 staging=aeooyivfijthfcrfrnyk / prod=vgeqpbyyggxxaeowtbtj 구분).

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
export const BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS;

/** 쓰기 스펙 실행 게이트 — 명시적으로 켜지 않으면(E2E_ADMIN_CRUD=1) 전부 skip. */
export const CRUD_ENABLED = process.env.E2E_ADMIN_CRUD === '1';

export function bypassHeaders(): Record<string, string> {
  return BYPASS_SECRET ? { 'x-vercel-protection-bypass': BYPASS_SECRET } : {};
}

/** visual.spec.ts 의 관리자 로그인 시퀀스와 동일(§8-6 bypass 헤더는 test.use extraHTTPHeaders로 별도 주입). */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL!);
  await page.locator('input[type="password"]').fill(ADMIN_PASSWORD!);
  await page
    .getByRole('button', { name: /로그인/ })
    .first()
    .click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
}

/**
 * 관리자 목록 화면에서 검색어에 매칭되는 모든 행을 삭제한다 — 이전 실행이 남긴 잔여
 * E2E 테스트 데이터를 치우는 정리 가드(beforeAll/afterAll 양쪽에서 호출).
 * AdminResourcePage 의 삭제는 window.confirm 을 띄우므로 dialog 핸들러를 등록해 수락한다.
 */
export async function deleteMatchingAdminRows(
  page: Page,
  adminPath: string,
  searchPlaceholder: string,
  searchTerm: string,
): Promise<void> {
  page.on('dialog', (dialog) => {
    dialog.accept().catch(() => {});
  });

  await page.goto(adminPath);
  const searchInput = page.getByPlaceholder(searchPlaceholder);
  await searchInput.waitFor({ state: 'visible', timeout: 15_000 });
  await searchInput.fill(searchTerm);

  // 검색 결과 첫 행을 반복 삭제 — 즉시 저장(auto-save) 반영을 기다리며 매칭이 사라질 때까지.
  const deleteButton = page.getByRole('button', { name: '삭제' });
  for (let i = 0; i < 25; i += 1) {
    const count = await deleteButton.count();
    if (count === 0) break;
    await deleteButton.first().click();
    await page.waitForTimeout(600);
  }
}

/**
 * deleteMatchingAdminRows의 스코프드 버전 — 한 페이지에 AdminResourcePage 인스턴스가
 * 여러 개(예: /admin/insurance-content 의 동의 문서 + FAQ) 있을 때 쓴다. 페이지 전역에서
 * '삭제' 버튼을 찾으면 검색으로 걸러지지 않은 다른 섹션의 행까지 지울 위험이 있다 —
 * scope(예: 그 섹션의 검색창을 포함하는 카드 컨테이너) 안에서만 검색·삭제한다.
 */
export async function deleteMatchingRowsWithin(
  page: Page,
  scope: Locator,
  searchPlaceholder: string,
  searchTerm: string,
): Promise<void> {
  page.on('dialog', (dialog) => {
    dialog.accept().catch(() => {});
  });

  const searchInput = scope.getByPlaceholder(searchPlaceholder);
  await searchInput.waitFor({ state: 'visible', timeout: 15_000 });
  await searchInput.fill(searchTerm);

  const deleteButton = scope.getByRole('button', { name: '삭제' });
  for (let i = 0; i < 25; i += 1) {
    const count = await deleteButton.count();
    if (count === 0) break;
    await deleteButton.first().click();
    await page.waitForTimeout(600);
  }
}
