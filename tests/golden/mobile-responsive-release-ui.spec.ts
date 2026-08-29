import { expect, test, type Page, type Route } from '@playwright/test';
import { loginAsMemberReadOnly } from './_lib/memberCrudHelpers';

type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

const VIEWPORTS = [320, 360, 390] as const;
const PUBLIC_ROUTES = [
  { slug: 'home', path: '/' },
  { slug: 'brand', path: '/brands/b1' },
  { slug: 'care', path: '/concerns' },
  { slug: 'shop', path: '/shop' },
] as const;

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
  name: '모바일 반응형 검증 상품',
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
  description: '모바일 반응형 검증용 상품입니다.',
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

async function installMockApi(page: Page): Promise<void> {
  let wishlisted = false;

  await page.route('**/api/members/me', (route) => fulfillJson(route, { user: MEMBER }));
  await page.route('**/api/products', (route) => fulfillJson(route, { products: [PRODUCT] }));
  await page.route('**/api/wishlist', async (route) => {
    const method = route.request().method();
    if (method === 'GET') {
      await fulfillJson(route, { productIds: wishlisted ? [PRODUCT.id] : [] });
      return;
    }
    if (method === 'POST') {
      wishlisted = !wishlisted;
      await fulfillJson(route, { wishlisted });
      return;
    }
    await route.fallback();
  });

  for (const [path, body] of Object.entries(EMPTY_RESPONSES)) {
    await page.route(`**${path}`, (route) => fulfillJson(route, body));
  }
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
  }));
  expect(overflow.scrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.clientWidth + 1);
  expect(overflow.bodyScrollWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

async function expectTouchTarget(locator: ReturnType<Page['getByRole']>, label: string): Promise<void> {
  const box = await locator.boundingBox();
  expect(box, label).not.toBeNull();
  expect(box?.width, label).toBeGreaterThanOrEqual(44);
  expect(box?.height, label).toBeGreaterThanOrEqual(44);
}

test.describe('release UI 모바일 반응형 검증', () => {
  for (const width of VIEWPORTS) {
    test.describe(`${width}px`, () => {
      test.use({ viewport: { width, height: 844 }, isMobile: true, hasTouch: true });

      for (const route of PUBLIC_ROUTES) {
        test(`${route.slug} 화면은 overflow 없이 하단 탭바 터치 영역을 유지한다`, async ({ page }, testInfo) => {
          const response = await page.goto(route.path);
          expect(response?.ok(), `${width}px ${route.slug} 응답`).toBe(true);
          await expect(page.locator('main').first()).toBeVisible({ timeout: 15_000 });
          await expectNoHorizontalOverflow(page);

          const bottomNav = page.getByRole('navigation', { name: '하단 메뉴' });
          await expect(bottomNav).toBeVisible();
          for (const label of ['홈', '케어', '쇼핑', '보험', '마이']) {
            await expectTouchTarget(bottomNav.getByRole('link', { name: label }), `${width}px ${route.slug} ${label}`);
          }

          await page.screenshot({ path: testInfo.outputPath(`${width}-${route.slug}.png`), fullPage: false });
        });
      }

      test('마이페이지 탭과 상품 상세 찜 버튼은 모바일 터치 영역과 overflow 계약을 지킨다', async ({
        page,
      }, testInfo) => {
        await loginAsMemberReadOnly(page);
        await installMockApi(page);

        await page.goto('/mypage?tab=orders');
        await expect(page.getByRole('heading', { name: '주문내역', exact: true })).toBeVisible();
        await expectNoHorizontalOverflow(page);
        const tablist = page.getByRole('tablist', { name: '모바일 마이페이지 메뉴' });
        await expect(tablist).toBeVisible();
        await expectTouchTarget(tablist.getByRole('tab', { name: '관심 상품' }), `${width}px mypage 관심 상품 탭`);
        await tablist.getByRole('tab', { name: '관심 상품' }).click();
        await expect(page.getByRole('heading', { name: '관심 상품', exact: true })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`${width}-mypage.png`), fullPage: false });

        await page.goto('/shop/p1');
        const productName = (await page.getByRole('heading', { level: 1 }).textContent())?.trim();
        if (!productName) throw new Error('상품 상세 h1에서 상품명을 읽지 못함');
        const wishlistButton = page.getByRole('button', { name: `${productName} 찜하기` });
        await expect(wishlistButton).toBeVisible();
        await expectTouchTarget(wishlistButton, `${width}px 상품 상세 찜 버튼`);
        await expectNoHorizontalOverflow(page);
        await wishlistButton.click();
        await expect(page.getByRole('button', { name: `${productName} 찜 해제` })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`${width}-wishlist.png`), fullPage: false });
      });
    });
  }
});
