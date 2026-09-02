import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUTPUT = path.resolve('.gstack/qa-reports/baekjo-0827');
fs.mkdirSync(OUTPUT, { recursive: true });

async function openHealthy(page: Page, route: string) {
  const runtimeErrors: string[] = [];
  const onPageError = (error: Error) => runtimeErrors.push(error.message);
  const onConsole = (message: { type(): string; text(): string }) => {
    if (message.type() === 'error' && !/favicon|React DevTools/i.test(message.text())) {
      runtimeErrors.push(message.text());
    }
  };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
  expect(response?.status(), `${route} HTTP status`).toBeLessThan(500);
  expect(runtimeErrors, `${route} runtime errors`).toEqual([]);
  page.off('pageerror', onPageError);
  page.off('console', onConsole);
  return response;
}

test.describe('0827 고객 요구사항 실제 화면', () => {
  test('PC 홈·셀렉션·케어 화면을 1:1 확인한다', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openHealthy(page, '/');
    const headerLogo = page.getByTestId('site-header-logo');
    await expect(headerLogo).toBeVisible();
    expect(decodeURIComponent(await headerLogo.evaluate((image: HTMLImageElement) => image.currentSrc)))
      .toContain('baekjo-objet-header-logo-v2');
    expect((await page.getByTestId('home-hero').boundingBox())?.height).toBeLessThanOrEqual(560);
    expect(decodeURIComponent(await page.getByTestId('home-hero-image').evaluate((image: HTMLImageElement) => image.currentSrc)))
      .toContain('home-hero-pet-lifestyle-desktop');

    const mainNav = page.getByRole('navigation', { name: '주요 메뉴' });
    const navText = await mainNav.innerText();
    let navCursor = -1;
    for (const label of ['셀렉션', '브랜드', '케어', 'B2B', '백조오브제']) {
      const next = navText.indexOf(label, navCursor + 1);
      expect(next, `${label} 메뉴 순서`).toBeGreaterThan(navCursor);
      navCursor = next;
    }
    await expect(mainNav).not.toContainText('펫보험');
    await expect(page.getByRole('heading', { name: '좋은 브랜드를 찾고 계셨나요?' })).toBeVisible();
    await expect(page.getByText('좋은 브랜드는 결과입니다. 백조오브제는 그 과정까지 확인합니다.')).toBeVisible();
    await expect(page.getByText('백조오브제 Audit을 통과한 브랜드만 소개합니다.')).toBeVisible();
    await expect(page.getByRole('link', { name: '보험 분석 시작하기' })).toHaveCount(0);
    const auditHero = page.getByTestId('home-audit-hero');
    const auditImage = page.getByTestId('home-audit-image');
    expect(decodeURIComponent(await auditImage.evaluate((image: HTMLImageElement) => image.currentSrc)))
      .toContain('home-audit-client-photo-extended-v5');
    const [auditHeroBox, auditImageBox] = await Promise.all([auditHero.boundingBox(), auditImage.boundingBox()]);
    expect(auditImageBox?.width).toBeGreaterThanOrEqual((auditHeroBox?.width ?? 0) - 1);
    expect(auditImageBox?.height).toBeGreaterThanOrEqual((auditHeroBox?.height ?? 0) - 1);
    await expect(auditHero.getByRole('heading', { name: '길지만은 않은 우리 아이와의 시간' })).toBeVisible();
    const quickShopNav = page.getByRole('navigation', { name: '빠른 쇼핑' });
    for (const category of ['강아지', '고양이', '소동물', '사료·간식', '위생·배변', '건강관리']) {
      await expect(quickShopNav.getByText(category, { exact: true })).toBeVisible();
    }
    await expect(quickShopNav).not.toContainText('전체 상품');
    const recommendationSection = page.locator('section', { has: page.getByRole('heading', { name: /오늘의 추천/ }) });
    expect(await recommendationSection.locator('article').count()).toBeLessThanOrEqual(3);
    await expect(page.getByRole('contentinfo')).not.toContainText('PET LIFE CURATION');
    await page.screenshot({ path: path.join(OUTPUT, 'home-desktop.png'), fullPage: true });

    await openHealthy(page, '/shop');
    await expect(page.getByText('BAEKJO OBJET SELECTION')).toBeVisible();
    await expect(page.getByRole('heading', { name: '우리 아이를 위한 좋은 선택' })).toBeVisible();
    await expect(page.getByText('백조오브제의 기준으로 살펴보고 선택한 제품을 소개합니다.')).toBeVisible();
    const sidebar = page.getByRole('complementary');
    await expect(sidebar).toContainText('소동물');
    for (const categoryLabel of ['푸드', '영양', '케어', '패션', '펫로스', '라이프']) {
      await expect(sidebar.getByText(categoryLabel, { exact: true })).toBeAttached();
    }
    for (const priceLabel of ['2만원 미만', '2-5만원', '5-10만원', '10만원 이상']) {
      await expect(sidebar.getByText(priceLabel, { exact: true })).toBeAttached();
    }
    await expect(sidebar).not.toContainText('연령');
    await expect(page.locator('body')).not.toContainText('SELECTED');
    await expect(page.locator('body')).not.toContainText('잠시 품절');
    const search = page.getByRole('textbox', { name: '상품 검색' });
    await search.fill('써니사이드업');
    await page.getByRole('button', { name: '검색', exact: true }).click();
    await expect.poll(() => new URL(page.url()).searchParams.get('search')).toBe('써니사이드업');
    const sunnyProductCard = page.locator('.shop-product-grid article').filter({ hasText: '써니사이드업' }).first();
    await expect(sunnyProductCard).toBeVisible();
    await page.screenshot({ path: path.join(OUTPUT, 'shop-desktop.png'), fullPage: true });
    await sunnyProductCard.locator('a[href^="/shop/"]').first().click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('main').getByText('써니사이드업', { exact: true }).first()).toBeVisible();

    await openHealthy(page, '/concerns');
    await expect(page.getByText('06 CARE', { exact: true })).toBeVisible();
    await page.screenshot({ path: path.join(OUTPUT, 'care-desktop.png'), fullPage: true });

    await openHealthy(page, '/concerns/tear');
    await expect(page.locator('body')).toContainText('눈물 케어');
    await expect(page.getByRole('heading', { name: '눈물 자국, 닦아주는 것만으로 충분할까요?' })).toBeVisible();
    for (const sign of [
      '눈 밑의 갈색·적갈색 자국이 짙어짐',
      '평소보다 눈물 양이 많아짐',
      '노란 눈곱이 생기거나 눈곱 양이 많아짐',
      '한쪽 눈의 눈물만 유독 많아짐',
    ]) {
      await expect(page.getByText(sign, { exact: true })).toBeVisible();
    }
    for (const sign of ['눈이 심하게 붉어지거나 부어오름', '노란색·녹색 눈곱이 계속 생김', '눈이 평소보다 뿌옇게 보임']) {
      await expect(page.getByText(sign, { exact: true })).toBeVisible();
    }
    await page.screenshot({ path: path.join(OUTPUT, 'tear-care-desktop.png'), fullPage: true });
  });

  test('PC 브랜드·B2B 문구와 링크 및 숨김 보험 경로를 확인한다', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openHealthy(page, '/brands');
    await expect(page.getByRole('heading', { name: '우리 아이를 생각한다면, 좋은 선택이 필요합니다.' })).toBeVisible();
    await expect(page.getByText('우리 아이와의 일상에 도움이 되길 바라는 마음으로, 백조오브제가 선택한 브랜드를 소개합니다.')).toBeVisible();
    for (const value of ['WHO', 'VALUE', 'PRINCIPLE', 'SAFETY', 'BELIEF']) {
      await expect(page.getByRole('heading', { name: value, exact: true })).toBeVisible();
    }
    const brandGrid = page.getByTestId('brand-grid');
    const loadMoreBrands = page.getByRole('button', { name: '더 보기', exact: true });
    if (await loadMoreBrands.count()) {
      await loadMoreBrands.click();
    }
    for (const brandName of [
      '노블독',
      '알로밍',
      '오미프로',
      '페네핏',
      '써니사이드업',
      '챠콜스토리',
      'RE:펫',
      '메종슈슈',
    ]) {
      await expect(brandGrid.getByText(brandName, { exact: true })).toBeVisible();
    }
    for (const description of [
      '꾸준한 구강 관리를 고민하는 브랜드',
      '교감의 시간을 제품으로 설계하는 브랜드',
      '몸속의 작은 변화까지 고민하는 영양 브랜드',
      '더 많은 아이들이 함께할 수 있는 식탁을 고민하는 브랜드',
      '연구의 시작부터 생명을 먼저 생각하는 브랜드',
      '숯의 가치를 반려동물에게 전하는 브랜드',
      '펫로스를 가장 가까이에서 경험한 작가가 만드는 브랜드',
      '입히는 대상이 아닌, 함께 살아가는 존재로 대하는 브랜드',
    ]) {
      await expect(page.getByText(description, { exact: true }).first()).toBeVisible();
    }
    await page.screenshot({ path: path.join(OUTPUT, 'brands-desktop.png'), fullPage: true });

    await openHealthy(page, '/brands/b3');
    await expect(page.getByRole('heading', { name: '노블독', exact: true })).toBeVisible();
    await expect(page.getByText('꾸준한 구강 관리가 일상에 자리 잡을 수 있도록 돕는 브랜드', { exact: true })).toBeVisible();
    await expect(page.getByText('구강 · 양치', { exact: true })).toBeVisible();

    const insuranceResponse = await page.goto('/insurance');
    expect(insuranceResponse?.status(), '/insurance redirect HTTP status').toBeLessThan(400);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: '보험 분석 시작하기' })).toHaveCount(0);

    await openHealthy(page, '/b2b');
    await expect(page.getByRole('heading', { name: '반려가족과 만나는 순간을 함께 설계합니다.' })).toBeVisible();
    const partnershipLink = page.getByRole('link', { name: 'B2B 문의하기' }).last();
    await expect(partnershipLink).toHaveAttribute('href', '/landing/care-kit#partner');
    await page.screenshot({ path: path.join(OUTPUT, 'b2b-desktop.png'), fullPage: true });
  });

  test('모바일 메뉴·필터·반응형과 404를 확인한다', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openHealthy(page, '/');
    await expect(page.getByTestId('site-header-logo')).toBeVisible();
    expect((await page.getByTestId('home-hero').boundingBox())?.height).toBeLessThanOrEqual(640);
    expect(decodeURIComponent(await page.getByTestId('home-hero-image').evaluate((image: HTMLImageElement) => image.currentSrc)))
      .toContain('home-hero-pet-lifestyle-mobile');
    expect(decodeURIComponent(await page.getByTestId('home-audit-image').evaluate((image: HTMLImageElement) => image.currentSrc)))
      .toContain('home-audit-client-photo-v4');
    await page.screenshot({ path: path.join(OUTPUT, 'home-mobile.png'), fullPage: false });
    await page.screenshot({ path: path.join(OUTPUT, 'home-mobile-full.png'), fullPage: true });
    await page.getByRole('button', { name: '메뉴 열기' }).click();
    const mobileNav = page.getByRole('navigation', { name: '전체 메뉴' });
    await expect(mobileNav).toBeVisible();
    for (const label of ['셀렉션', '브랜드', '케어', '백조오브제', 'B2B']) {
      await expect(mobileNav.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(mobileNav).not.toContainText('펫보험');
    await page.screenshot({ path: path.join(OUTPUT, 'home-mobile-menu.png') });

    await openHealthy(page, '/shop');
    await page.getByRole('button', { name: /필터/ }).click();
    const mobileFilter = page.getByRole('dialog', { name: '필터' }).or(page.locator('#mobile-filter-title').locator('..'));
    await expect(mobileFilter.getByText('소동물', { exact: true })).toBeVisible();
    await expect(page.locator('body')).not.toContainText('연령');
    await page.screenshot({ path: path.join(OUTPUT, 'shop-mobile-filter.png') });
    await page.getByRole('button', { name: '필터 닫기' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

    await openHealthy(page, '/brands');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    await page.screenshot({ path: path.join(OUTPUT, 'brands-mobile.png'), fullPage: true });

    const response = await page.goto('/not-a-real-page-baekjo-0827', { waitUntil: 'domcontentloaded' });
    expect(response?.status()).toBe(404);
  });
});
