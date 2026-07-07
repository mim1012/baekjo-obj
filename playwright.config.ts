import { defineConfig, devices } from '@playwright/test';

// 골든플로우(배포 게이트) E2E 설정. 스펙은 tests/golden/ 아래.
// 화면/로직 완성 전까지 각 스펙은 test.fixme()로 스킵됩니다.
// 실행: `npm run test:e2e` (브라우저 최초 1회 `npx playwright install` 필요)
export default defineConfig({
  testDir: './tests/golden',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
