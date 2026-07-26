import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { getSurface } from '../golden/_lib/fieldSurfaceMatrix';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

function sliceBetween(source: string, startNeedle: string, endNeedle: string): string {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

test.describe('필드 표면 데이터 바인딩 계약', () => {
  test('장바구니 표면은 브랜드명·상품명·옵션·수량·금액을 라이브 상품/브랜드 조인에서 렌더한다', () => {
    const cartPage = src('src', 'app', 'cart', 'page.tsx');
    const cartSurface = getSurface('cart-item');

    expect(cartSurface.assertedThisWave).toBe(true);
    expect(cartSurface.fields.map((field) => field.field)).toEqual([
      'image',
      'brandName',
      'name',
      'optionName',
      'quantity',
      'lineTotal',
    ]);

    expect(cartPage).toContain('Promise.all([getPublicProductsOrNull(), getPublicBrands()])');
    expect(cartPage).toContain(
      "const brandName = product?.brandName || brands.find(b => b.id === product?.brandId)?.name || product?.brandId;",
    );
    expect(cartPage).toContain('{item.brandName}</div>');
    expect(cartPage).toContain('{item.product?.name}');
    expect(cartPage).toContain('옵션: {item.option.name}');
    expect(cartPage).toContain('{item.quantity}');
    expect(cartPage).toContain('formatPrice(item.totalPrice)');
    expect(cartPage).not.toContain('{item.product?.brandId}</div>');
  });

  test('상품 상세 후기 탭은 ReviewViewItem 사진 필드를 버리지 않고 이미지로 렌더한다', () => {
    const tabsClient = src('src', 'components', 'shop', 'ProductTabsClient.tsx');
    const adapters = src('src', 'lib', 'adapters.ts');
    const reviewSurface = getSurface('review-card');

    expect(reviewSurface.assertedThisWave).toBe(true);
    expect(reviewSurface.fields.map((field) => field.field)).toEqual([
      'rating',
      'isBest',
      'title',
      'content',
      'image',
    ]);

    const showcaseMapping = sliceBetween(adapters, 'const showcase = (await getShowcaseReviews())', '// 2. 사용자 작성 데이터');
    expect(showcaseMapping).toContain('image: r.image');
    expect(showcaseMapping).toContain('isPhotoReview: r.isPhotoReview');

    const reviewCardRender = sliceBetween(tabsClient, '{paginatedReviews.map((review) => (', '</div>\n              ))}');
    expect(tabsClient).toContain("import Image from 'next/image';");
    expect(reviewCardRender).toContain('review.isPhotoReview && review.image');
    expect(reviewCardRender).toContain('<Image');
    expect(reviewCardRender).toContain('src={review.image}');
    expect(reviewCardRender).toContain("alt={review.title ? `${review.title} 후기 사진` : '상품 후기 사진'}");
  });
});
