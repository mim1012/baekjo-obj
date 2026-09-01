import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test.describe('브랜드 배송정책의 상품 상세 공통 바인딩', () => {
  test('상품 상세가 조회한 브랜드 정책을 두 상품 정보 표면에 전달한다', () => {
    const page = src('src', 'app', 'shop', '[id]', 'page.tsx');

    expect(page).toContain('getCachedPublicBrandById(product.brandId)');
    expect(page).not.toContain('brandShipping={brand?.shipping}');
    expect(page).toContain('<ProductPurchaseInfo product={product} />');
  });

  test('상품 상세 정책은 공통 기본 문구 없이 브랜드 정책이 없으면 숨긴다', () => {
    const detailClient = src('src', 'components', 'shop', 'ProductDetailClient.tsx');
    const purchaseInfo = src('src', 'components', 'shop', 'ProductPurchaseInfo.tsx');

    expect(detailClient).toContain('product.shippingFee');
    expect(detailClient).not.toContain('brandShipping');
    expect(detailClient).not.toContain('DEFAULT_COMMERCE_POLICY');
    expect(purchaseInfo).toContain('if (!hasPolicy) return null;');
    expect(purchaseInfo).not.toContain('brandShipping');
    expect(purchaseInfo).not.toContain('DEFAULT_COMMERCE_POLICY');
    expect(purchaseInfo).toContain('product.deliveryEstimate');
    expect(purchaseInfo).toContain('product.shippingNotice');
    expect(purchaseInfo).toContain('product.returnNotice');
    expect(purchaseInfo).toContain('product.sellerName');
    expect(purchaseInfo).toContain('title="배송 유의사항"');
    expect(purchaseInfo).toContain('title="판매자"');
    expect(purchaseInfo).toContain('title="출고 예정"');
    expect(purchaseInfo).toContain('title="교환·반품 안내"');
  });

  test('브랜드 상세와 상품 상세가 같은 Brand.shipping 소스를 사용한다', () => {
    const brandInfo = src('src', 'components', 'brands', 'BrandShippingInfo.tsx');
    const detailPage = src('src', 'app', 'brands', '[id]', 'page.tsx');

    expect(detailPage).toContain('<BrandShippingInfo brand={brand} />');
    expect(brandInfo).toContain('const shipping = brand.shipping;');
  });
});
