import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test.describe('상품 상세 배송·교환 정책 고지', () => {
  test('상품 정책 필드가 빈 문자열이어도 기본 법정 안내 문구로 폴백한다', () => {
    const purchaseInfo = src('src', 'components', 'shop', 'ProductPurchaseInfo.tsx');
    const detailClient = src('src', 'components', 'shop', 'ProductDetailClient.tsx');

    expect(purchaseInfo).toContain('const nonBlank = (value: string | undefined) => {');
    expect(purchaseInfo).toContain('nonBlank(product.deliveryEstimate)');
    expect(purchaseInfo).toContain('nonBlank(product.shippingNotice)');
    expect(purchaseInfo).toContain('nonBlank(product.returnNotice) ?? DEFAULT_COMMERCE_POLICY.returnNotice');
    expect(purchaseInfo).toContain("nonBlank(product.sellerName) ?? '백조오브제 셀렉션'");

    expect(detailClient).toContain("import { DEFAULT_COMMERCE_POLICY } from '@/data/company'");
    expect(detailClient).toContain(': DEFAULT_COMMERCE_POLICY.shippingLabel');
    expect(detailClient).not.toContain("'공식 판매가 확인 후 안내'");
  });
});
