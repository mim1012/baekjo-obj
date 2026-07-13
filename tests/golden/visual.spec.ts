import { test, expect, type Page } from '@playwright/test';

// 시각 회귀 게이트 — 골든플로우(§7) 7경로 × 데스크톱/모바일 = 14장 (상한 고정).
// 목적: 병합에서 dad 표현(마크업·스타일)이 유실되면 사람 전수조사 없이 CI가 픽셀 diff로 잡는다(§8-1).
//
// ⚠️ 베이스라인은 반드시 CI(Linux)에서 생성한다 — .github/workflows/update-baselines.yml 사용
//    (PR에 `update-baselines` 라벨 또는 수동 dispatch). 로컬(Windows) 스냅샷은 폰트 렌더 차이로
//    전부 오탐이라 커밋 금지. 스냅샷 파일명의 -linux 접미사가 로컬 실행과 충돌을 막는다.
// ⚠️ 콘텐츠 변경 PR(재시드·썸네일 교체 등)은 베이스라인 갱신 커밋을 같은 PR에 포함한다(§8-1) —
//    DB가 화면의 진실 소스라 콘텐츠 변경도 화면을 바꾼다.
// ※ 상품 상세(/shop/[id])는 콘텐츠 변동이 가장 잦아 v1에서 제외 — 행위 스모크(shop.spec)가 커버.

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 390, height: 844 },
] as const;

// 관리자 자격증명은 CI secret(E2E_ADMIN_*)으로만 주입 — 공개 리포이므로 하드코딩 폴백 금지.
// 미주입 시 admin 촬영만 skip(공개 12장은 정상 실행).
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

// Vercel Deployment Protection이 켜진 프리뷰 접근용(§8-6). secret 미설정 시 헤더 생략(프로텍션 OFF 상태).
const BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS;

// framer-motion whileInView 등장 애니메이션을 전부 트리거하기 위해 끝까지 스크롤 후 상단 복귀.
// fullPage 스크린샷이 숨김/이동 상태의 요소를 찍는 오탐을 막는다.
async function settlePage(page: Page) {
  // 'networkidle' 금지: Vercel Preview 툴바가 웹소켓을 상시 유지해 idle이 영원히 안 온다
  // (2026-07-12 실측 — 14/14 타임아웃). load + 고정 정착 대기로 충분.
  await page.waitForLoadState('load');
  await page.waitForTimeout(1_000);
  await page.evaluate(async () => {
    const step = window.innerHeight;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

const PUBLIC_PAGES = [
  { flow: '#1 진단', path: '/diagnosis', slug: 'diagnosis' },
  { flow: '#2 구매', path: '/shop', slug: 'shop' },
  { flow: '#3 보험', path: '/insurance', slug: 'insurance' },
  { flow: '#4 브랜드', path: '/brands/b1', slug: 'brand-detail' },
  { flow: '#5 B2B', path: '/landing/care-kit', slug: 'care-kit' },
  { flow: '#6 회원', path: '/login', slug: 'login' },
] as const;

test.describe('시각 회귀 — 골든플로우', () => {
  test.use({
    extraHTTPHeaders: BYPASS_SECRET ? { 'x-vercel-protection-bypass': BYPASS_SECRET } : {},
  });

  // CI(Linux) 전용. 로컬 강제 실행: VISUAL_LOCAL=1 (단, 생성된 스냅샷 커밋 금지)
  test.skip(
    process.platform !== 'linux' && !process.env.VISUAL_LOCAL,
    'CI(Linux) 전용 — 로컬 스냅샷은 폰트 렌더 차이로 오탐',
  );

  for (const vp of VIEWPORTS) {
    test.describe(vp.name, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      for (const p of PUBLIC_PAGES) {
        test(`${p.flow} ${p.path}`, async ({ page }) => {
          await page.goto(p.path);
          await settlePage(page);
          await expect(page).toHaveScreenshot(`${p.slug}-${vp.name}.png`, {
            fullPage: true,
            maxDiffPixelRatio: 0.01,
            animations: 'disabled',
          });
        });
      }

      test(`#7 관리자 /admin/products`, async ({ page }) => {
        test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — admin 촬영 생략');
        await page.goto('/login');
        await page.locator('input[type="email"]').fill(ADMIN_EMAIL!);
        await page.locator('input[type="password"]').fill(ADMIN_PASSWORD!);
        await page
          .getByRole('button', { name: /로그인/ })
          .first()
          .click();
        await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });

        await page.goto('/admin/products');
        await settlePage(page);
        await expect(page).toHaveScreenshot(`admin-products-${vp.name}.png`, {
          // fullPage 금지(admin 한정): 동시 세션·payments-db-spec의 합성 __test_* 상품이 목록 행 수를
          // 바꾸면 fullPage 높이 자체가 변해(880↔800px 실측) 마스크가 무력화된다. 뷰포트 고정 촬영이면
          // 높이가 상수라 행 수 변동은 아래 tbody 마스크가 전부 흡수한다.
          fullPage: false,
          maxDiffPixelRatio: 0.01,
          animations: 'disabled',
          // 목록 행 데이터는 admin 입력·재시드로 상시 변동 → 마스크. 레이아웃·크롬만 고정 비교.
          // 상품 수 카운트("총 N개")·카테고리 개수 배지도 동시 세션 테스트/재시드로 상시 변동 → 마스크.
          mask: [
            page.locator('tbody'),
            page.locator('p', { hasText: '개의 상품' }),
            page.locator('span.float-right'),
          ],
        });
      });
    });
  }
});
