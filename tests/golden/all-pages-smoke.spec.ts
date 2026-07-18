import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ADMIN_EMAIL, ADMIN_PASSWORD, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';
import { ALL_APP_ROUTES, type RouteEntry } from './_lib/allPagesRoutes';

// 전 페이지 스모크 검수 — 읽기 전용(READ-ONLY, 쓰기 없음). src/app 의 모든 page.tsx(62개, 정적+동적)를
// 실제로 방문해 HTTP 200(또는 문서화된 리다이렉트)·에러 오버레이 부재·페이지별 앵커 렌더를 확인한다.
//
// 배경(2026-07-19): 관리자 CRUD 실구동 게이트(golden-crud)는 admin 도메인만 덮었다 — 공개 페이지는
// admin보다 훨씬 적은 검증만 받아왔다. 이 스펙은 "새 페이지 만들고 검수 누락"을 막는 두 번째 축이다
// (route-coverage-audit.spec.ts 가 첫 번째 축 — 신규 page.tsx 가 아래 ALL_APP_ROUTES 에 없으면 CI 실패).
//
// 🚨 이 스펙은 CRUD 를 전혀 하지 않는다 — E2E_ADMIN_CRUD 게이트가 없어도 항상 실행 가능하고,
// 어떤 환경(Preview/staging/로컬)에 대해 실행해도 안전하다(golden-crud 웨이브들과의 핵심 차이).
//
// 검증 3종:
// 1. HTTP 200(또는 auth:'redirect' 라우트의 documented 목적지로 302/클라이언트 리다이렉트).
// 2. 에러: 캡처한 pageerror(미처리 예외)는 전부 하드 실패. console 에러 중 "hydration" 관련은
//    하드 실패(진짜 버그일 가능성이 높다) — 그 외 console 에러는 소프트 리포트(스킵 사유처럼
//    테스트를 죽이지 않되 라인 리포터에 남긴다). 순수 노이즈(Fast Refresh, devtools 안내 등)는
//    NOISE_ALLOWLIST 로 제외한다 — 새 노이즈 패턴이 나오면 여기 추가하고 이유를 남길 것.
// 3. 앵커: 페이지마다 정해진 heading/landmark(본문이 비어있지 않다는 정도가 아니라, "이 페이지가
//    맞는 페이지를 그렸다"는 근거)가 보이는지 확인한다.

const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL;
const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD;

test.use({ extraHTTPHeaders: bypassHeaders() });

// ── 에러 캡처 ────────────────────────────────────────────────────────────
// 알려진 무해 노이즈만 여기 등록한다 — 새 패턴을 발견하면 "왜 무해한지" 이유를 주석에 남기고 추가할 것.
const NOISE_ALLOWLIST: RegExp[] = [
  /Download the React DevTools/i,
  /\[Fast Refresh\]/i,
  /favicon\.ico/i,
];

function isNoise(text: string): boolean {
  return NOISE_ALLOWLIST.some((re) => re.test(text));
}

interface ErrorCapture {
  consoleErrors: string[];
  pageErrors: string[];
}

function attachErrorCapture(page: Page): ErrorCapture {
  const capture: ErrorCapture = { consoleErrors: [], pageErrors: [] };
  page.on('console', (msg) => {
    if (msg.type() === 'error') capture.consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    capture.pageErrors.push(err.message);
  });
  return capture;
}

/** pageerror(미처리 예외)와 hydration 관련 console 에러는 하드 실패. 나머지 console 에러는 소프트 리포트. */
function assertNoBlockingErrors(capture: ErrorCapture, route: string): void {
  expect(capture.pageErrors, `${route} 에서 캡처된 미처리 예외(pageerror)`).toEqual([]);

  const hydrationIssues = capture.consoleErrors.filter((e) => /hydration/i.test(e));
  expect(hydrationIssues, `${route} 에서 캡처된 hydration 불일치 console 에러`).toEqual([]);

  const nonNoise = capture.consoleErrors.filter((e) => !isNoise(e));
  if (nonNoise.length > 0) {
    // 소프트 리포트 — 테스트를 실패시키지 않는다. 반복 발생 시 사람이 판단해 NOISE_ALLOWLIST 로
    // 옮기거나 진짜 버그로 승격(하드 실패 목록에 패턴 추가)할 것.
    console.warn(`[all-pages-smoke] ${route} 콘솔 에러(비차단, 리포트 전용): ${nonNoise.join(' || ')}`);
  }
}

/** Next.js 기본 에러 바운더리/오버레이가 뜨지 않았는지 body 텍스트로 방어적으로 확인한다. */
async function expectNoErrorBoundary(page: Page, route: string): Promise<void> {
  const bodyText = await page.locator('body').innerText().catch(() => '');
  expect(bodyText, `${route} 에서 Next.js 에러 바운더리로 보이는 문구 감지`).not.toMatch(
    /Application error|A client-side exception has occurred|Internal Server Error/i,
  );
}

// ── 페이지별 앵커 ────────────────────────────────────────────────────────
type AnchorCheck = (page: Page) => Promise<void>;

async function h1Visible(page: Page, name?: string | RegExp): Promise<void> {
  const locator = name
    ? page.getByRole('heading', { level: 1, name })
    : page.getByRole('heading', { level: 1 }).first();
  await expect(locator).toBeVisible({ timeout: 15_000 });
}

async function textVisible(page: Page, text: string | RegExp): Promise<void> {
  await expect(page.getByText(text).first()).toBeVisible({ timeout: 15_000 });
}

/** 공개 정적(auth:'none') 페이지의 앵커. 키는 allPagesRoutes.ts 의 route 와 정확히 같아야 한다. */
const PUBLIC_STATIC_ANCHORS: Record<string, AnchorCheck> = {
  '/': (page) => h1Visible(page),
  '/audit': (page) => h1Visible(page),
  '/b2b': (page) => h1Visible(page),
  '/brands': (page) => h1Visible(page, '좋은 선택은 브랜드를 이해하는 것부터 시작됩니다.'),
  '/cart': (page) => h1Visible(page, '장바구니'),
  '/concerns': (page) => h1Visible(page, /어떤 변화가 보이나요/),
  '/diagnosis': (page) => h1Visible(page),
  '/experts': (page) => h1Visible(page, /상품 선택 기준/),
  '/forgot-password': (page) => h1Visible(page, '비밀번호를 잊으셨나요?'),
  '/insurance': (page) => h1Visible(page),
  '/insurance/apply': (page) => h1Visible(page, '보험 분석 신청'),
  '/insurance/complete': (page) => h1Visible(page, '분석 신청이 완료되었습니다'),
  '/insurance/recommend': (page) => h1Visible(page),
  '/landing/care-kit': (page) => h1Visible(page),
  '/landing/insurance': (page) => h1Visible(page),
  '/login': (page) => h1Visible(page, '다시 만나 반가워요.'),
  '/notices': (page) => h1Visible(page, '공지사항'),
  '/order-complete': (page) => h1Visible(page, '주문이 완료되었습니다'),
  '/privacy': (page) => h1Visible(page, '개인정보처리방침'),
  '/refund-policy': (page) => h1Visible(page, '배송·교환·환불 안내'),
  '/reviews': (page) => h1Visible(page, '반려가족의 리얼 후기'),
  '/shop': (page) => h1Visible(page, '우리 아이를 위한 셀렉션'),
  '/signup': (page) => h1Visible(page, '회원가입'),
  '/terms': (page) => h1Visible(page, '이용약관'),
  // 토큰 없는 cold visit — 각 페이지의 "링크가 올바르지 않다" 계열 문구가 정상 상태다.
  '/verify-email': (page) => textVisible(page, '링크가 만료됐거나 올바르지 않아요'),
  '/reset-password': (page) => textVisible(page, '링크가 올바르지 않아요'),
};

/** 관리자 정적(auth:'admin') 페이지의 h1 텍스트(AdminResourcePage/AdminPageHeader/PageHeader 공통 렌더). */
const ADMIN_STATIC_HEADINGS: Record<string, string> = {
  '/admin': '대시보드',
  '/admin/brands': '브랜드 관리',
  '/admin/categories': '카테고리 관리',
  '/admin/concerns': '고민 관리',
  '/admin/inquiries': '상품문의 관리',
  '/admin/insurance': '펫보험 상담 관리',
  '/admin/insurance-content': '보험 동의 문서',
  '/admin/kits': '케어 키트 관리',
  '/admin/members': '회원 관리',
  '/admin/notices': '공지사항 관리',
  '/admin/order-policy': '주문 정책',
  '/admin/orders': '주문 관리',
  '/admin/partner-inquiries': '제휴 문의 접수',
  '/admin/partners': 'B2B 제휴 관리',
  '/admin/products': '상품 관리',
  '/admin/products/display': '진열 관리',
  '/admin/products/new': '새 상품 등록',
  '/admin/qna': '상품 및 일반 문의 관리',
  '/admin/reviews': '후기 관리',
  '/admin/settings': '사이트 콘텐츠 설정',
  '/admin/survey': '맞춤 진단 설계',
  '/admin/survey-results': '진단 참여 내역',
};

// ── 동적 라우트 표본 파라미터 해석 ─────────────────────────────────────────
interface ResolvedSample {
  id: string;
  /** 목록 API 에서 함께 얻은 표시용 필드(anchor 검증에 이름 등이 필요한 라우트용). */
  label?: string;
}

async function resolveSample(
  request: APIRequestContext,
  entry: RouteEntry,
): Promise<ResolvedSample | null> {
  const source = entry.paramSource;
  if (!source) return null;
  const response = await request.get(source.endpoint);
  if (!response.ok()) return null;
  const body = await response.json();
  const list = body[source.listKey];
  if (!Array.isArray(list) || list.length === 0) return null;
  const first = list[0] as Record<string, unknown>;
  const id = first[source.idKey];
  if (typeof id !== 'string') return null;
  const label = typeof first.name === 'string' ? first.name : undefined;
  return { id, label };
}

/** 동적 라우트의 {세그먼트}를 실제 표본 id 로 치환한다(라우트 문자열의 [key] 하나만 있다고 가정). */
function fillRoute(route: string, id: string): string {
  return route.replace(/\[[^\]]+\]/, encodeURIComponent(id));
}

const PUBLIC_DYNAMIC_ANCHORS: Record<string, (page: Page, sample: ResolvedSample) => Promise<void>> = {
  '/brands/[id]': (page) => h1Visible(page),
  '/concerns/[slug]': (page) => h1Visible(page),
  '/notices/[id]': (page) => h1Visible(page),
  '/shop/[id]': (page) => h1Visible(page),
};

const ADMIN_DYNAMIC_ANCHORS: Record<string, (page: Page, sample: ResolvedSample) => Promise<void>> = {
  '/admin/brands/[id]': (page, sample) => textVisible(page, `${sample.label ?? ''} · 상세 편집`),
  '/admin/insurance/[id]': (page) => textVisible(page, '펫보험 상담 상세'),
  '/admin/members/[id]': (page, sample) => textVisible(page, `회원 상세: ${sample.label ?? ''}`),
  '/admin/orders/[id]': (page, sample) => textVisible(page, `주문 상세: ${sample.id}`),
  '/admin/products/[id]': (page) => textVisible(page, '상품 수정'),
  '/admin/products/[id]/editor': (page, sample) => textVisible(page, `${sample.label ?? ''} 상세페이지 편집`),
};

// ── 테스트 본체 ──────────────────────────────────────────────────────────
test.describe('전 페이지 스모크 검수(읽기 전용)', () => {
  test.describe('공개 정적 페이지', () => {
    for (const entry of ALL_APP_ROUTES.filter((r) => r.kind === 'static' && r.auth === 'none')) {
      test(`${entry.route} — ${entry.note}`, async ({ page }) => {
        const capture = attachErrorCapture(page);
        const response = await page.goto(entry.route);
        expect(response?.status(), `${entry.route} HTTP status`).toBeLessThan(400);
        await expectNoErrorBoundary(page, entry.route);

        const anchor = PUBLIC_STATIC_ANCHORS[entry.route];
        expect(anchor, `${entry.route} 앵커 미정의`).toBeDefined();
        await anchor(page);

        assertNoBlockingErrors(capture, entry.route);
      });
    }
  });

  test.describe('리다이렉트가 정상인 페이지(비로그인/무상태 cold visit)', () => {
    for (const entry of ALL_APP_ROUTES.filter((r) => r.auth === 'redirect')) {
      test(`${entry.route} → ${entry.expectedRedirect} — ${entry.note}`, async ({ page }) => {
        await page.goto(entry.route);
        await page.waitForURL((url) => url.pathname.startsWith(entry.expectedRedirect!), { timeout: 15_000 });
      });
    }
  });

  test.describe('공개 동적 페이지(공개 API 로 표본 id 해석)', () => {
    for (const entry of ALL_APP_ROUTES.filter((r) => r.kind === 'dynamic' && r.auth === 'none')) {
      test(`${entry.route} — ${entry.note}`, async ({ page, request }) => {
        const sample = await resolveSample(request, entry);
        test.skip(
          sample === null,
          `공개 API(${entry.paramSource?.endpoint}) 에 표본 데이터가 없어 skip — 목록이 비어 있으면 ` +
            '이 동적 라우트를 실제로 검수할 방법이 없다(loud skip, 원인: 빈 목록).',
        );
        const resolvedPath = fillRoute(entry.route, sample!.id);
        const capture = attachErrorCapture(page);
        const response = await page.goto(resolvedPath);
        expect(response?.status(), `${resolvedPath} HTTP status`).toBeLessThan(400);
        await expectNoErrorBoundary(page, resolvedPath);
        await PUBLIC_DYNAMIC_ANCHORS[entry.route](page, sample!);
        assertNoBlockingErrors(capture, resolvedPath);
      });
    }
  });

  test.describe('관리자 대리 확인 — 비로그인 방문은 /login 으로 막힌다', () => {
    // proxy.ts 의 matcher(/admin/:path*)는 서브경로와 무관하게 동일하게 적용되므로(AGENTS.md
    // §10-7), 28개 관리자 라우트마다 반복하지 않고 대표 경로 하나로 게이트 동작만 확인한다.
    test('/admin (비로그인) → /login?error=admin', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 15_000 });
    });
  });

  test.describe('관리자 정적 페이지(관리자 로그인 후)', () => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* 시크릿 미주입 — 관리자 로그인 불가로 skip');

    let storageStatePath: string;

    test.beforeAll(async ({ browser }) => {
      const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
      await loginAsAdmin(page);
      storageStatePath = path.join(os.tmpdir(), `all-pages-smoke-admin-state-${Date.now()}.json`);
      await page.context().storageState({ path: storageStatePath });
      await page.close();
    });

    test.afterAll(() => {
      if (storageStatePath) fs.rmSync(storageStatePath, { force: true });
    });

    for (const entry of ALL_APP_ROUTES.filter((r) => r.kind === 'static' && r.auth === 'admin')) {
      test(`${entry.route} — ${entry.note}`, async ({ browser }) => {
        const context = await browser.newContext({
          storageState: storageStatePath,
          extraHTTPHeaders: bypassHeaders(),
        });
        const page = await context.newPage();
        const capture = attachErrorCapture(page);
        const response = await page.goto(entry.route);
        expect(response?.status(), `${entry.route} HTTP status`).toBeLessThan(400);
        await expectNoErrorBoundary(page, entry.route);

        const heading = ADMIN_STATIC_HEADINGS[entry.route];
        expect(heading, `${entry.route} 앵커 미정의`).toBeDefined();
        await h1Visible(page, heading);

        assertNoBlockingErrors(capture, entry.route);
        await context.close();
      });
    }

    test.describe('관리자 동적 페이지(관리자 API 로 표본 id 해석)', () => {
      for (const entry of ALL_APP_ROUTES.filter((r) => r.kind === 'dynamic' && r.auth === 'admin')) {
        test(`${entry.route} — ${entry.note}`, async ({ browser }) => {
          const context = await browser.newContext({
            storageState: storageStatePath,
            extraHTTPHeaders: bypassHeaders(),
          });
          const page = await context.newPage();
          const sample = await resolveSample(context.request, entry);
          test.skip(
            sample === null,
            `관리자 API(${entry.paramSource?.endpoint}) 목록이 비어 있어 skip — 표본 없이는 이 동적 ` +
              '라우트를 검수할 방법이 없다(loud skip, 원인: 빈 목록). staging 데이터가 채워지면 자동 해소.',
          );
          const resolvedPath = fillRoute(entry.route, sample!.id);
          const capture = attachErrorCapture(page);
          const response = await page.goto(resolvedPath);
          expect(response?.status(), `${resolvedPath} HTTP status`).toBeLessThan(400);
          await expectNoErrorBoundary(page, resolvedPath);
          await ADMIN_DYNAMIC_ANCHORS[entry.route](page, sample!);
          assertNoBlockingErrors(capture, resolvedPath);
          await context.close();
        });
      }
    });
  });

  test.describe('회원 전용 페이지(회원 로그인 후)', () => {
    test.skip(
      !MEMBER_EMAIL || !MEMBER_PASSWORD,
      'E2E_MEMBER_* 시크릿 미주입(member-e2e@test.baekjo) — 회원 로그인 불가로 skip. ' +
        'CI(golden-crud.yml)에는 아직 이 시크릿이 등록돼 있지 않다(admin-crud-qna-inquiries.spec.ts 와 동일 한계).',
    );

    /** 로그인 폼 셀렉터는 loginAsAdmin(adminCrudHelpers.ts)과 동일 — 계정만 다르다. */
    async function loginAsMember(page: Page): Promise<void> {
      await page.goto('/login');
      await page.locator('input[type="email"]').fill(MEMBER_EMAIL!);
      await page.locator('input[type="password"]').fill(MEMBER_PASSWORD!);
      await page
        .getByRole('button', { name: /로그인/ })
        .first()
        .click();
      await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
    }

    test('/mypage — 마이페이지(개요 탭)', async ({ page }) => {
      await loginAsMember(page);
      const capture = attachErrorCapture(page);
      const response = await page.goto('/mypage');
      expect(response?.status(), '/mypage HTTP status').toBeLessThan(400);
      await expectNoErrorBoundary(page, '/mypage');
      // 개요 탭은 h1 이 아니라 h2(마이페이지 요약) — MypageSidebar/OverviewSection 구조.
      await expect(page.getByRole('heading', { level: 2, name: '마이페이지 요약' })).toBeVisible({
        timeout: 15_000,
      });
      assertNoBlockingErrors(capture, '/mypage');
    });

    test('/mypage — 비로그인 방문은 /login 으로 리다이렉트된다', async ({ page }) => {
      await page.goto('/mypage');
      await page.waitForURL((url) => url.pathname.startsWith('/login'), { timeout: 15_000 });
    });
  });
});
