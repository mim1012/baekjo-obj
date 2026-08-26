import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const targetHost = new URL(baseURL).hostname.toLowerCase();
const productionHosts = new Set([
  'www.baekjo-objet.com',
  'baekjo-objet.com',
  'baekjo-obj.vercel.app',
]);

class UnsafeProductionTargetError extends Error {
  constructor(host) {
    super(
      `Production release QA target ${host} is blocked. ` +
        'Set ALLOW_PRODUCTION_QA=I_ACCEPT_PRODUCTION_COST only after explicit user approval.',
    );
    this.name = 'UnsafeProductionTargetError';
  }
}

if (
  productionHosts.has(targetHost) &&
  process.env.ALLOW_PRODUCTION_QA !== 'I_ACCEPT_PRODUCTION_COST'
) {
  throw new UnsafeProductionTargetError(targetHost);
}
const today = new Date().toISOString().slice(0, 10);
const outDir = path.resolve(`.gstack/qa-reports/release-qa-${today}`);
fs.mkdirSync(path.join(outDir, 'screenshots'), { recursive: true });

const viewports = [
  { name: 'desktop', width: 1440, height: 1000, isMobile: false },
  { name: 'tablet', width: 768, height: 1024, isMobile: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true },
];

const routes = [
  '/',
  '/shop',
  '/cart',
  '/checkout',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/mypage',
  '/not-a-real-page-release-qa',
];

const accessibilityRoutes = ['/', '/shop', '/login', '/signup', '/forgot-password'];
const clientSecretPatterns = [
  'SUPABASE_SECRET_KEY',
  'SMTP_GMAIL_APP_PASSWORD',
  'TOSS_SECRET_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'sb_secret_',
  'test_gsk_',
  'live_gsk_',
];
const cartStorageKey = 'baekjo_cart';

const findings = [];
const observations = [];
const extraHTTPHeaders = process.env.VERCEL_AUTOMATION_BYPASS
  ? { 'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS }
  : undefined;

function addFinding(severity, category, title, details) {
  findings.push({ severity, category, title, details });
}

function slug(input) {
  return input.replace(/[^a-z0-9가-힣]+/gi, '-').replace(/^-|-$/g, '') || 'root';
}

function isToolingNoise(text) {
  return (
    /favicon|React DevTools|Failed to load resource.*(404|401)/i.test(text) ||
    (/hydrated but some attributes/i.test(text) && /caret-color:\\"transparent\\"|caret-color:"transparent"/i.test(text))
  );
}

function severityFromAxeImpact(impact) {
  if (impact === 'critical' || impact === 'serious') return 'high';
  if (impact === 'moderate') return 'medium';
  return 'low';
}

function safeDetails(value, limit = 900) {
  return String(value).replace(/\s+/g, ' ').trim().slice(0, limit);
}

async function snapshot(page, name) {
  const file = path.join(outDir, 'screenshots', `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function collectPage(browser, viewport, route) {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders,
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    hasTouch: viewport.isMobile,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('requestfailed', (req) => {
    const failure = req.failure();
    failedRequests.push(`${req.method()} ${req.url()} ${failure?.errorText ?? ''}`.trim());
  });

  const started = Date.now();
  let status = null;
  let bodyText = '';
  let title = '';
  try {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    status = response?.status() ?? null;
    await page.waitForLoadState('networkidle', { timeout: 4_000 }).catch(() => {});
    title = await page.title().catch(() => '');
    bodyText = await page.locator('body').innerText({ timeout: 5_000 }).catch(() => '');
    await snapshot(page, `${viewport.name}-${slug(route)}`);
  } catch (error) {
    addFinding('critical', 'load', `${viewport.name} ${route} 로드 실패`, String(error));
  }

  const durationMs = Date.now() - started;
  if (route !== '/not-a-real-page-release-qa' && status && status >= 500) {
    addFinding('critical', 'load', `${viewport.name} ${route} 서버 오류`, `HTTP ${status}`);
  }
  if (route !== '/not-a-real-page-release-qa' && /Application error|client-side exception|Internal Server Error/i.test(bodyText)) {
    addFinding('critical', 'runtime', `${viewport.name} ${route} 에러 화면 노출`, bodyText.slice(0, 500));
  }
  if (pageErrors.length > 0) {
    addFinding('high', 'console', `${viewport.name} ${route} pageerror`, pageErrors.join(' || '));
  }
  const blockingConsoleErrors = consoleErrors.filter((text) => !isToolingNoise(text));
  if (blockingConsoleErrors.length > 0) {
    addFinding('high', 'console', `${viewport.name} ${route} console.error`, blockingConsoleErrors.join(' || '));
  }
  const visibleTextLength = bodyText.trim().length;
  if (route !== '/not-a-real-page-release-qa' && visibleTextLength < 30) {
    addFinding('high', 'empty-state', `${viewport.name} ${route} 본문이 비어 보임`, `visibleTextLength=${visibleTextLength}, title=${title}`);
  }
  observations.push({
    viewport: viewport.name,
    route,
    status,
    durationMs,
    consoleErrors,
    pageErrors,
    failedRequests,
    title,
    bodySample: bodyText.slice(0, 180),
  });
  await context.close();
}

async function testInteractions(browser) {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.goto('/login');
  await page.getByRole('button', { name: /로그인/ }).first().click();
  await snapshot(page, 'interaction-login-empty');
  if (!/입력|필수|required|이메일|비밀번호/i.test(await page.locator('body').innerText())) {
    addFinding('medium', 'form-validation', '로그인 빈 입력 안내가 불명확함', '빈 제출 후 사용자에게 보이는 검증 문구가 확인되지 않음');
  }
  await page.locator('input[type="email"]').fill('wrong-format');
  await page.locator('input[type="password"]').fill('x');
  await page.getByRole('button', { name: /로그인/ }).first().click();
  await page.waitForTimeout(700);
  await snapshot(page, 'interaction-login-invalid');

  await page.goto('/signup');
  await page.getByRole('button', { name: /가입|회원가입/ }).last().click();
  await snapshot(page, 'interaction-signup-empty');
  const signupText = await page.locator('body').innerText();
  if (!/이메일|비밀번호|필수|required|입력/i.test(signupText)) {
    addFinding('medium', 'form-validation', '회원가입 빈 입력 안내가 불명확함', '빈 제출 후 사용자에게 보이는 검증 문구가 확인되지 않음');
  }
  const longName = '매우긴이름'.repeat(30);
  await page.getByLabel(/이름/).fill(longName).catch(() => {});
  await page.locator('input[type="email"]').first().fill('release-qa-invalid-email');
  await page.locator('input[type="password"]').first().fill('123');
  await page.locator('input[type="password"]').nth(1).fill('456');
  await page.getByRole('button', { name: /가입|회원가입/ }).last().click();
  await page.waitForTimeout(700);
  await snapshot(page, 'interaction-signup-invalid-long');

  await page.goto('/forgot-password');
  await page.getByRole('button').filter({ hasText: /재설정|찾기|발송|받기/ }).first().click().catch(() => {});
  await page.waitForTimeout(700);
  await snapshot(page, 'interaction-forgot-empty');

  await page.goto('/shop');
  const firstProduct = page.locator('a[href^="/shop/"]').first();
  if (await firstProduct.count()) {
    await firstProduct.click();
    await page.waitForLoadState('domcontentloaded');
    await snapshot(page, 'interaction-product-detail');
    const cartButtons = page.getByRole('button', { name: /장바구니/ });
    if (await cartButtons.count()) {
      await Promise.allSettled([cartButtons.first().click(), cartButtons.first().click()]);
      await page.waitForTimeout(1000);
      await snapshot(page, 'interaction-product-double-cart-click');
    }
  } else {
    addFinding('high', 'data-empty', '상점에 상품 카드가 없음', '/shop에서 /shop/[id] 링크를 찾지 못함');
  }

  await page.goto('/mypage');
  await page.waitForLoadState('domcontentloaded');
  await snapshot(page, 'interaction-mypage-guest');
  const mypageText = await page.locator('body').innerText();
  if (!/로그인|권한|다시 만나|마이페이지/i.test(mypageText)) {
    addFinding('high', 'auth', '비로그인 마이페이지 권한 상태가 불명확함', mypageText.slice(0, 300));
  }

  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await snapshot(page, 'interaction-keyboard-focus');
  const activeTag = await page.evaluate(() => {
    const el = document.activeElement;
    return el ? `${el.tagName.toLowerCase()} ${el.getAttribute('href') ?? el.getAttribute('type') ?? ''}` : '';
  });
  observations.push({ viewport: 'desktop', route: 'keyboard-focus', activeTag, errors });
  if (!activeTag || activeTag.startsWith('body')) {
    addFinding('medium', 'accessibility', '키보드 포커스 이동 증거 부족', `activeElement=${activeTag}`);
  }

  const duplicateErrors = errors.filter((text) => !isToolingNoise(text));
  if (duplicateErrors.length > 0) {
    addFinding('high', 'console', '상호작용 중 console/page error', duplicateErrors.join(' || '));
  }
  await context.close();
}

async function testNetworkFailure(browser) {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.route('**/api/products**', (route) => route.abort('failed'));
  await page.goto('/shop', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await snapshot(page, 'network-failure-shop-products');
  const text = await page.locator('body').innerText().catch(() => '');
  if (/Application error|client-side exception/i.test(text)) {
    addFinding('critical', 'network-failure', '상품 API 실패 시 앱 에러 화면', text.slice(0, 500));
  } else if (!/오류|실패|다시|상품|준비|없/i.test(text)) {
    addFinding('medium', 'network-failure', '상품 API 실패 상태 안내가 약함', text.slice(0, 300));
  }
  await context.close();
}

async function testCartAndCheckoutResilience(browser) {
  const malformedContext = await browser.newContext({
    baseURL,
    extraHTTPHeaders,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await malformedContext.addInitScript(
    ({ key }) => {
      localStorage.setItem(key, '{release-qa-bad-json');
    },
    { key: cartStorageKey },
  );
  const malformedPage = await malformedContext.newPage();
  const malformedErrors = [];
  malformedPage.on('console', (msg) => {
    if (msg.type() === 'error') malformedErrors.push(msg.text());
  });
  malformedPage.on('pageerror', (err) => malformedErrors.push(err.message));
  await malformedPage.goto('/cart', { waitUntil: 'domcontentloaded' });
  await malformedPage.waitForTimeout(1200);
  await snapshot(malformedPage, 'cart-malformed-localstorage');
  const malformedText = await malformedPage.locator('body').innerText().catch(() => '');
  const malformedStorage = await malformedPage.evaluate((key) => localStorage.getItem(key), cartStorageKey).catch(() => null);
  if (/Application error|client-side exception/i.test(malformedText)) {
    addFinding('critical', 'cart-resilience', '손상된 장바구니 저장소가 카트 화면을 깨뜨림', malformedText.slice(0, 500));
  }
  if (malformedStorage === '{release-qa-bad-json') {
    addFinding('high', 'cart-resilience', '손상된 장바구니 저장소가 자가 복구되지 않음', `localStorage.${cartStorageKey}=${malformedStorage}`);
  }
  const malformedBlockingErrors = malformedErrors.filter((text) => !isToolingNoise(text));
  if (malformedBlockingErrors.length > 0) {
    addFinding('high', 'cart-resilience', '손상된 장바구니 저장소 처리 중 console/page error', malformedBlockingErrors.join(' || '));
  }
  await malformedContext.close();

  const checkoutContext = await browser.newContext({
    baseURL,
    extraHTTPHeaders,
    viewport: { width: 768, height: 1024 },
  });
  await checkoutContext.addInitScript(
    ({ key }) => {
      localStorage.setItem(key, '{release-qa-bad-json');
    },
    { key: cartStorageKey },
  );
  const checkoutPage = await checkoutContext.newPage();
  const checkoutErrors = [];
  checkoutPage.on('console', (msg) => {
    if (msg.type() === 'error') checkoutErrors.push(msg.text());
  });
  checkoutPage.on('pageerror', (err) => checkoutErrors.push(err.message));
  await checkoutPage.goto('/checkout', { waitUntil: 'domcontentloaded' });
  await checkoutPage.waitForTimeout(1500);
  await snapshot(checkoutPage, 'checkout-malformed-localstorage-guest');
  const checkoutText = await checkoutPage.locator('body').innerText().catch(() => '');
  if (/Application error|client-side exception/i.test(checkoutText)) {
    addFinding('critical', 'checkout-resilience', '손상된 장바구니 저장소가 체크아웃 화면을 깨뜨림', checkoutText.slice(0, 500));
  }
  const checkoutBlockingErrors = checkoutErrors.filter((text) => !isToolingNoise(text));
  if (checkoutBlockingErrors.length > 0) {
    addFinding('high', 'checkout-resilience', '손상된 장바구니 체크아웃 처리 중 console/page error', checkoutBlockingErrors.join(' || '));
  }
  await checkoutContext.close();

  const failureContext = await browser.newContext({
    baseURL,
    extraHTTPHeaders,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await failureContext.addInitScript(
    ({ key }) => {
      localStorage.setItem(key, JSON.stringify([{ productId: 'release-qa-product', quantity: 2 }]));
    },
    { key: cartStorageKey },
  );
  const failurePage = await failureContext.newPage();
  await failurePage.route('**/api/products**', (route) => route.abort('failed'));
  await failurePage.goto('/cart', { waitUntil: 'domcontentloaded' });
  await failurePage.waitForTimeout(1500);
  await snapshot(failurePage, 'cart-products-api-failure-preserves-storage');
  const storageAfterFailure = await failurePage.evaluate((key) => localStorage.getItem(key), cartStorageKey).catch(() => null);
  if (!storageAfterFailure || !storageAfterFailure.includes('release-qa-product')) {
    addFinding('critical', 'network-failure', '상품 API 실패 시 기존 장바구니가 사라짐', `storage=${storageAfterFailure}`);
  }
  await failureContext.close();
}

async function testOrderAndPaymentApiFailures(browser) {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const orderResponse = await page.request.post('/api/orders', {
    failOnStatusCode: false,
    data: {
      items: [{ productId: 'release-qa-product', quantity: 1 }],
      customer: { name: '릴리즈QA', phone: '010-0000-0000', address: '서울시 테스트구' },
      paymentMethod: 'bank',
      pricing: { productsTotal: 1, deliveryFee: 0, total: 1 },
    },
  });
  if (![401, 403].includes(orderResponse.status())) {
    addFinding('high', 'order-api-failure', '비로그인 주문 생성이 권한 오류로 막히지 않음', `HTTP ${orderResponse.status()}: ${safeDetails(await orderResponse.text())}`);
  }

  const confirmResponse = await page.request.post('/api/payments/confirm', {
    failOnStatusCode: false,
    data: { paymentKey: '', orderId: '', amount: 'not-a-number' },
  });
  if (confirmResponse.status() >= 500) {
    addFinding('critical', 'payment-api-failure', '결제 승인 API가 잘못된 입력에서 서버 오류를 냄', `HTTP ${confirmResponse.status()}: ${safeDetails(await confirmResponse.text())}`);
  } else if (confirmResponse.status() !== 400) {
    addFinding('medium', 'payment-api-failure', '결제 승인 API 잘못된 입력 응답이 불명확함', `HTTP ${confirmResponse.status()}: ${safeDetails(await confirmResponse.text())}`);
  }

  const returnResponse = await page.request.get('/api/payments/return?paymentKey=&orderId=&amount=bad', {
    failOnStatusCode: false,
    maxRedirects: 0,
  });
  const location = returnResponse.headers().location ?? '';
  if (returnResponse.status() >= 500 || !location.includes('/order-complete') || !location.includes('status=invalid')) {
    addFinding('high', 'payment-return', '결제 복귀 URL이 잘못된 입력을 안전하게 완료 화면으로 보내지 않음', `HTTP ${returnResponse.status()}, location=${location}`);
  }
  observations.push({
    viewport: 'api',
    route: 'order-payment-failure-apis',
    orderStatus: orderResponse.status(),
    confirmStatus: confirmResponse.status(),
    returnStatus: returnResponse.status(),
    returnLocation: location,
  });
  await context.close();
}

async function testAccessibility(browser) {
  const context = await browser.newContext({
    baseURL,
    extraHTTPHeaders,
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();

  for (const route of accessibilityRoutes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 4_000 }).catch(() => {});
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const violations = results.violations.filter((violation) => violation.impact !== 'minor');
    observations.push({
      viewport: 'desktop',
      route: `accessibility:${route}`,
      violations: violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.length,
      })),
    });

    for (const violation of violations) {
      const severity = severityFromAxeImpact(violation.impact);
      const sampleNodes = violation.nodes
        .slice(0, 3)
        .map((node) => `${node.target.join(', ')} :: ${safeDetails(node.failureSummary ?? node.html, 220)}`)
        .join(' || ');
      addFinding(
        severity,
        'accessibility',
        `${route} 접근성 위반: ${violation.id}`,
        `${violation.help} (${violation.impact}, nodes=${violation.nodes.length}) ${sampleNodes}`,
      );
    }
  }

  await context.close();
}

async function runStep(name, fn) {
  console.error(`[release-qa] ${name}`);
  await fn();
}

async function testAuthApiFailures(browser) {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.route('**/api/members', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'release-qa-forced-failure' }),
    });
  });
  await page.goto('/signup');
  await page.getByLabel(/이름/).fill('릴리즈QA');
  await page.getByLabel(/연락처/).fill('010-0000-0000');
  await page.locator('input[type="email"]').first().fill(`release-qa-${Date.now()}@example.com`);
  await page.locator('input[type="password"]').first().fill('release-qa-password');
  await page.locator('input[type="password"]').nth(1).fill('release-qa-password');
  await page.getByRole('checkbox').first().check();
  await page.getByRole('checkbox').nth(1).check();
  await page.getByRole('button', { name: /회원가입/ }).last().click();
  await page.waitForTimeout(800);
  await snapshot(page, 'auth-failure-signup-api-500');
  const signupText = await page.locator('body').innerText();
  if (!/잠시 후|다시 시도|오류|문제/i.test(signupText)) {
    addFinding('high', 'auth-api-failure', '회원가입 API 실패 안내가 보이지 않음', signupText.slice(0, 400));
  }

  await page.unroute('**/api/members');
  await page.route('**/api/members/password-reset/request', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'release-qa-forced-failure' }),
    });
  });
  await page.goto('/forgot-password');
  await page.locator('input[type="email"]').fill('release-qa@example.com');
  await page.getByRole('button', { name: /재설정|보내기/ }).click();
  await page.waitForTimeout(800);
  await snapshot(page, 'auth-failure-forgot-password-api-500');
  const forgotText = await page.locator('body').innerText();
  if (!/잠시 후|다시 시도|오류|문제/i.test(forgotText)) {
    addFinding('high', 'auth-api-failure', '비밀번호 재설정 API 실패 안내가 보이지 않음', forgotText.slice(0, 400));
  }

  const blockingErrors = errors.filter((text) => !isToolingNoise(text));
  const unexpectedErrors = blockingErrors.filter((text) => !/Failed to load resource: the server responded with a status of 500/i.test(text));
  if (unexpectedErrors.length > 0) {
    addFinding('high', 'console', '인증 실패 플로우 중 console/page error', unexpectedErrors.join(' || '));
  }
  await context.close();
}

async function testSlowAuthNetwork(browser) {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders, viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.route('**/api/members/password-reset/request', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1_500));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true }),
    });
  });
  await page.goto('/forgot-password');
  await page.locator('input[type="email"]').fill('slow-release-qa@example.com');
  const button = page.getByRole('button', { name: /재설정|보내기/ });
  await button.click();
  await page.waitForTimeout(250);
  const pendingText = await page.locator('body').innerText();
  const disabledDuringRequest = await page.getByRole('button', { name: /전송 중|재설정|보내기/ }).isDisabled().catch(() => false);
  await snapshot(page, 'slow-network-forgot-password-pending');
  if (!disabledDuringRequest || !/전송 중/i.test(pendingText)) {
    addFinding('medium', 'slow-network', '느린 비밀번호 재설정 요청 중 중복 클릭 방어가 약함', `disabled=${disabledDuringRequest}, text=${pendingText.slice(0, 300)}`);
  }
  await page.getByRole('status').waitFor({ timeout: 5_000 }).catch(() => {});
  const doneText = await page.locator('body').innerText();
  if (!/재설정 링크|메일함/i.test(doneText)) {
    addFinding('medium', 'slow-network', '느린 비밀번호 재설정 성공 후 완료 상태가 보이지 않음', doneText.slice(0, 300));
  }
  await context.close();
}

async function testClientSecretExposure(browser) {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2_000);
  const html = await page.content();
  const exposedInHtml = clientSecretPatterns.filter((pattern) => html.includes(pattern));
  if (exposedInHtml.length > 0) {
    addFinding('critical', 'security', 'HTML에 서버 비밀키 이름/값이 노출됨', exposedInHtml.join(', '));
  }

  const exposedScripts = await page.evaluate(async (patterns) => {
    const urls = [...new Set([...document.scripts].map((script) => script.src).filter((src) => src.includes('/_next/static/')))];
    const hitsByUrl = [];
    for (const url of urls.slice(0, 20)) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 5_000);
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) continue;
        const body = await response.text();
        const hits = patterns.filter((pattern) => body.includes(pattern));
        if (hits.length > 0) hitsByUrl.push(`${url}: ${hits.join(', ')}`);
      } catch {
        continue;
      } finally {
        window.clearTimeout(timeout);
      }
    }
    return hitsByUrl;
  }, clientSecretPatterns);
  if (exposedScripts.length > 0) {
    addFinding('critical', 'security', '클라이언트 번들에 서버 비밀키 이름/값이 노출됨', exposedScripts.slice(0, 10).join(' || '));
  }
  observations.push({ viewport: 'desktop', route: 'client-secret-exposure', scriptsChecked: exposedScripts.length });
  await context.close();
}

async function testLinks(browser) {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders, viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto('/');
  const links = await page.locator('a[href]').evaluateAll((anchors) =>
    anchors.map((a) => a.getAttribute('href')).filter(Boolean).slice(0, 80),
  );
  const internalLinks = [...new Set(links.filter((href) => href.startsWith('/')))];
  for (const href of internalLinks.slice(0, 30)) {
    try {
      const response = await page.request.get(href, { failOnStatusCode: false, timeout: 10_000 });
      if (response.status() >= 500) {
        addFinding('high', 'links', `내부 링크 ${href} 서버 오류`, `HTTP ${response.status()}`);
      }
    } catch (error) {
      addFinding('medium', 'links', `내부 링크 ${href} 확인 지연/실패`, String(error));
    }
  }
  observations.push({ viewport: 'desktop', route: 'home-links', checked: internalLinks.slice(0, 30) });
  await context.close();
}

async function main() {
  const windowsChromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const executablePath =
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
    (process.platform === 'win32' && fs.existsSync(windowsChromePath) ? windowsChromePath : undefined);
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ['--disable-extensions', '--disable-component-extensions-with-background-pages'],
  });
  await runStep('responsive route sweep', async () => {
    for (const viewport of viewports) {
      for (const route of routes) {
        await collectPage(browser, viewport, route);
      }
    }
  });
  await runStep('interactive negative paths', () => testInteractions(browser));
  await runStep('network failure states', () => testNetworkFailure(browser));
  await runStep('cart and checkout resilience', () => testCartAndCheckoutResilience(browser));
  await runStep('order and payment API failures', () => testOrderAndPaymentApiFailures(browser));
  await runStep('axe accessibility scan', () => testAccessibility(browser));
  await runStep('auth API failure states', () => testAuthApiFailures(browser));
  await runStep('slow auth network state', () => testSlowAuthNetwork(browser));
  await runStep('client secret exposure scan', () => testClientSecretExposure(browser));
  await runStep('internal link scan', () => testLinks(browser));
  await browser.close();

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const report = {
    baseURL,
    date: today,
    checkedViewports: viewports,
    routes,
    findings,
    observations,
  };
  fs.writeFileSync(path.join(outDir, 'baseline.json'), JSON.stringify(report, null, 2), 'utf8');
  const md = [
    '# Release QA Report',
    '',
    `- Base URL: ${baseURL}`,
    `- Date: ${today}`,
    `- Findings: critical ${findings.filter((f) => f.severity === 'critical').length}, high ${findings.filter((f) => f.severity === 'high').length}, medium ${findings.filter((f) => f.severity === 'medium').length}, low ${findings.filter((f) => f.severity === 'low').length}`,
    '',
    '## Findings',
    '',
    ...findings.map((f, i) => `### ISSUE-${String(i + 1).padStart(3, '0')} [${f.severity}] ${f.title}\n- Category: ${f.category}\n- Details: ${f.details}`),
    '',
    '## Observations',
    '',
    ...observations.map((o) => `- ${o.viewport} ${o.route}: status=${o.status ?? 'n/a'}, duration=${o.durationMs ?? 'n/a'}ms, consoleErrors=${o.consoleErrors?.length ?? o.errors?.length ?? 0}, pageErrors=${o.pageErrors?.length ?? 0}`),
  ].join('\n');
  fs.writeFileSync(path.join(outDir, `qa-report-${slug(baseURL)}-${today}.md`), md, 'utf8');
  const critical = findings.filter((f) => f.severity === 'critical').length;
  const high = findings.filter((f) => f.severity === 'high').length;
  console.log(JSON.stringify({ outDir, findings: findings.length, critical, high }, null, 2));
  if (critical > 0 || high > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
