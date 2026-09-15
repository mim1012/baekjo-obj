import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_BASE_URL = 'http://127.0.0.1:3000';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const LOGIN_WRITE_PATH_PREFIXES = ['/api/auth/', '/login'];

const baseUrl = resolveLocalBaseUrl(process.env.ADMIN_AUDIT_BASE_URL || DEFAULT_BASE_URL);
const email = process.env.E2E_ADMIN_EMAIL;
const password = process.env.E2E_ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error('E2E_ADMIN_EMAIL과 E2E_ADMIN_PASSWORD가 필요합니다. 값은 결과 파일에 기록하지 않습니다.');
}

// 승인된 비PII 관리자 화면만 캡처한다. 주문/회원/문의/보험 신청 같은 고객정보 화면과
// 대시보드·생성·수정·삭제·저장·폼 제출 경로는 제외한다.
const routeSpecs = [
  ['01-products', '/admin/products'],
  ['02-product-display', '/admin/products/display'],
  ['03-categories', '/admin/categories'],
  ['04-brands', '/admin/brands'],
  ['05-concerns', '/admin/concerns'],
  ['06-survey', '/admin/survey'],
  ['07-reviews', '/admin/reviews'],
  ['08-notices', '/admin/notices'],
  ['09-care-kits', '/admin/kits'],
  ['10-order-policy', '/admin/order-policy'],
  ['11-insurance-content', '/admin/insurance-content'],
  ['12-settings', '/admin/settings'],
  ['13-qna-config', '/admin/qna'],
  ['14-partners', '/admin/partners'],
  ['15-sellers', '/admin/sellers'],
];

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const outputDir = path.resolve('artifacts', `admin-screen-audit-${stamp}`);
const viewportDir = path.join(outputDir, 'viewport');
const fullDir = path.join(outputDir, 'full');
await mkdir(viewportDir, { recursive: true });
await mkdir(fullDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
  colorScheme: 'light',
});
await installRequestSafetyGuard(context, baseUrl, { allowAuthWrites: true });
const page = await context.newPage();
await page.emulateMedia({ reducedMotion: 'reduce' });

const browserErrors = [];
let activeRoute = 'login';
page.on('pageerror', (error) => browserErrors.push({ route: activeRoute, type: 'pageerror', message: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error') {
    browserErrors.push({ route: activeRoute, type: 'console', message: message.text() });
  }
});

try {
  await page.goto(`${baseUrl}/login?redirect=%2Fadmin%2Fproducts`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
  await page.waitForLoadState('domcontentloaded');

  assertLocalUrl(page.url());
  if (!new URL(page.url()).pathname.startsWith('/admin')) {
    throw new Error(`관리자 로그인 후 예상하지 못한 주소로 이동했습니다: ${redactUrl(page.url())}`);
  }

  const meResponse = await context.request.get(`${baseUrl}/api/members/me`);
  const me = meResponse.ok() ? await meResponse.json() : null;
  if (!meResponse.ok() || me?.user?.role !== 'admin' || me?.user?.status !== 'active') {
    throw new Error(`관리자 세션 확인 실패: HTTP ${meResponse.status()}, role=${me?.user?.role ?? '없음'}, status=${me?.user?.status ?? '없음'}`);
  }
  await settle(page);

  const records = [];
  for (const [name, route] of routeSpecs) {
    activeRoute = route;
    const errorStart = browserErrors.length;
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await settle(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);

    const actualUrl = page.url();
    assertLocalUrl(actualUrl);
    const title = await page.title();
    const heading = await page.locator('h1, h2').first().textContent().catch(() => null);
    const alerts = await page.locator('[role="alert"]').allTextContents().catch(() => []);
    const pageMetrics = await page.evaluate(() => ({
      bodyText: document.body.innerText.slice(0, 20_000),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      documentHeight: document.documentElement.scrollHeight,
    }));

    const viewportPath = path.join(viewportDir, `${name}.png`);
    const fullPath = path.join(fullDir, `${name}.png`);
    await page.screenshot({ path: viewportPath, fullPage: false, animations: 'disabled' });
    await page.screenshot({ path: fullPath, fullPage: true, animations: 'disabled' });

    const issueSignals = [];
    const actualPath = new URL(actualUrl).pathname;
    if (actualPath.startsWith('/login')) issueSignals.push('관리자 로그인 화면으로 되돌아감');
    if (response && response.status() >= 400) issueSignals.push(`문서 HTTP ${response.status()}`);
    if (/Internal Server Error|Application error|Unhandled Runtime Error/i.test(pageMetrics.bodyText)) {
      issueSignals.push('런타임 오류 문구 표시');
    }
    if (pageMetrics.documentWidth > pageMetrics.viewportWidth + 2) issueSignals.push('데스크톱 가로 넘침');

    records.push({
      name,
      requestedRoute: route,
      actualUrl: redactUrl(actualUrl),
      httpStatus: response?.status() ?? null,
      title,
      heading: heading?.trim() || null,
      alerts: alerts.map((value) => value.trim()).filter(Boolean),
      dimensions: {
        width: pageMetrics.documentWidth,
        height: pageMetrics.documentHeight,
        viewportWidth: pageMetrics.viewportWidth,
      },
      browserErrors: browserErrors.slice(errorStart),
      issueSignals,
      screenshots: {
        viewport: path.relative(outputDir, viewportPath).replaceAll('\\', '/'),
        full: path.relative(outputDir, fullPath).replaceAll('\\', '/'),
      },
    });
  }

  await makeContactSheet(context, outputDir, records.slice(0, 8), 'contact-sheet-1.png', '관리자 승인 화면 캡처 1/2');
  await makeContactSheet(context, outputDir, records.slice(8), 'contact-sheet-2.png', '관리자 승인 화면 캡처 2/2');

  const summary = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    readOnly: true,
    approvedPages: routeSpecs.map(([, route]) => route),
    excludedSensitivePages: [
      '/admin/orders',
      '/admin',
      '/admin/members',
      '/admin/inquiries',
      '/admin/partner-inquiries',
      '/admin/insurance',
      '/admin/survey-results',
    ],
    adminSession: { role: me.user.role, status: me.user.status ?? null },
    totals: {
      screens: records.length,
      routeIssues: records.filter((record) => record.issueSignals.length > 0).length,
      browserErrors: browserErrors.length,
    },
    records,
  };
  await writeFile(path.join(outputDir, 'audit.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(
    path.join(outputDir, 'README.md'),
    `# 관리자 승인 화면 캡처 감사\n\n- 실행 시각: ${summary.capturedAt}\n- 대상: ${baseUrl}\n- 방식: localhost 관리자 로그인 후 승인된 비PII 화면만 읽기 전용 진입\n- 화면 수: ${records.length}\n- 화면 오류 신호: ${summary.totals.routeIssues}\n- 브라우저 오류: ${summary.totals.browserErrors}\n\n전체 화면은 \`full/\`, 첫 화면은 \`viewport/\`, 판정 원문은 \`audit.json\`에 있습니다.\n`,
    'utf8',
  );

  console.log(JSON.stringify({ outputDir, ...summary.totals }, null, 2));
} finally {
  await browser.close();
}

function resolveLocalBaseUrl(rawBaseUrl) {
  if (!URL.canParse(rawBaseUrl)) {
    throw new Error('캡처 대상 URL 형식이 올바르지 않습니다.');
  }
  const target = new URL(rawBaseUrl);
  if ((target.protocol !== 'http:' && target.protocol !== 'https:') || !LOOPBACK_HOSTS.has(target.hostname.toLowerCase())) {
    throw new Error('캡처 대상은 localhost 또는 127.0.0.1만 허용됩니다. Production/Preview/원격 URL은 차단됩니다.');
  }
  target.hash = '';
  target.search = '';
  return target.toString().replace(/\/$/, '');
}

function assertLocalUrl(rawUrl) {
  const target = new URL(rawUrl);
  if (!LOOPBACK_HOSTS.has(target.hostname.toLowerCase())) {
    throw new Error(`원격 이동이 차단되었습니다: ${redactUrl(rawUrl)}`);
  }
}

async function installRequestSafetyGuard(context, rootUrl, options) {
  const root = new URL(rootUrl);
  await context.route('**/*', async (route) => {
    const request = route.request();
    const target = new URL(request.url());
    if (!LOOPBACK_HOSTS.has(target.hostname.toLowerCase())) {
      await route.abort('blockedbyclient');
      return;
    }
    if (target.origin !== root.origin) {
      await route.abort('blockedbyclient');
      return;
    }
    if (READ_METHODS.has(request.method())) {
      await route.continue();
      return;
    }
    if (options.allowAuthWrites && LOGIN_WRITE_PATH_PREFIXES.some((prefix) => target.pathname.startsWith(prefix))) {
      await route.continue();
      return;
    }
    await route.abort('blockedbyclient');
  });
}

function redactUrl(rawUrl) {
  const target = new URL(rawUrl);
  target.username = '';
  target.password = '';
  target.search = '';
  target.hash = '';
  return target.toString();
}

async function settle(targetPage) {
  await targetPage.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  await targetPage.waitForTimeout(500);
}

async function makeContactSheet(context, rootDir, recordsForSheet, fileName, title) {
  const cards = [];
  for (const record of recordsForSheet) {
    const imageBytes = await readFile(path.join(rootDir, record.screenshots.viewport));
    const imageUrl = `data:image/png;base64,${imageBytes.toString('base64')}`;
    const status = record.issueSignals.length === 0 ? '정상 진입' : record.issueSignals.join(' · ');
    cards.push(`
      <article>
        <div class="label"><strong>${record.requestedRoute}</strong><span>${status}</span></div>
        <img src="${imageUrl}" alt="${record.requestedRoute}">
      </article>`);
  }

  const sheet = await context.newPage();
  await sheet.setViewportSize({ width: 1500, height: 1000 });
  await sheet.setContent(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
    *{box-sizing:border-box}body{margin:0;padding:24px;background:#e8e6df;color:#17211d;font-family:Arial,'Malgun Gothic',sans-serif}
    h1{margin:0 0 18px;font-size:28px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
    article{overflow:hidden;border:1px solid #bbb9b0;background:#fff;box-shadow:0 2px 8px #0001}
    .label{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 13px;border-bottom:1px solid #ddd;background:#f8f7f2;font-size:14px}
    .label span{font-size:12px;color:#526057}img{display:block;width:100%;height:470px;object-fit:cover;object-position:top left}
  </style></head><body><h1>${title}</h1><main class="grid">${cards.join('')}</main></body></html>`, { waitUntil: 'load' });
  await sheet.screenshot({ path: path.join(rootDir, fileName), fullPage: true, animations: 'disabled' });
  await sheet.close();
}
