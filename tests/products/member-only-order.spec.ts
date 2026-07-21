import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function source(...segments: string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test.describe('member-only order contract', () => {
  test('POST /api/orders rejects unauthenticated requests before inserting an order', () => {
    const route = source('src', 'app', 'api', 'orders', 'route.ts');
    const authCheckIndex = route.indexOf("return NextResponse.json({ error: 'login-required' }, { status: 401 })");
    const insertIndex = route.indexOf('await insertOrder(');

    expect(authCheckIndex).toBeGreaterThanOrEqual(0);
    expect(insertIndex).toBeGreaterThan(authCheckIndex);
    expect(route).not.toContain('const memberId = session?.user?.memberId ?? null');
    expect(route).not.toContain('게스트 결제 허용');
  });

  test('checkout/cart/login route unauthenticated users through login and back to checkout', () => {
    const checkout = source('src', 'app', 'checkout', 'page.tsx');
    const cart = source('src', 'app', 'cart', 'page.tsx');
    const login = source('src', 'app', 'login', 'page.tsx');
    const storage = source('src', 'lib', 'storage.ts');

    expect(checkout).toContain("router.replace('/login?redirect=/checkout')");
    expect(cart).toContain("const checkoutHref = isLoggedIn() ? '/checkout' : '/login?redirect=/checkout'");
    expect(login).toContain("const redirectTo = params.get('redirect')");
    expect(login).toContain("router.push(resolveLoginRedirect(result.user.role, redirectTo))");
    expect(storage).toContain("throw new Error('login-required')");
  });

  test('wishlist does not fall back to localStorage for unauthenticated users', () => {
    const storage = source('src', 'lib', 'storage.ts');
    const card = source('src', 'components', 'common', 'ProductCard.tsx');
    const detail = source('src', 'components', 'shop', 'ProductDetailClient.tsx');

    expect(storage).toContain('if (response.status === 401) {');
    expect(storage).toContain('return setWishlistCache([])');
    expect(storage).toContain("throw new Error('login-required')");
    expect(storage).not.toContain('toggleLocalWishlist');
    expect(storage).toContain("localStorage.removeItem('baekjo_wishlist')");
    expect(card).toContain("router.push(`/login?redirect=${encodeURIComponent(detailHref)}`)");
    expect(detail).toContain("router.push(`/login?redirect=${encodeURIComponent(`/shop/${product.id}`)}`)");
  });
});
