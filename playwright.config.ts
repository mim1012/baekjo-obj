import { defineConfig, devices } from '@playwright/test';

// 골든플로우(배포 게이트) E2E. 기본 타깃은 LIVE Vercel preview(공개).
// 로컬 실행: E2E_BASE_URL=http://localhost:3000 로 오버라이드하면 dev 서버를 자동 기동한다.
// 실행: `E2E_BASE_URL=<url> npx playwright test --reporter=line`
const baseURL =
  process.env.E2E_BASE_URL ??
  process.env.BASE_URL ??
  'https://baekjo-obj-git-integrate-approval-2df5a8-parkjoonhyuns-projects.vercel.app';

const isLocal = baseURL.includes('localhost') || baseURL.includes('127.0.0.1');

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['line'], ['html', { open: 'never' }]],
  projects: [
    {
      name: 'chromium',
      testDir: './tests/golden',
      use: {
        baseURL,
        navigationTimeout: 30_000,
        actionTimeout: 15_000,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'off',
        ...devices['Desktop Chrome'],
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
  ],
  // 로컬 baseURL 일 때만 dev 서버를 띄운다. 원격 preview 타깃일 땐 기동하지 않는다.
  ...(isLocal
    ? {
        webServer: {
          command: 'npm run dev',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
});
