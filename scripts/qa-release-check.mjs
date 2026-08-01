import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
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
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {});
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
  for (const viewport of viewports) {
    for (const route of routes) {
      await collectPage(browser, viewport, route);
    }
  }
  await testInteractions(browser);
  await testNetworkFailure(browser);
  await testLinks(browser);
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
  console.log(JSON.stringify({ outDir, findings: findings.length, critical: findings.filter((f) => f.severity === 'critical').length, high: findings.filter((f) => f.severity === 'high').length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
