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
    // be/member-suspend-withdraw: 세션 존재만 보던 인증 체크가 requireActiveMember()로 바뀌어
    // status==='active'까지 DB 재검증한다(정지·탈퇴 회원의 주문 생성 차단 — U6 세션 실효).
    // 401 자체는 이 헬퍼 안(requireActiveMember.ts)에서 여전히 unauthenticated 요청에 내려간다.
    const authCheckIndex = route.indexOf('const activeMember = await requireActiveMember();');
    const insertIndex = route.indexOf('await insertOrder(');

    expect(authCheckIndex).toBeGreaterThanOrEqual(0);
    expect(insertIndex).toBeGreaterThan(authCheckIndex);
    expect(route).not.toContain('const memberId = session?.user?.memberId ?? null');
    expect(route).not.toContain('게스트 결제 허용');

    const helper = source('src', 'lib', 'members', 'requireActiveMember.ts');
    expect(helper).toContain("status: 401");
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
