import { expect, test, type Page, type Route } from '@playwright/test';
import { loginAsMemberReadOnly } from './_lib/memberCrudHelpers';

const ORDER_ID = 'order-live-tracking-1';
const BRAND_ID = 'brand-live-tracking-1';
const TRACKING_PATH = `/api/orders/${ORDER_ID}/shipments/${BRAND_ID}/tracking`;
const SCRIPT_LIKE_KIND = '<script>window.__trackingInjected = true</script>';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost']);
const BLOCKED_STATIC_FONT_URL =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css';

const user = {
  id: 'member-live-tracking-1',
  name: '렌더 테스트 회원',
  email: 'member-live-tracking@example.test',
  phone: '010-0000-0000',
  role: 'user',
  status: 'active',
  createdAt: '2026-08-26T00:00:00.000Z',
};

const product = {
  id: 'product-live-tracking-1',
  brandId: BRAND_ID,
  name: '로컬 배송조회 상품',
  price: 19000,
  rating: 0,
  reviewCount: 0,
  category: 'care',
  lifestyleCategory: 'care',
  concernTags: [],
  petType: 'both',
  ageGroup: 'all',
  image: '/products/p1.svg',
  stock: 10,
  description: '로컬 fixture 상품',
  isBest: false,
  isRecommended: false,
  isVisible: true,
  brandName: '로컬 브랜드',
};

const brand = {
  id: BRAND_ID,
  slug: 'local-tracking-brand',
  name: '로컬 브랜드',
  logo: '/images/icon-product.svg',
  description: '로컬 fixture 브랜드',
  philosophy: 'fixture',
  auditPoints: [],
  representativeProductIds: [product.id],
  relatedConcernSlugs: [],
  isRecommended: false,
};

const order = {
  id: ORDER_ID,
  customerName: user.name,
  phone: user.phone,
  address: '서울시 테스트구',
  items: [
    {
      productId: product.id,
      productName: product.name,
      brandId: BRAND_ID,
      quantity: 1,
      price: product.price,
    },
  ],
  totalPrice: product.price,
  deliveryFee: 0,
  paymentMethod: 'card',
  orderStatus: '결제완료',
  paymentStatus: '결제완료',
  deliveryStatus: '배송중',
  createdAt: '2026-08-26T00:00:00.000Z',
};

const shipment = {
  id: 'shipment-live-tracking-1',
  orderId: ORDER_ID,
  brandId: BRAND_ID,
  carrier: 'cj',
  trackingNumber: '123456789012',
  deliveryStatus: '배송중',
  createdAt: '2026-08-26T00:00:00.000Z',
};

const trackingSuccess = {
  ok: true,
  source: 'sweettracker',
  deliveryStatus: '배송중',
  complete: false,
  level: 3,
  invoiceNo: shipment.trackingNumber,
  steps: [{ time: '2026-08-26 12:34', where: '서울 테스트 허브', kind: SCRIPT_LIKE_KIND }],
  refreshedAt: '2026-08-26T12:35:00.000Z',
};

type TrackingResponder = (route: Route, call: number) => Promise<void>;

type MypageAudit = {
  readonly trackingCalls: () => number;
  readonly requestCount: () => number;
  readonly writeRequestCount: () => number;
  readonly forbiddenRemoteRequestCount: () => number;
  readonly blockedStaticRequests: () => readonly string[];
  readonly assertClean: () => void;
};

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
}

async function installMypageFixtures(page: Page, shipments: readonly typeof shipment[], respondTracking: TrackingResponder): Promise<MypageAudit> {
  const writeRequests: string[] = [];
  const blockedStaticRequests: string[] = [];
  const forbiddenRemoteRequests: string[] = [];
  const unexpectedApiRequests: string[] = [];
  let requestCount = 0;
  let trackingCalls = 0;
  const allowedApiPaths = new Set([
    '/api/members/me',
    '/api/settings',
    '/api/category-settings',
    '/api/orders/mine',
    '/api/orders/mine/shipments',
    '/api/orders/mine/products',
    '/api/products',
    '/api/brands',
    '/api/wishlist',
    '/api/reviews/mine',
    '/api/inquiries/mine',
    '/api/insurance/mine',
    `/api/orders/${ORDER_ID}/shipments`,
    TRACKING_PATH,
  ]);

  page.on('request', (request) => {
    requestCount += 1;
    const url = new URL(request.url());
    if (!LOCAL_HOSTS.has(url.hostname)) {
      if (url.href === BLOCKED_STATIC_FONT_URL) blockedStaticRequests.push(request.url());
      else forbiddenRemoteRequests.push(request.url());
    }
    if (!['GET', 'HEAD'].includes(request.method())) writeRequests.push(`${request.method()} ${url.pathname}`);
    if (url.pathname.startsWith('/api/') && !allowedApiPaths.has(url.pathname)) {
      unexpectedApiRequests.push(`${request.method()} ${url.pathname}`);
    }
  });

  await page.route('**/api/members/me', (route) => fulfillJson(route, { user }));
  await page.route('**/api/settings', (route) => fulfillJson(route, { settings: {} }));
  await page.route('**/api/category-settings', (route) => fulfillJson(route, { settings: {} }));
  await page.route('**/api/orders/mine', (route) => fulfillJson(route, { orders: [order] }));
  await page.route('**/api/orders/mine/shipments', (route) => fulfillJson(route, { shipments }));
  await page.route(`**/api/orders/${ORDER_ID}/shipments`, (route) => fulfillJson(route, { shipments }));
  await page.route('**/api/orders/mine/products', (route) => fulfillJson(route, { products: [product] }));
  await page.route('**/api/products', (route) => fulfillJson(route, { products: [product] }));
  await page.route('**/api/brands', (route) => fulfillJson(route, { brands: [brand] }));
  await page.route('**/api/wishlist', (route) => fulfillJson(route, { productIds: [] }));
  await page.route('**/api/reviews/mine', (route) => fulfillJson(route, { reviews: [] }));
  await page.route('**/api/inquiries/mine', (route) => fulfillJson(route, { inquiries: [] }));
  await page.route('**/api/insurance/mine', (route) => fulfillJson(route, { applications: [] }));
  await page.route(`**${TRACKING_PATH}`, async (route) => {
    trackingCalls += 1;
    await respondTracking(route, trackingCalls);
  });
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!LOCAL_HOSTS.has(url.hostname) || !['GET', 'HEAD'].includes(request.method())) {
      await route.abort();
      return;
    }
    await route.fallback();
  });

  return {
    trackingCalls: () => trackingCalls,
    requestCount: () => requestCount,
    writeRequestCount: () => writeRequests.length,
    forbiddenRemoteRequestCount: () => forbiddenRemoteRequests.length,
    blockedStaticRequests: () => blockedStaticRequests,
    assertClean: () => {
      expect(writeRequests, 'Mypage rendered UI write requests').toEqual([]);
      expect(
        forbiddenRemoteRequests,
        'Mypage rendered UI forbidden remote app/vendor/Production/Preview/Vercel/unknown requests',
      ).toEqual([]);
      expect(unexpectedApiRequests, 'Mypage rendered UI unexpected API requests').toEqual([]);
      expect(blockedStaticRequests, 'Known blocked static font requests').toHaveLength(1);
    },
  };
}

async function openMypageWithFixtures(page: Page, shipments: readonly typeof shipment[], respondTracking: TrackingResponder): Promise<MypageAudit> {
  await loginAsMemberReadOnly(page);
  const audit = await installMypageFixtures(page, shipments, respondTracking);
  await page.goto('/mypage?tab=orders');
  await expect(page.getByRole('heading', { name: '주문내역', exact: true })).toBeVisible();
  return audit;
}

test('Given a CJ shipment, When the real order modal opens, Then live history is rendered once per open cycle and refresh is in-flight safe', async ({ page }) => {
  let releaseThirdResponse: (() => void) | null = null;
  const thirdResponse = new Promise<void>((resolve) => {
    releaseThirdResponse = resolve;
  });
  const audit = await openMypageWithFixtures(page, [shipment], async (route, call) => {
    if (call === 3) await thirdResponse;
    await fulfillJson(route, trackingSuccess);
  });

  const shippingButton = page.getByRole('button', { name: '배송조회', exact: true });
  await shippingButton.click();
  const dialog = page.getByRole('dialog', { name: '배송조회' });
  await expect(dialog.getByRole('heading', { name: '실시간 배송이력', exact: true })).toBeVisible();
  await expect(dialog.getByText('배송중', { exact: true }).last()).toBeVisible();
  await expect(dialog.getByText('2026-08-26 12:34 · 서울 테스트 허브', { exact: true })).toBeVisible();
  await expect(dialog.getByText(SCRIPT_LIKE_KIND, { exact: true })).toBeVisible();
  await expect(dialog.locator('script')).toHaveCount(0);
  expect(audit.trackingCalls()).toBe(1);

  await dialog.getByLabel('닫기').click();
  await expect(dialog).toHaveCount(0);
  await shippingButton.click();
  await expect(dialog.getByText(SCRIPT_LIKE_KIND, { exact: true })).toBeVisible();
  expect(audit.trackingCalls()).toBe(2);

  const refresh = dialog.getByLabel('실시간 배송이력 새로고침');
  await refresh.click();
  await expect(refresh).toBeDisabled();
  await refresh.click({ force: true });
  expect(audit.trackingCalls()).toBe(3);
  const releaseThird = releaseThirdResponse ?? (() => { throw new Error('third tracking response was not deferred'); });
  releaseThird();
  await expect(refresh).toBeEnabled();
  expect(audit.trackingCalls()).toBe(3);
  audit.assertClean();
});

test('Given a not-found live response, When the real modal renders it, Then the carrier card and external carrier link remain without internal configuration text', async ({ page }) => {
  const audit = await openMypageWithFixtures(page, [shipment], (route) =>
    fulfillJson(route, {
      ok: false,
      source: 'sweettracker',
      reason: 'not-found',
      refreshedAt: '2026-08-26T12:35:00.000Z',
    }),
  );

  await page.getByRole('button', { name: '배송조회', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '배송조회' });
  await expect(dialog.getByText('택배사에 등록된 배송이력이 아직 없어요.', { exact: true })).toBeVisible();
  await expect(dialog.getByText('CJ대한통운', { exact: true })).toBeVisible();
  await expect(dialog.getByText(shipment.trackingNumber, { exact: true })).toBeVisible();
  await expect(dialog.getByRole('link', { name: '택배사에서 배송조회' })).toBeVisible();
  await expect(dialog).not.toContainText(/SWEETTRACKER|API key|t_key|no-api-key/i);
  expect(audit.trackingCalls()).toBe(1);
  audit.assertClean();
});

test('Given the brand shipment is absent, When the real modal opens, Then it makes no live tracking request', async ({ page }) => {
  const audit = await openMypageWithFixtures(page, [], (route) => fulfillJson(route, trackingSuccess));

  await page.getByRole('button', { name: '배송조회', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '배송조회' });
  await expect(dialog.getByText('판매자가 상품을 준비 중입니다. 송장이 등록되면 이곳에서 배송 현황을 확인할 수 있어요.')).toBeVisible();
  await expect(dialog.getByText('운송장이 등록되면 실시간 배송이력을 확인할 수 있어요.')).toBeVisible();
  expect(audit.trackingCalls()).toBe(0);
  audit.assertClean();
});
