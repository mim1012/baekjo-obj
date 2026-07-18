import { defineConfig, devices } from '@playwright/test';

// 골든플로우(배포 게이트) E2E. 기본 타깃은 LIVE Vercel preview(공개).
// 로컬 실행: E2E_BASE_URL=http://localhost:3000 로 오버라이드하면 dev 서버를 자동 기동한다.
// 실행: `E2E_BASE_URL=<url> npx playwright test --reporter=line`
//
// ⚠️ `??`가 아니라 `||`로 빈 문자열도 미설정 취급한다(opus 리뷰 MEDIUM) — GitHub Actions에서
// `${{ github.event.deployment_status.environment_url }}`처럼 이벤트에 값이 없는 표현식은
// undefined가 아니라 빈 문자열('')로 주입된다. `??`는 빈 문자열을 "설정됨"으로 보고 그대로
// 통과시켜 baseURL=''이 되고, 그 상태로 page.goto()가 던진다 — 이 폴백은 golden-crud 등
// 다른 프로젝트에도 공유되는 일반 강건성 수정이라 항상 켜둔다.
const fromEnv = process.env.E2E_BASE_URL || process.env.BASE_URL;
const baseURL =
  fromEnv || 'https://baekjo-obj-git-integrate-approval-2df5a8-parkjoonhyuns-projects.vercel.app';

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
      // admin-crud-*.spec.ts는 실제 DB에 쓰는 별도 project(golden-crud)에서만 돈다 — 여기서
      // 중복 실행하면 E2E_ADMIN_CRUD 게이트 없이도 매 CI 실행마다 두 번 쓰기를 시도하게 된다.
      testIgnore: ['**/admin-crud-*.spec.ts'],
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
      // 관리자 CRUD 실구동(쓰기) 스펙 전용 — DB에 실제로 create/update/delete 한다.
      // E2E_ADMIN_CRUD=1 이 없으면 스펙 내부 test.skip으로 전부 건너뛴다(.github/workflows/golden-crud.yml).
      name: 'golden-crud',
      testDir: './tests/golden',
      testMatch: ['**/admin-crud-*.spec.ts'],
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
