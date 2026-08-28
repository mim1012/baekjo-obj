import { expect, test } from '@playwright/test';
import type { APIResponse, Page } from '@playwright/test';

const adminCredentials = {
  email: process.env.E2E_ADMIN_EMAIL ?? '',
  password: process.env.E2E_ADMIN_PASSWORD ?? '',
};

const memberCredentials = {
  email: process.env.E2E_MEMBER_EMAIL ?? '',
  password: process.env.E2E_MEMBER_PASSWORD ?? '',
};

type AuthEnvPayload = {
  readonly authSecretPresent: boolean;
  readonly authTrustHostEnabled: boolean;
};

type AuthCsrfPayload = {
  readonly csrfToken: string;
};

type AuthSessionPayload = {
  readonly user?: {
    readonly role?: string;
  };
};

type MemberMePayload = {
  readonly user?: {
    readonly role?: string;
    readonly status?: string;
  };
  readonly error?: string;
};

type LoginCheck = {
  readonly label: 'admin' | 'member';
  readonly credentials: {
    readonly email: string;
    readonly password: string;
  };
  readonly expectedRole: 'admin' | 'user';
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function isAuthEnvPayload(value: unknown): value is AuthEnvPayload {
  return (
    isRecord(value) &&
    typeof value.authSecretPresent === 'boolean' &&
    typeof value.authTrustHostEnabled === 'boolean'
  );
}

function isAuthCsrfPayload(value: unknown): value is AuthCsrfPayload {
  return isRecord(value) && typeof value.csrfToken === 'string';
}

function isAuthSessionPayload(value: unknown): value is AuthSessionPayload {
  if (!isRecord(value)) return false;
  if (value.user === undefined) return true;
  return isRecord(value.user) && (value.user.role === undefined || typeof value.user.role === 'string');
}

function isMemberMePayload(value: unknown): value is MemberMePayload {
  if (!isRecord(value)) return false;
  const userValid =
    value.user === undefined ||
    (isRecord(value.user) &&
      (value.user.role === undefined || typeof value.user.role === 'string') &&
      (value.user.status === undefined || typeof value.user.status === 'string'));
  return userValid && (value.error === undefined || typeof value.error === 'string');
}

function safePathnameWithQueryKeys(rawUrl: string): string {
  const url = new URL(rawUrl);
  const queryKeys = [...url.searchParams.keys()].sort();
  return `${url.pathname}${queryKeys.length > 0 ? `?${queryKeys.join('&')}` : ''}`;
}

function categorizeLoginAlert(text: string): 'invalid-credentials' | 'session-or-member-fetch' | 'unknown-alert' {
  if (text.includes('이메일 또는 비밀번호')) return 'invalid-credentials';
  if (text.includes('로그인 처리 중')) return 'session-or-member-fetch';
  return 'unknown-alert';
}

async function parseJson(response: APIResponse): Promise<unknown> {
  return response.json();
}

async function waitForLoginReady(page: Page): Promise<void> {
  await page.locator('form[data-e2e-login-ready="true"]').waitFor({ state: 'visible', timeout: 10_000 });
}

async function verifyLoginPath(page: Page, check: LoginCheck): Promise<void> {
  const { label, credentials, expectedRole } = check;
  const authResponses: string[] = [];
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.pathname.startsWith('/api/auth') || url.pathname === '/api/members/me') {
      authResponses.push(`${url.pathname}:${response.status()}`);
    }
  });

  const providersResponse = await page.request.get('/api/auth/providers');
  console.log(`AUTH_DIAG ${label} providers status=${providersResponse.status()}`);
  expect(providersResponse.status(), `${label} /api/auth/providers status`).toBe(200);
  const providersPayload = await parseJson(providersResponse);
  expect(isRecord(providersPayload), `${label} /api/auth/providers payload shape`).toBe(true);
  if (!isRecord(providersPayload)) return;
  expect('credentials' in providersPayload, `${label} /api/auth/providers includes credentials`).toBe(true);

  const csrfResponse = await page.request.get('/api/auth/csrf');
  console.log(`AUTH_DIAG ${label} csrf status=${csrfResponse.status()}`);
  expect(csrfResponse.status(), `${label} /api/auth/csrf status`).toBe(200);
  const csrfPayload = await parseJson(csrfResponse);
  expect(isAuthCsrfPayload(csrfPayload), `${label} /api/auth/csrf payload shape`).toBe(true);
  if (!isAuthCsrfPayload(csrfPayload)) return;
  console.log(`AUTH_DIAG ${label} csrf tokenPresent=${csrfPayload.csrfToken.length > 0}`);
  expect(csrfPayload.csrfToken.length, `${label} /api/auth/csrf token present`).toBeGreaterThan(0);

  await page.context().clearCookies();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await waitForLoginReady(page);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();

  try {
    await Promise.race([
      page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 20_000 }),
      page.getByRole('alert').waitFor({ state: 'visible', timeout: 20_000 }),
    ]);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `auth-only ${label} login unresolved: category=timeout location=${safePathnameWithQueryKeys(page.url())} responses=${authResponses.join(',')}`,
      );
    }
    throw error;
  }

  const alert = page.getByRole('alert').first();
  const currentPath = safePathnameWithQueryKeys(page.url());
  if (await alert.isVisible()) {
    const alertText = (await alert.textContent())?.trim() ?? '';
    throw new Error(
      `auth-only ${label} login rejected: category=${categorizeLoginAlert(alertText)} location=${currentPath} responses=${authResponses.join(',')}`,
    );
  }
  console.log(`AUTH_DIAG ${label} callback category=navigated location=${currentPath} responses=${authResponses.join(',')}`);

  const sessionResponse = await page.request.get('/api/auth/session', { headers: { 'Cache-Control': 'no-store' } });
  console.log(`AUTH_DIAG ${label} session status=${sessionResponse.status()}`);
  expect(sessionResponse.status(), `${label} /api/auth/session status`).toBe(200);
  const sessionPayload = await parseJson(sessionResponse);
  expect(isAuthSessionPayload(sessionPayload), `${label} /api/auth/session payload shape`).toBe(true);
  if (!isAuthSessionPayload(sessionPayload)) return;
  console.log(`AUTH_DIAG ${label} session role=${sessionPayload.user?.role ?? 'none'}`);
  expect(sessionPayload.user?.role, `${label} /api/auth/session user role`).toBe(expectedRole);

  const memberResponse = await page.request.get('/api/members/me', { headers: { 'Cache-Control': 'no-store' } });
  const memberPayload = await parseJson(memberResponse);
  expect(isMemberMePayload(memberPayload), `${label} /api/members/me payload shape`).toBe(true);
  if (!isMemberMePayload(memberPayload)) return;
  console.log(
    `AUTH_DIAG ${label} membersMe status=${memberResponse.status()} error=${memberPayload.error ?? 'none'} role=${memberPayload.user?.role ?? 'none'} memberStatus=${memberPayload.user?.status ?? 'none'}`,
  );
  expect(memberResponse.status(), `${label} /api/members/me status error=${memberPayload.error ?? 'none'}`).toBe(200);
  expect(memberPayload.user?.role, `${label} /api/members/me user role`).toBe(expectedRole);
  expect(memberPayload.user?.status, `${label} /api/members/me user status`).toBe('active');
}

test.describe('Credentials 로그인 redirect hygiene', () => {
  test.skip(!adminCredentials.email || !adminCredentials.password, 'E2E_ADMIN_* secret 미주입 — 로그인 회귀 스킵');

  test('localhost Auth.js credentials path establishes admin and member sessions without writes', async ({ browser, page }) => {
    test.skip(!memberCredentials.email || !memberCredentials.password, 'E2E_MEMBER_* secret 미주입 — 로그인 회귀 스킵');
    const envResponse = await page.request.get('/api/test/auth-env');
    console.log(`AUTH_DIAG env status=${envResponse.status()}`);
    expect(envResponse.status(), '/api/test/auth-env status').toBe(200);
    const envPayload = await parseJson(envResponse);
    expect(isAuthEnvPayload(envPayload), '/api/test/auth-env payload shape').toBe(true);
    if (!isAuthEnvPayload(envPayload)) return;
    console.log(
      `AUTH_DIAG env authSecretPresent=${envPayload.authSecretPresent} authTrustHostEnabled=${envPayload.authTrustHostEnabled}`,
    );
    expect(envPayload.authSecretPresent, 'AUTH_SECRET reaches localhost app runtime').toBe(true);
    expect(envPayload.authTrustHostEnabled, 'AUTH_TRUST_HOST reaches localhost app runtime').toBe(true);

    await verifyLoginPath(page, {
      label: 'admin',
      credentials: adminCredentials,
      expectedRole: 'admin',
    });
    const memberPage = await browser.newPage();
    try {
      await verifyLoginPath(memberPage, {
        label: 'member',
        credentials: memberCredentials,
        expectedRole: 'user',
      });
    } finally {
      await memberPage.close();
    }
  });

  test('관리자 가드에서 돌아온 error 쿼리가 성공 로그인을 실패로 오인시키지 않는다', async ({ page }) => {
    await page.goto('/login?error=admin', { waitUntil: 'domcontentloaded' });
    await waitForLoginReady(page);
    await page.locator('input[type="email"]').fill(adminCredentials.email);
    await page.locator('input[type="password"]').fill(adminCredentials.password);

    await Promise.all([
      page.waitForURL((url) => url.pathname === '/admin', { timeout: 20_000 }),
      page.getByRole('button', { name: '로그인', exact: true }).click(),
    ]);

    await expect(page).toHaveURL(/\/admin$/);
  });
});
