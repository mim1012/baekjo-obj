import { test, expect, type Page } from '@playwright/test';
import { normalizeShopCategory } from '@/data/shopFilters';
import { filterProducts, sortProducts, type SortOption } from '@/lib/filters';
import type { Brand, Product } from '@/types';

async function catalog(page: Page): Promise<{ products: Product[]; brands: Brand[] }> {
  const [productsResponse, brandsResponse] = await Promise.all([
    page.request.get('/api/products'),
    page.request.get('/api/brands'),
  ]);
  expect(productsResponse.ok()).toBe(true);
  expect(brandsResponse.ok()).toBe(true);
  return {
    products: ((await productsResponse.json()) as { products: Product[] }).products,
    brands: ((await brandsResponse.json()) as { brands: Brand[] }).brands,
  };
}

function searchMatches(products: Product[], raw: string): Product[] {
  const query = raw.trim().toLowerCase();
  if (!query) return products;
  return products.filter((product) =>
    `${product.name} ${product.brandName ?? ''} ${product.description}`.toLowerCase().includes(query),
  );
}

async function visibleGridNames(page: Page): Promise<string[]> {
  return page.locator('.shop-product-grid article h3').allTextContents();
}

async function expectGridNames(page: Page, expectedNames: string[]): Promise<void> {
  // Next의 라우트 전환 동안 이전/새 트리가 약 100ms 함께 존재할 수 있으므로
  // 클라이언트 provider 갱신까지 끝난 안정 상태의 그리드를 비교한다.
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  const headings = page.locator('.shop-product-grid article h3');
  await expect(headings).toHaveCount(expectedNames.length);
  expect((await headings.allTextContents()).sort()).toEqual([...expectedNames].sort());
}

async function expectNoHorizontalOverflow(page: Page, route: string, width: number): Promise<void> {
  await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
  await page.goto(route);
  await page.waitForLoadState('domcontentloaded');
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth, `${route} @ ${width}px 가로 스크롤`).toBeLessThanOrEqual(dimensions.clientWidth + 1);
}

test.describe('런칭 핵심: 검색·카테고리·브랜드·정렬', () => {
  test('0827 기본 카테고리를 클릭하면 URL·건수·상품 또는 빈 상태가 실제 데이터와 일치한다', async ({ page }) => {
    const { products } = await catalog(page);
    await page.goto('/shop');

    const categoryLinks = page.locator('.shop-category-tabs a');
    await expect(categoryLinks.first()).toBeVisible();
    const hrefs = (await categoryLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href'))))
      .filter((href): href is string => Boolean(href && href.includes('category=')));
    expect(hrefs.length).toBeGreaterThan(0);

    for (const href of hrefs) {
      const selected = new URL(`http://local${href}`).searchParams.get('category')!;
      const expectedProducts = products.filter(
        (product) => normalizeShopCategory(product.categorySlug ?? product.category) === normalizeShopCategory(selected),
      );
      await page.goto('/shop');
      await page.locator(`.shop-category-tabs a[href="${href}"]`).first().click();
      await expect(page).toHaveURL(new RegExp(`category=${encodeURIComponent(selected)}`));
      await expect(page.locator('#shop-toolbar')).toContainText(`${expectedProducts.length}개`);
      expect((await visibleGridNames(page)).sort()).toEqual(expectedProducts.map((product) => product.name).sort());
      if (expectedProducts.length === 0) {
        await expect(page.getByText('선택한 조건에 맞는 상품을 찾지 못했어요.')).toBeVisible();
      }

      await page.reload();
      await expect(page.locator('#shop-toolbar')).toContainText(`${expectedProducts.length}개`);
    }
  });

  test('정확명·부분명·브랜드·영문/숫자·앞뒤 공백·0건 검색과 뒤로가기를 검증한다', async ({ page }) => {
    test.setTimeout(180_000);
    const { products } = await catalog(page);
    const sellable = products.find((product) => product.price != null && product.stock > 0)!;
    const englishToken = products
      .flatMap((product) => [product.name, product.brandName ?? ''])
      .map((value) => value.match(/[A-Za-z]{3,}/)?.[0])
      .find(Boolean);
    const cases = [
      sellable.name,
      sellable.name.slice(0, Math.max(2, Math.floor(sellable.name.length / 2))),
      sellable.brandName ?? '',
      englishToken ?? '',
      '2.0',
      `  ${sellable.brandName ?? sellable.name}  `,
      '존재하지않는상품___!@#',
      '존재하지않는긴검색어'.repeat(30),
    ].filter(Boolean);

    for (const query of cases) {
      await page.goto('/shop');
      await page.getByRole('textbox', { name: '상품 검색' }).fill(query);
      await page.getByRole('button', { name: '검색', exact: true }).click();
      const normalized = query.trim();
      await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe(normalized);
      const expectedProducts = searchMatches(products, query);
      await expect(page.locator('#shop-toolbar')).toContainText(`${expectedProducts.length}개`);
      await expectGridNames(page, expectedProducts.map((product) => product.name));
      if (expectedProducts.length === 0) {
        await expect(page.getByText('선택한 조건에 맞는 상품을 찾지 못했어요.')).toBeVisible();
      }
    }

    await page.goto('/shop');
    await page.getByRole('textbox', { name: '상품 검색' }).fill('   ');
    await page.getByRole('button', { name: '검색', exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.has('search')).toBe(false);
    await expectGridNames(page, products.map((product) => product.name));

    const query = sellable.brandName ?? sellable.name;
    await page.goto('/shop');
    await page.getByRole('textbox', { name: '상품 검색' }).fill(query);
    await page.getByRole('button', { name: '검색', exact: true }).click();
    const expectedBackResults = searchMatches(products, query);
    await expect(page.locator('#shop-toolbar')).toContainText(`${expectedBackResults.length}개`);
    await expectGridNames(page, expectedBackResults.map((product) => product.name));
    const firstProduct = page.locator('.shop-product-grid a[href^="/shop/"]').first();
    await firstProduct.click();
    await expect(page).toHaveURL(/\/shop\/.+/);
    await page.goBack();
    await expect(page).toHaveURL(/\/shop\?search=/);
    await expect(page.getByRole('textbox', { name: '상품 검색' })).toHaveValue(query);
  });

  test('모든 브랜드·가격 필터·카테고리 조합과 모든 정렬 결과가 실제 데이터와 일치한다', async ({ page }) => {
    test.setTimeout(180_000);
    const { products, brands } = await catalog(page);
    const dataBackedBrands = brands.filter((candidate) => products.some((product) => product.brandId === candidate.id));

    for (const candidate of dataBackedBrands) {
      const expected = products.filter((product) => product.brandId === candidate.id);
      await page.goto('/shop');
      const sidebar = page.getByRole('complementary');
      await sidebar.locator('summary', { hasText: '브랜드' }).click();
      await sidebar.getByRole('link', { name: candidate.name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`brandId=${candidate.id}`));
      await expect(page.locator('#shop-toolbar')).toContainText(`${expected.length}개`);
      await expectGridNames(page, expected.map((product) => product.name));
      await page.reload();
      await expectGridNames(page, expected.map((product) => product.name));
    }

    const brand = dataBackedBrands[0]!;
    const brandProducts = products.filter((product) => product.brandId === brand.id);

    await page.goto('/shop');
    const sidebar = page.getByRole('complementary');
    await sidebar.locator('summary', { hasText: '브랜드' }).click();
    await sidebar.getByRole('link', { name: brand.name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`brandId=${brand.id}`));
    await expect(page.locator('#shop-toolbar')).toContainText(`${brandProducts.length}개`);
    await expectGridNames(page, brandProducts.map((product) => product.name));

    const category = brandProducts[0].categorySlug ?? brandProducts[0].category;
    const normalizedCategory = normalizeShopCategory(category)!;
    await page.locator(`.shop-category-tabs a[href*="category=${encodeURIComponent(normalizedCategory)}"]`).click();
    const combined = brandProducts.filter(
      (product) => normalizeShopCategory(product.categorySlug ?? product.category) === normalizeShopCategory(category),
    );
    await expect(page.locator('#shop-toolbar')).toContainText(`${combined.length}개`);
    await expectGridNames(page, combined.map((product) => product.name));

    const priceCases = [
      { id: 'under-20000', label: '2만원 미만', minPrice: undefined, maxPrice: 19_999 },
      { id: '20000-50000', label: '2-5만원', minPrice: 20_000, maxPrice: 49_999 },
      { id: '50000-100000', label: '5-10만원', minPrice: 50_000, maxPrice: 99_999 },
      { id: '100000-plus', label: '10만원 이상', minPrice: 100_000, maxPrice: undefined },
    ];
    for (const priceCase of priceCases) {
      await page.goto('/shop');
      const sidebar = page.getByRole('complementary');
      await sidebar.locator('summary', { hasText: '가격' }).click();
      await sidebar.getByRole('link', { name: priceCase.label, exact: true }).click();
      await expect.poll(() => new URL(page.url()).searchParams.get('price')).toBe(priceCase.id);
      const expected = filterProducts(products, {
        minPrice: priceCase.minPrice,
        maxPrice: priceCase.maxPrice,
      });
      await expectGridNames(page, expected.map((product) => product.name));
    }

    const sortCases: Array<{ id: SortOption; label: string }> = [
      { id: 'recommended', label: '기본순' },
      { id: 'popular', label: '인기순' },
      { id: 'newest', label: '최신순' },
      { id: 'reviews', label: '후기 많은 순' },
      { id: 'price-low', label: '낮은 가격순' },
      { id: 'price-high', label: '높은 가격순' },
    ];
    for (const sortCase of sortCases) {
      await page.goto('/shop');
      await page.getByRole('link', { name: sortCase.label, exact: true }).click();
      if (sortCase.id === 'recommended') {
        await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('recommended');
      } else {
        await expect(page).toHaveURL(new RegExp(`sort=${sortCase.id}`));
      }
      const expectedOrder = sortProducts(products, sortCase.id).map((product) => product.name);
      const sortedHeadings = page.locator('.shop-product-grid article h3');
      await expect(sortedHeadings).toHaveCount(expectedOrder.length);
      expect(await sortedHeadings.allTextContents()).toEqual(expectedOrder);
    }
  });

  test('브랜드 추천 필터·A-Z 정렬·상세 이동이 실제 브랜드 데이터와 일치한다', async ({ page }) => {
    const { brands } = await catalog(page);
    const recommended = brands.filter((brand) => brand.isVisible !== false && brand.isRecommended);
    await page.goto('/brands');
    await page.getByRole('link', { name: '백조오브제 추천', exact: true }).click();
    await expect(page).toHaveURL(/filter=recommended/);
    const grid = page.getByTestId('brand-grid');
    await expect(grid.locator('a[href^="/brands/"]')).toHaveCount(recommended.length);

    await page.getByRole('link', { name: '브랜드 A-Z', exact: true }).click();
    await expect(page).toHaveURL(/sort=az/);
    await expect(grid.locator('a[href^="/brands/"]')).toHaveCount(recommended.length);
    const hrefs = await grid.locator('a[href^="/brands/"]').evaluateAll((links) =>
      links.map((link) => link.getAttribute('href')),
    );
    const expectedIds = [...recommended].sort((a, b) => a.name.localeCompare(b.name, 'ko')).map((brand) => `/brands/${brand.id}`);
    expect(hrefs).toEqual(expectedIds);

    await grid.locator('a[href^="/brands/"]').first().click();
    await expect(page).toHaveURL(/\/brands\/.+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});

test.describe('런칭 핵심: 옵션·장바구니·모바일·예외 상태', () => {
  test('품절 옵션 차단, 옵션가 계산, 장바구니 재고 상한과 새로고침 보존', async ({ page }) => {
    const { products } = await catalog(page);
    const mixedStockProduct = products.find((product) =>
      product.stock > 0 && product.options?.some((option) => option.stock === 0) && product.options.some((option) => option.stock > 0),
    )!;
    await page.goto(`/shop/${mixedStockProduct.id}`);
    const select = page.locator('select').first();
    const soldOutOptions = select.locator('option:disabled');
    await expect(soldOutOptions.first()).toContainText('품절');
    expect(await soldOutOptions.count()).toBeGreaterThan(0);

    const selectedId = await select.inputValue();
    const selectedOption = mixedStockProduct.options!.find((option) => option.id === selectedId)!;
    const unitPrice = (mixedStockProduct.salePrice ?? mixedStockProduct.price!) + (selectedOption.priceDiff ?? selectedOption.price ?? 0);
    await expect(page.getByText(new Intl.NumberFormat('ko-KR').format(unitPrice) + '원', { exact: true }).last()).toBeVisible();

    await page.evaluate(() => localStorage.removeItem('baekjo_cart'));
    const oneStockProduct = products.find((product) => product.price != null && product.stock === 1)!;
    await page.goto(`/shop/${oneStockProduct.id}`);
    await Promise.all([
      page.waitForEvent('dialog').then((dialog) => dialog.accept()),
      page.getByRole('button', { name: '장바구니', exact: true }).click(),
    ]);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('baekjo_cart') || '[]').length)).toBe(1);
    await page.goto('/cart');
    await expect(page.getByText(oneStockProduct.name, { exact: true })).toBeVisible();
    const plus = page.getByRole('button', { name: new RegExp(`${oneStockProduct.name} 수량 늘리기`) });
    const minus = page.getByRole('button', { name: new RegExp(`${oneStockProduct.name} 수량 줄이기`) });
    await expect(plus).toBeDisabled();
    await expect(minus).toBeDisabled();
    await page.reload();
    await expect(page.getByText(oneStockProduct.name, { exact: true })).toBeVisible();
    const storedQuantity = await page.evaluate(() => JSON.parse(localStorage.getItem('baekjo_cart') || '[]')[0]?.quantity);
    expect(storedQuantity).toBe(1);
  });

  test('모바일 메뉴 외부 클릭·Escape와 필터 바텀시트를 실제 조작한다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: '메뉴 열기' }).click();
    await expect(page.getByRole('navigation', { name: '전체 메뉴' })).toBeVisible();
    await page.mouse.click(10, 740);
    await expect(page.getByRole('navigation', { name: '전체 메뉴' })).toHaveCount(0);
    await page.getByRole('button', { name: '메뉴 열기' }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('navigation', { name: '전체 메뉴' })).toHaveCount(0);

    await page.goto('/shop');
    await page.getByRole('button', { name: /필터/ }).click();
    await expect(page.getByRole('dialog', { name: '필터' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: '필터' })).toHaveCount(0);
  });

  test('요청된 대표 PC·태블릿·모바일 너비에서 핵심 페이지 가로 넘침이 없다', async ({ page }) => {
    test.setTimeout(180_000);
    const widths = [320, 360, 375, 390, 412, 430, 768, 820, 1024, 1280, 1366, 1440, 1920];
    for (const width of widths) {
      for (const route of ['/', '/shop', '/shop/p1', '/cart']) {
        await expectNoHorizontalOverflow(page, route, width);
      }
    }
  });

  test('잘못된 상품·브랜드·카테고리·쿼리에서 개발 오류 화면을 노출하지 않는다', async ({ page }) => {
    for (const route of ['/shop/not-a-real-product', '/brands/not-a-real-brand']) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(404);
      await expect(page.locator('body')).not.toContainText(/Application error|client-side exception|Internal Server Error/i);
    }

    for (const route of ['/shop?category=not-a-real-category', '/shop?sort=not-a-real-sort&page=-10']) {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator('body')).not.toContainText(/Application error|client-side exception|Internal Server Error/i);
    }
  });
});
