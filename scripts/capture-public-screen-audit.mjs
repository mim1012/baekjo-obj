import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = (process.env.PUBLIC_AUDIT_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const outputDir = path.resolve('artifacts', `public-screen-audit-${stamp}`);
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
const page = await context.newPage();
await page.emulateMedia({ reducedMotion: 'reduce' });

const browserErrors = [];
let activeRoute = 'discovery';
page.on('pageerror', (error) => browserErrors.push({ route: activeRoute, type: 'pageerror', message: error.message }));
page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push({ route: activeRoute, type: 'console', message: message.text() });
});

async function settle() {
  await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(500);
}

async function discoverDetail(listRoute, prefix) {
  activeRoute = `${listRoute} detail discovery`;
  await page.goto(`${baseUrl}${listRoute}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await settle();
  const hrefs = await page.locator(`a[href^="${prefix}/"]`).evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.getAttribute('href')).filter(Boolean),
  );
  return hrefs.find((href) => href && new URL(href, baseUrl).pathname.split('/').filter(Boolean).length === 2) ?? null;
}

try {
  const productDetail = await discoverDetail('/shop', '/shop');
  const brandDetail = await discoverDetail('/brands', '/brands');
  const concernDetail = await discoverDetail('/concerns', '/concerns');
  const noticeDetail = await discoverDetail('/notices', '/notices');

  const routeSpecs = [
    ['01-home', '/'],
    ['02-shop', '/shop'],
    ...(productDetail ? [['03-product-detail', productDetail]] : []),
    ['04-brands', '/brands'],
    ...(brandDetail ? [['05-brand-detail', brandDetail]] : []),
    ['06-reviews', '/reviews'],
    ['07-concerns', '/concerns'],
    ...(concernDetail ? [['08-concern-detail', concernDetail]] : []),
    ['09-audit', '/audit'],
    ['10-experts', '/experts'],
    ['11-notices', '/notices'],
    ...(noticeDetail ? [['12-notice-detail', noticeDetail]] : []),
    ['13-diagnosis', '/diagnosis'],
    ['14-diagnosis-result', '/diagnosis/result'],
    ['15-b2b', '/b2b'],
    ['16-care-kit', '/landing/care-kit'],
    ['17-cart', '/cart'],
    ['18-checkout', '/checkout'],
    ['19-order-complete', '/order-complete'],
    ['20-login', '/login'],
    ['21-signup', '/signup'],
    ['22-forgot-password', '/forgot-password'],
    ['23-reset-password', '/reset-password'],
    ['24-verify-email', '/verify-email'],
    ['25-auth-complete', '/auth/complete'],
    ['26-mypage-guard', '/mypage'],
    ['27-partner-orders-guard', '/partner/orders'],
    ['28-terms', '/terms'],
    ['29-privacy', '/privacy'],
    ['30-refund-policy', '/refund-policy'],
    ['31-insurance', '/insurance'],
    ['32-insurance-recommend', '/insurance/recommend'],
    ['33-insurance-apply', '/insurance/apply'],
    ['34-insurance-complete', '/insurance/complete'],
    ['35-insurance-landing', '/landing/insurance'],
  ];

  const records = [];
  for (const [name, route] of routeSpecs) {
    activeRoute = route;
    const errorStart = browserErrors.length;
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await settle();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(100);

    const actualUrl = page.url();
    const heading = await page.locator('h1, h2').first().textContent().catch(() => null);
    const alerts = await page.locator('[role="alert"]').allTextContents().catch(() => []);
    const metrics = await page.evaluate(() => ({
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
    if (response && response.status() >= 400) issueSignals.push(`문서 HTTP ${response.status()}`);
    if (/Internal Server Error|Application error|Unhandled Runtime Error/i.test(metrics.bodyText)) issueSignals.push('런타임 오류 문구 표시');
    if (/404\s*This page could not be found/i.test(metrics.bodyText)) issueSignals.push('404 화면 표시');
    if (metrics.documentWidth > metrics.viewportWidth + 2) issueSignals.push('데스크톱 가로 넘침');

    records.push({
      name,
      requestedRoute: route,
      actualUrl,
      httpStatus: response?.status() ?? null,
      heading: heading?.trim() || null,
      alerts: alerts.map((value) => value.trim()).filter(Boolean),
      dimensions: { width: metrics.documentWidth, height: metrics.documentHeight, viewportWidth: metrics.viewportWidth },
      browserErrors: browserErrors.slice(errorStart),
      issueSignals,
      screenshots: {
        viewport: path.relative(outputDir, viewportPath).replaceAll('\\', '/'),
        full: path.relative(outputDir, fullPath).replaceAll('\\', '/'),
      },
    });
  }

  const makeContactSheet = async (recordsForSheet, fileName, title) => {
    const cards = [];
    for (const record of recordsForSheet) {
      const imageBytes = await readFile(path.join(outputDir, record.screenshots.viewport));
      const imageUrl = `data:image/png;base64,${imageBytes.toString('base64')}`;
      const actualPath = new URL(record.actualUrl).pathname;
      const status = record.issueSignals.length ? record.issueSignals.join(' · ') : actualPath === record.requestedRoute ? '정상 진입' : `이동: ${actualPath}`;
      cards.push(`<article><div class="label"><strong>${record.requestedRoute}</strong><span>${status}</span></div><img src="${imageUrl}" alt="${record.requestedRoute}"></article>`);
    }
    const sheet = await context.newPage();
    await sheet.setViewportSize({ width: 1500, height: 1000 });
    await sheet.setContent(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
      *{box-sizing:border-box}body{margin:0;padding:24px;background:#e8e6df;color:#17211d;font-family:Arial,'Malgun Gothic',sans-serif}
      h1{margin:0 0 18px;font-size:28px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
      article{overflow:hidden;border:1px solid #bbb9b0;background:#fff;box-shadow:0 2px 8px #0001}.label{display:flex;justify-content:space-between;gap:12px;padding:11px 13px;border-bottom:1px solid #ddd;background:#f8f7f2;font-size:14px}
      .label span{font-size:12px;color:#526057}img{display:block;width:100%;height:440px;object-fit:cover;object-position:top left}
    </style></head><body><h1>${title}</h1><main class="grid">${cards.join('')}</main></body></html>`, { waitUntil: 'load' });
    await sheet.screenshot({ path: path.join(outputDir, fileName), fullPage: true, animations: 'disabled' });
    await sheet.close();
  };

  await makeContactSheet(records.slice(0, 12), 'contact-sheet-1.png', '현재 고객 홈페이지 직접 확인 1/3');
  await makeContactSheet(records.slice(12, 24), 'contact-sheet-2.png', '현재 고객 홈페이지 직접 확인 2/3');
  await makeContactSheet(records.slice(24), 'contact-sheet-3.png', '현재 고객 홈페이지 직접 확인 3/3');

  const summary = {
    capturedAt: new Date().toISOString(),
    baseUrl,
    readOnly: true,
    discoveredDetails: { productDetail, brandDetail, concernDetail, noticeDetail },
    totals: {
      screens: records.length,
      routeIssues: records.filter((record) => record.issueSignals.length > 0).length,
      browserErrors: records.reduce((sum, record) => sum + record.browserErrors.length, 0),
      redirected: records.filter((record) => new URL(record.actualUrl).pathname !== record.requestedRoute).length,
    },
    records,
  };
  await writeFile(path.join(outputDir, 'audit.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  await writeFile(path.join(outputDir, 'README.md'), `# 현재 고객 홈페이지 화면 캡처 감사\n\n- 실행 시각: ${summary.capturedAt}\n- 대상: ${baseUrl}\n- 방식: 읽기 전용 화면 진입(폼 제출·저장 미실행)\n- 화면 수: ${records.length}\n- 화면 오류 신호: ${summary.totals.routeIssues}\n- 브라우저 오류: ${summary.totals.browserErrors}\n- 정상 보호·상태 이동 포함 리다이렉트: ${summary.totals.redirected}\n\n전체 화면은 \`full/\`, 첫 화면은 \`viewport/\`, 판정 원문은 \`audit.json\`에 있습니다.\n`, 'utf8');
  console.log(JSON.stringify({ outputDir, ...summary.totals, discoveredDetails: summary.discoveredDetails }, null, 2));
} finally {
  await browser.close();
}
