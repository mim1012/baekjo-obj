import { expect, test, type Page, type Route } from '@playwright/test';
import { loginAsMemberReadOnly } from './_lib/memberCrudHelpers';

type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };
type MockApiOptions = {
  readonly failWishlistToggle?: boolean;
  readonly holdWishlistToggle?: () => Promise<void>;
};

const MEMBER = {
  id: 'member-live-tracking-1',
  email: 'member-live-tracking@example.test',
  name: '렌더 테스트 회원',
  role: 'user',
  provider: 'email',
  emailVerified: true,
};

const PRODUCT = {
  id: 'p1',
  brandId: 'b1',
  brandName: '백조 테스트',
  name: '모바일 찜 성능 상품',
  price: 32000,
  salePrice: null,
  rating: 4.9,
  reviewCount: 3,
  category: 'food',
  categorySlug: 'food',
  lifestyleCategory: 'daily',
  concernTags: ['skin'],
  petType: 'dog',
  ageGroup: 'adult',
  image: '',
  images: [],
  stock: 10,
  description: '모바일 상호작용 성능 측정용 상품입니다.',
  isBest: false,
  isRecommended: true,
};

const EMPTY_RESPONSES: Record<string, JsonValue> = {
  '/api/orders/mine': { orders: [] },
  '/api/orders/mine/shipments': { shipments: [] },
  '/api/insurance/mine': { applications: [] },
  '/api/orders/mine/products': { products: [] },
  '/api/reviews/mine': { reviews: [] },
  '/api/inquiries/mine': { inquiries: [] },
  '/api/products/p1/reviews': { reviews: [] },
  '/api/products/p1/inquiries': { inquiries: [] },
};

async function fulfillJson(route: Route, body: JsonValue): Promise<void> {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function installMockApi(page: Page, options: MockApiOptions = {}): Promise<void> {
  let wishlisted = false;

  await page.route('**/api/members/me', (route) => fulfillJson(route, { user: MEMBER }));
  await page.route('**/api/products', (route) => fulfillJson(route, { products: [PRODUCT] }));
  await page.route('**/api/products/p1', (route) => fulfillJson(route, { product: PRODUCT }));
  await page.route('**/api/wishlist', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await fulfillJson(route, { productIds: wishlisted ? [PRODUCT.id] : [] });
      return;
    }
    if (method === 'POST') {
      await options.holdWishlistToggle?.();
      if (options.failWishlistToggle) {
        await route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"server-error"}' });
        return;
      }
      wishlisted = !wishlisted;
      await fulfillJson(route, { wishlisted });
      return;
    }
    if (method === 'DELETE') {
      wishlisted = false;
      await fulfillJson(route, { wishlisted });
      return;
    }
    await route.fallback();
  });

  for (const [path, body] of Object.entries(EMPTY_RESPONSES)) {
    await page.route(`**${path}`, (route) => fulfillJson(route, body));
  }
}

test.describe('모바일 상호작용 성능', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('하단 탭바의 현재 탭 재탭은 추가 페이지 요청을 만들지 않는다', async ({ page }) => {
    const shopRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/shop') {
        shopRequests.push(request.url());
      }
    });

    await page.goto('/shop');
    await expect(page.getByRole('navigation', { name: '하단 메뉴' })).toBeVisible();
    const beforeClickCount = shopRequests.length;

    await page.getByRole('navigation', { name: '하단 메뉴' }).getByRole('link', { name: '쇼핑' }).click();

    expect(shopRequests).toHaveLength(beforeClickCount);
    expect(new URL(page.url()).pathname).toBe('/shop');
  });

  test('마이페이지 모바일 탭 전환은 추가 RSC 내비게이션 없이 즉시 전환된다', async ({ page }) => {
    await loginAsMemberReadOnly(page);
    await installMockApi(page);

    const mypageRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/mypage') && !url.includes('__nextjs_original-stack-frame')) {
        mypageRequests.push(url);
      }
    });

    await page.goto('/mypage?tab=orders');
    await expect(page.getByRole('heading', { name: '주문내역', exact: true })).toBeVisible();
    const beforeClickCount = mypageRequests.length;

    await page.getByRole('tab', { name: '관심 상품' }).click();

    await expect(page.getByRole('heading', { name: '관심 상품', exact: true })).toBeVisible();
    expect(mypageRequests).toHaveLength(beforeClickCount);
    expect(new URL(page.url()).searchParams.get('tab')).toBe('wishlist');
  });

  test('상품 상세 찜 버튼은 클릭 즉시 바뀌고 성공 시 추가 wishlist GET을 만들지 않는다', async ({ page }) => {
    await loginAsMemberReadOnly(page);
    let releaseWishlistToggle: () => void = () => {};
    const pendingWishlistToggle = new Promise<void>((resolve) => {
      releaseWishlistToggle = resolve;
    });
    await installMockApi(page);

    const wishlistGets: string[] = [];
    const sessionGets: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/wishlist') && request.method() === 'GET') {
        wishlistGets.push(request.url());
      }
      if (request.url().includes('/api/members/me') && request.method() === 'GET') {
        sessionGets.push(request.url());
      }
    });
    await page.unroute('**/api/wishlist');
    await installMockApi(page, { holdWishlistToggle: () => pendingWishlistToggle });

    await page.goto('/shop/p1');
    const productName = (await page.getByRole('heading', { level: 1 }).textContent())?.trim();
    if (!productName) throw new Error('상품 상세 h1에서 상품명을 읽지 못함');
    const wishlistButton = page.getByRole('button', { name: `${productName} 찜하기` });
    await expect(wishlistButton).toBeVisible();
    const getCountAfterInitialSync = wishlistGets.length;

    await wishlistButton.click();

    await expect(page.getByRole('button', { name: `${productName} 찜 해제` })).toBeVisible();
    releaseWishlistToggle();
    expect(wishlistGets).toHaveLength(getCountAfterInitialSync);
    expect(sessionGets.length).toBeLessThanOrEqual(1);
  });

  test('상품 상세 찜 실패는 낙관 상태를 이전 값으로 되돌린다', async ({ page }) => {
    await loginAsMemberReadOnly(page);
    await installMockApi(page, { failWishlistToggle: true });

    await page.goto('/shop/p1');
    const productName = (await page.getByRole('heading', { level: 1 }).textContent())?.trim();
    if (!productName) throw new Error('상품 상세 h1에서 상품명을 읽지 못함');
    const wishlistButton = page.getByRole('button', { name: `${productName} 찜하기` });
    await expect(wishlistButton).toBeVisible();

    await wishlistButton.click();

    await expect(page.getByRole('button', { name: `${productName} 찜하기` })).toBeVisible();
  });
});
