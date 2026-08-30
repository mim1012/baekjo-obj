import { defineConfig, devices } from '@playwright/test';
import fs from 'node:fs';
import { assertNoProductionOrPreviewTarget, resolveE2EBaseUrl } from './tests/_lib/envSafety';
import { assertAllowedTestSupabaseRef } from './tests/_lib/supabaseSafety';

// 실행: `E2E_BASE_URL=<url> npx playwright test --reporter=line`
//
// ⚠️ `??`가 아니라 `||`로 빈 문자열도 미설정 취급한다(opus 리뷰 MEDIUM) — GitHub Actions에서
// `${{ github.event.deployment_status.environment_url }}`처럼 이벤트에 값이 없는 표현식은
// undefined가 아니라 빈 문자열('')로 주입된다. `??`는 빈 문자열을 "설정됨"으로 보고 그대로
// 통과시켜 baseURL=''이 되고, 그 상태로 page.goto()가 던진다 — 이 폴백은 golden-crud 등
// 다른 프로젝트에도 공유되는 일반 강건성 수정이라 항상 켜둔다.
const baseURL = resolveE2EBaseUrl();
const previewReadOnlyTargetMode =
  process.env.PREVIEW_QA_ACK === '1'
    ? { allowPreviewReadOnly: true, environment: process.env }
    : undefined;
const targetHost = assertNoProductionOrPreviewTarget(baseURL, previewReadOnlyTargetMode).hostname.toLowerCase();

if (process.env.E2E_ADMIN_CRUD === '1') {
  assertNoProductionOrPreviewTarget(baseURL);
  assertAllowedTestSupabaseRef('golden');
}

const isLocal = targetHost === 'localhost' || targetHost === '127.0.0.1';
const localWebServerPort = new URL(baseURL).port || '3000';
const browserProjects = new Set([
  'anonymous-session-contract',
  'chromium',
  'golden-crud',
  'golden-smoke',
  'golden-smoke-mobile',
]);
export function shouldStartLocalWebServer(
  localTarget: boolean,
  args: readonly string[],
): boolean {
  const selectedProjects: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--project') {
      const project = args[index + 1];
      if (project) selectedProjects.push(project);
      continue;
    }
    if (argument?.startsWith('--project=')) {
      selectedProjects.push(argument.slice('--project='.length));
    }
  }
  return (
    localTarget &&
    (selectedProjects.length === 0 ||
      selectedProjects.some((project) => browserProjects.has(project)))
  );
}

const shouldStartLocalServer = shouldStartLocalWebServer(isLocal, process.argv);
const protectionBypassHeaders = process.env.VERCEL_AUTOMATION_BYPASS
  ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS }
  : undefined;
const windowsChromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const localChromiumExecutablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
  (!process.env.CI && process.platform === 'win32' && fs.existsSync(windowsChromePath)
    ? windowsChromePath
    : undefined);
const localBrowserUse = localChromiumExecutablePath
  ? { launchOptions: { executablePath: localChromiumExecutablePath } }
  : {};

export default defineConfig({
  fullyParallel: isLocal,
  forbidOnly: !!process.env.CI,
  retries: isLocal ? 1 : 0,
  workers: isLocal ? undefined : 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['line'], ['html', { open: 'never' }]],
  projects: [
    {
      name: 'anonymous-session-contract',
      testDir: './tests/golden',
      testMatch: ['**/anonymous-session-contract.spec.ts'],
      use: {
        baseURL,
        extraHTTPHeaders: protectionBypassHeaders,
        navigationTimeout: 30_000,
        actionTimeout: 15_000,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'off',
        ...devices['Desktop Chrome'],
        ...localBrowserUse,
      },
    },
    {
      name: 'chromium',
      testDir: './tests/golden',
      // admin-crud-*.spec.ts는 실제 DB에 쓰는 별도 project(golden-crud)에서만 돈다 — 여기서
      // 중복 실행하면 E2E_ADMIN_CRUD 게이트 없이도 매 CI 실행마다 두 번 쓰기를 시도하게 된다.
      testIgnore: ['**/admin-crud-*.spec.ts', '**/all-pages-smoke.spec.ts'],
      use: {
        baseURL,
        extraHTTPHeaders: protectionBypassHeaders,
        navigationTimeout: 30_000,
        actionTimeout: 15_000,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'off',
        ...devices['Desktop Chrome'],
        ...localBrowserUse,
      },
    },
    {
      // 관리자 CRUD 실구동(쓰기) 스펙 전용 — DB에 실제로 create/update/delete 한다.
      // E2E_ADMIN_CRUD=1 이 없으면 스펙 내부 test.skip으로 전부 건너뛴다(.github/workflows/golden-crud.yml).
      name: 'golden-crud',
      testDir: './tests/golden',
      testMatch: ['**/admin-crud-*.spec.ts', '**/member-*.spec.ts'],
      use: {
        baseURL,
        extraHTTPHeaders: protectionBypassHeaders,
        navigationTimeout: 30_000,
        actionTimeout: 15_000,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'off',
        ...devices['Desktop Chrome'],
        ...localBrowserUse,
      },
    },
    {
      name: 'golden-smoke',
      testDir: './tests/golden',
      testMatch: ['**/all-pages-smoke.spec.ts'],
      use: {
        baseURL,
        extraHTTPHeaders: protectionBypassHeaders,
        navigationTimeout: 30_000,
        actionTimeout: 15_000,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'off',
        ...devices['Desktop Chrome'],
        ...localBrowserUse,
      },
    },
    {
      name: 'golden-smoke-mobile',
      testDir: './tests/golden',
      testMatch: ['**/all-pages-smoke.spec.ts'],
      use: {
        baseURL,
        extraHTTPHeaders: protectionBypassHeaders,
        navigationTimeout: 30_000,
        actionTimeout: 15_000,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'off',
        ...devices['Desktop Chrome'],
        ...localBrowserUse,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      // 결제 상태기계 DB/라우트 스펙 — Supabase Management API·fetch API 테스트, 브라우저 불필요.
      name: 'payments',
      testDir: './tests/payments',
      use: {},
    },
    {
      // 상품 입력 검증 단위 스펙 — 순수 함수, 브라우저·DB·네트워크 불필요.
      name: 'products',
      testDir: './tests/products',
      use: {},
    },
    {
      // 어드민 내비 SSOT 회귀 스펙 — 순수 데이터/함수, 브라우저·DB 불필요.
      name: 'admin',
      testDir: './tests/admin',
      use: {},
    },
    {
      name: 'security',
      testDir: './tests/security',
      use: {},
    },
    {
      // 스마트택배 조회 클라이언트 스펙 — 순수 함수 + fetch stub, 브라우저·DB·실 네트워크 불필요.
      name: 'tracking',
      testDir: './tests/tracking',
      use: {},
    },
    {
      // 배송 파생·검증 순수 함수 스펙 — orderBrandIds/deriveOrderDeliveryStatus/validateAdminShipmentPatch/
      // resolveShipmentStamps, 브라우저·DB·네트워크 불필요.
      name: 'shipments',
      testDir: './tests/shipments',
      use: {},
    },
    {
      name: 'partners',
      testDir: './tests/partners',
      use: {},
    },
  ],
  // 로컬 baseURL 일 때만 dev 서버를 띄운다. 원격 preview 타깃일 땐 기동하지 않는다.
  ...(shouldStartLocalServer
    ? {
        webServer: {
          command: 'npm run dev',
          env: { LOCAL_APP_RUNTIME_SUPABASE_PREFLIGHT: '1', PORT: localWebServerPort },
          url: new URL('/api/members/me', baseURL).toString(),
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
});
