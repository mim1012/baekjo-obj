import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test.describe('상품 상세 브랜드 배송·교환 정책 고지', () => {
  test('상품 상세는 브랜드 정책을 사용하고 공통 기본 문구를 사용하지 않는다', () => {
    const purchaseInfo = src('src', 'components', 'shop', 'ProductPurchaseInfo.tsx');
    const detailClient = src('src', 'components', 'shop', 'ProductDetailClient.tsx');

    expect(purchaseInfo).toContain('const nonBlank = (value: string | undefined) => {');
    expect(purchaseInfo).toContain('if (!hasPolicy) return null;');
    expect(purchaseInfo).not.toContain('brandShipping');
    expect(purchaseInfo).not.toContain('DEFAULT_COMMERCE_POLICY');
    expect(purchaseInfo).toContain('product.deliveryEstimate');
    expect(purchaseInfo).toContain('product.shippingNotice');
    expect(purchaseInfo).toContain('product.returnNotice');
    expect(detailClient).not.toContain("import { DEFAULT_COMMERCE_POLICY } from '@/data/company'");
    expect(detailClient).not.toContain('DEFAULT_COMMERCE_POLICY.shippingLabel');
    expect(detailClient).not.toContain("'공식 판매가 확인 후 안내'");
  });
});
