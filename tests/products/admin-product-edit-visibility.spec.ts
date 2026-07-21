import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function source(...segments: string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('product detail admin edit action is gated by the session user, not local cache only', () => {
  const detailClient = source('src', 'components', 'shop', 'ProductDetailClient.tsx');
  const proxy = source('src', 'proxy.ts');

  expect(detailClient).toContain("import { getSessionUser, getWishlist");
  expect(detailClient).toContain("setIsAdminViewer(user?.role === 'admin')");
  expect(detailClient).not.toContain('getCurrentUser');
  expect(proxy).toContain("pathname.startsWith('/admin') && !isAdmin");
});

test('product review/inquiry and brand partner actions use session user for privileged UI', () => {
  const productTabs = source('src', 'components', 'shop', 'ProductTabsClient.tsx');
  const brandProducts = source('src', 'components', 'brands', 'BrandProductsClient.tsx');

  expect(productTabs).toContain('getSessionUser');
  expect(productTabs).not.toContain('getCurrentUser');
  expect(brandProducts).toContain('getSessionUser');
  expect(brandProducts).not.toContain('getCurrentUser');
});
