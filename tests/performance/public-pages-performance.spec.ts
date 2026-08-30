import { expect, test, type Browser, type BrowserContextOptions, type Page, type Request } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

type ViewportLabel = 'mobile' | 'desktop';
type PublicRoute = '/' | '/shop' | '/brands';
type ResourceTiming = Readonly<{
  name: string;
  initiatorType: string;
  duration: number;
  transferSize: number;
}>;
type PageMetrics = Readonly<{
  target: string;
  route: PublicRoute;
  viewport: ViewportLabel;
  ttfb: number | null;
  fcp: number | null;
  lcp: number | null;
  domInteractive: number | null;
  load: number | null;
  requestCount: number;
  transferBytes: number;
  scriptBytes: number;
  imageBytes: number;
  slowResources: readonly ResourceTiming[];
  requestedPaths: readonly string[];
  consoleErrors: readonly string[];
  apiCacheControl: Readonly<Record<string, string | null>>;
}>;
type PublicApiProbe = Readonly<{
  path: string;
  status: number;
  cacheControl: string | null;
}>;
type PerformanceArtifact = Readonly<{
  generatedAt: string;
  command: string;
  results: readonly PageMetrics[];
  publicApiProbes: readonly PublicApiProbe[];
}>;
type MeasureOptions = Readonly<{
  browser: Browser;
  route: PublicRoute;
  viewport: ViewportLabel;
  baseURL: string;
}>;

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const PUBLIC_ROUTES = ['/', '/shop', '/brands'] as const satisfies readonly PublicRoute[];
const PUBLIC_API_PATHS = ['/api/brands', '/api/products', '/api/category-settings'] as const;
const VIEWPORTS = {
  mobile: {
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  },
  desktop: {
    viewport: { width: 1280, height: 900 },
    isMobile: false,
    hasTouch: false,
  },
} as const satisfies Record<ViewportLabel, BrowserContextOptions>;

function requestPath(request: Request): string {
  const url = new URL(request.url());
  return `${url.pathname}${url.search}`;
}

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PATHS.some((apiPath) => pathname === apiPath);
}

async function collectBrowserMetrics(page: Page): Promise<Omit<PageMetrics, 'target' | 'route' | 'viewport' | 'requestCount' | 'requestedPaths' | 'consoleErrors' | 'apiCacheControl'>> {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const paints = performance.getEntriesByType('paint');
    const resources = performance.getEntriesByType('resource');
    const largestContentfulPaint = performance.getEntriesByType('largest-contentful-paint').at(-1);
    const toTiming = (entry: PerformanceEntry): ResourceTiming => {
      if (!(entry instanceof PerformanceResourceTiming)) {
        return {
          name: entry.name,
          initiatorType: 'unknown',
          duration: Math.round(entry.duration),
          transferSize: 0,
        };
      }
      return {
        name: entry.name,
        initiatorType: entry.initiatorType,
        duration: Math.round(entry.duration),
        transferSize: entry.transferSize,
      };
    };
    const resourceTimings = resources.map(toTiming);
    const navigationTiming = navigation instanceof PerformanceNavigationTiming ? navigation : null;
    const fcp = paints.find((entry) => entry.name === 'first-contentful-paint')?.startTime ?? null;
    const lcp = largestContentfulPaint?.startTime ?? null;

    return {
      ttfb: navigationTiming === null ? null : Math.round(navigationTiming.responseStart),
      fcp: fcp === null ? null : Math.round(fcp),
      lcp: lcp === null ? null : Math.round(lcp),
      domInteractive: navigationTiming === null ? null : Math.round(navigationTiming.domInteractive),
      load: navigationTiming === null ? null : Math.round(navigationTiming.loadEventEnd),
      transferBytes: resourceTimings.reduce((total, resource) => total + resource.transferSize, 0),
      scriptBytes: resourceTimings
        .filter((resource) => resource.initiatorType === 'script')
        .reduce((total, resource) => total + resource.transferSize, 0),
      imageBytes: resourceTimings
        .filter((resource) => resource.initiatorType === 'img' || resource.initiatorType === 'image')
        .reduce((total, resource) => total + resource.transferSize, 0),
      slowResources: [...resourceTimings]
        .sort((left, right) => right.duration - left.duration)
        .slice(0, 10),
    };
  });
}

async function measurePublicRoute({ browser, route, viewport, baseURL }: MeasureOptions): Promise<PageMetrics> {
  const context = await browser.newContext(VIEWPORTS[viewport]);
  const page = await context.newPage();
  const requestedPaths: string[] = [];
  const consoleErrors: string[] = [];
  const apiCacheControl: Record<string, string | null> = {};

  page.on('request', (request) => {
    requestedPaths.push(requestPath(request));
  });
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (isPublicApiPath(url.pathname)) {
      apiCacheControl[url.pathname] = response.headers()['cache-control'] ?? null;
    }
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto(route, { waitUntil: 'load' });
  await expect(page.locator('body')).toBeVisible();
  const metrics = await collectBrowserMetrics(page);
  await context.close();

  return {
    target: baseURL,
    route,
    viewport,
    ...metrics,
    requestCount: requestedPaths.length,
    requestedPaths,
    consoleErrors,
    apiCacheControl,
  };
}

test.describe.configure({ mode: 'serial', retries: 0 });

test('공개 페이지 모바일/PC 실제 브라우저 성능 계약을 측정한다', async ({ browser, baseURL, request }, testInfo) => {
  if (!baseURL) throw new Error('performance project requires baseURL from playwright.config.ts');

  const results: PageMetrics[] = [];
  for (const route of PUBLIC_ROUTES) {
    results.push(await measurePublicRoute({ browser, route, viewport: 'mobile', baseURL }));
    results.push(await measurePublicRoute({ browser, route, viewport: 'desktop', baseURL }));
  }

  const publicApiProbes: PublicApiProbe[] = [];
  for (const apiPath of PUBLIC_API_PATHS) {
    const response = await request.get(apiPath);
    publicApiProbes.push({
      path: apiPath,
      status: response.status(),
      cacheControl: response.headers()['cache-control'] ?? null,
    });
  }

  const artifactDir = path.join(REPO_ROOT, 'artifacts', 'performance');
  await fs.mkdir(artifactDir, { recursive: true });
  const artifactPath = path.join(artifactDir, `public-pages-${Date.now()}.json`);
  const artifact: PerformanceArtifact = {
    generatedAt: new Date().toISOString(),
    command: 'npx playwright test tests/performance/public-pages-performance.spec.ts --project=performance --workers=1 --retries=0',
    results,
    publicApiProbes,
  };
  await fs.writeFile(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  await testInfo.attach('public-pages-performance', {
    path: artifactPath,
    contentType: 'application/json',
  });

  for (const apiProbe of publicApiProbes) {
    expect(apiProbe.cacheControl, `${apiProbe.path} Cache-Control`).toBeTruthy();
  }

  const homeResults = results.filter((result) => result.route === '/');
  for (const result of homeResults) {
    expect(result.requestedPaths.some((requestedPath) => requestedPath.includes('/api/settings')), `${result.viewport} home /api/settings`).toBe(false);
    expect(result.requestedPaths.some((requestedPath) => requestedPath.includes('insurance-analysis-banner.png')), `${result.viewport} home original PNG`).toBe(false);
  }

  for (const result of results) {
    expect(result.requestedPaths.some((requestedPath) => requestedPath.includes('/api/wishlist')), `${result.viewport} ${result.route} anonymous wishlist`).toBe(false);
    for (const [apiPath, cacheControl] of Object.entries(result.apiCacheControl)) {
      expect(cacheControl, `${result.viewport} ${result.route} ${apiPath} Cache-Control`).toBeTruthy();
    }
  }
});
