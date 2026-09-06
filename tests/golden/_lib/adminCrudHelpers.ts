import { expect, type Locator, type Page } from '@playwright/test';
import { assertLocalhostAppRuntimeSupabaseRefMatchesTestRef } from '../../_lib/supabaseSafety';
import { PRODUCT_DISCLOSURE_CATEGORIES } from '../../../src/lib/products/disclosures';

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

export async function assertGoldenWritePreflight(): Promise<void> {
  await assertLocalhostAppRuntimeSupabaseRefMatchesTestRef('golden');
}

type ExpectedSession = Readonly<{
  role?: string;
  status?: string;
}>;

export async function loginWithCredentials(
  page: Page,
  email: string,
  password: string,
  expectedSession: ExpectedSession = {},
): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      await page.context().clearCookies();

      await page.goto('/login', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();
      const loginButton = page.getByRole('button', { name: /로그인/ }).first();

      await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
      await emailInput.fill(email, { timeout: 5_000 });
      await passwordInput.fill(password, { timeout: 5_000 });
      await expect(loginButton).toBeEnabled({ timeout: 10_000 });
      await Promise.all([
        page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 }),
        loginButton.click({ timeout: 5_000 }),
      ]);
      const sessionResponse = await page.request.get('/api/members/me', {
        headers: { 'Cache-Control': 'no-store' },
      });
      if (!sessionResponse.ok()) {
        throw new Error(`로그인 세션 확인 실패: ${sessionResponse.status()} ${await sessionResponse.text()}`);
      }
      const { user } = (await sessionResponse.json()) as {
        user?: { email?: string; role?: string; status?: string };
      };
      if (user?.email !== email) {
        throw new Error(`로그인 계정 불일치: expected=${email} actual=${user?.email ?? 'unknown'}`);
      }
      if (expectedSession.role && user?.role !== expectedSession.role) {
        throw new Error(`로그인 권한 불일치: expected=${expectedSession.role} actual=${user?.role ?? 'unknown'}`);
      }
      if (expectedSession.status && user?.status !== expectedSession.status) {
        throw new Error(`로그인 상태 불일치: expected=${expectedSession.status} actual=${user?.status ?? 'unknown'}`);
      }
      return;
    } catch (error) {
      lastError = error;
      await page.waitForTimeout(1_000);
    }
  }

  throw lastError;
}

/** visual.spec.ts 의 관리자 로그인 시퀀스와 동일(§8-6 bypass 헤더는 test.use extraHTTPHeaders로 별도 주입). */
export async function loginAsAdmin(page: Page): Promise<void> {
  await assertGoldenWritePreflight();
  await loginWithCredentials(page, ADMIN_EMAIL!, ADMIN_PASSWORD!, {
    role: 'admin',
    status: 'active',
  });
}

/** DB를 변경하지 않는 페이지/API 스모크에서만 사용하는 관리자 로그인. */
export async function loginAsAdminReadOnly(page: Page): Promise<void> {
  await loginWithCredentials(page, ADMIN_EMAIL!, ADMIN_PASSWORD!, {
    role: 'admin',
    status: 'active',
  });
}

const GOLDEN_SELLER_NAME = 'E2E 전용 검증 판매자';

/**
 * 공개 상품 테스트가 법정 판매자 정보를 우회하지 않도록 staging에 한 건만 유지하는 검증 판매자.
 * 주문 이력이 판매자 삭제를 막을 수 있어 실행마다 늘리지 않고 표시명으로 재사용한다.
 */
export async function ensureGoldenVerifiedSeller(page: Page): Promise<string> {
  await assertGoldenWritePreflight();
  const listResponse = await page.request.get('/api/admin/sellers');
  expect(listResponse.ok(), `판매자 목록 조회 실패: ${listResponse.status()}`).toBe(true);
  const list = (await listResponse.json()) as { sellers: Array<{ id: string; displayName: string; status: string }> };
  const existing = list.sellers.find((seller) => seller.displayName === GOLDEN_SELLER_NAME);
  if (existing?.status === 'verified') return existing.id;

  const data = {
    displayName: GOLDEN_SELLER_NAME,
    legalName: '이투이테스트 주식회사',
    representativeName: '테스트관리자',
    businessRegistrationNumber: '000-00-00000',
    mailOrderRegistrationNumber: '테스트-0000호',
    businessAddress: '서울특별시 테스트구 검증로 1',
    returnAddress: '서울특별시 테스트구 반품로 2',
    phone: '02-0000-0000',
    email: 'seller-e2e@example.test',
    shippingFee: 3000,
    freeShippingThreshold: 50000,
    dispatchEstimate: '결제 완료 후 3영업일 이내 출고',
    returnPolicy: '상품 수령 후 7일 이내 교환·반품 신청',
    status: 'verified',
  };
  const response = existing
    ? await page.request.patch(`/api/admin/sellers/${encodeURIComponent(existing.id)}`, { data })
    : await page.request.post('/api/admin/sellers', { data });
  expect(response.ok(), `검증 판매자 준비 실패: ${response.status()} ${await response.text()}`).toBe(true);
  const payload = (await response.json()) as { seller: { id: string } };
  return payload.seller.id;
}

/** 공개 상품에 필요한 실제 판매자와 상품군별 고시 항목을 관리자 폼에서 모두 입력한다. */
export async function fillProductCompliance(
  page: Page,
  sellerId: string,
  categoryCode = 'life',
): Promise<void> {
  await page.locator('#product-seller').selectOption(sellerId);
  await page.locator('#product-disclosure-category').selectOption(categoryCode);
  const definition = PRODUCT_DISCLOSURE_CATEGORIES.find((category) => category.code === categoryCode);
  if (!definition) throw new Error(`알 수 없는 상품 고시 분류: ${categoryCode}`);
  for (const field of definition.fields) {
    await page.locator(`#product-disclosure-${field.key}`).fill(`E2E ${field.label}`);
  }
}

export async function selectProductBrand(page: Page, brandId: string): Promise<void> {
  const select = page.locator('#product-brand');
  await expect(select).toBeVisible({ timeout: 15_000 });
  await expect(select.locator(`option[value="${brandId}"]`)).toBeAttached({ timeout: 15_000 });
  await select.selectOption(brandId);
}

export async function selectProductFormOption(page: Page, groupName: string, optionIndex = 0): Promise<string> {
  const group = page.getByRole('group', { name: groupName });
  await expect(group).toBeVisible({ timeout: 15_000 });
  const option = group.getByRole('button').nth(optionIndex);
  await expect(option).toBeVisible({ timeout: 15_000 });
  const label = (await option.innerText()).trim();
  await option.click();
  await expect(option).toHaveAttribute('aria-pressed', 'true');
  return label;
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
  await assertGoldenWritePreflight();
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
  await assertGoldenWritePreflight();
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
