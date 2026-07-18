import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// 골든플로우 #2(스토어 구매 여정) 회귀 방지 — 헤더 장바구니 뱃지(getCartCount, localStorage
// 원본 수량 합산)와 /cart 화면(enrichedItems, 노출 상품만 필터링)이 서로 다른 기준으로
// "카트 개수"를 계산해 관리자가 상품을 숨기면 "뱃지엔 2개, 열면 1개"로 어긋나던 버그
// (wave-6 발견)의 재발을 막는다. 자가치유 수정: /cart가 노출 상품 목록을 불러온 직후
// localStorage 자체에서 숨김 상품을 제거해, 헤더 뱃지가 다음 read에서 자연히 맞아떨어지게 한다.

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test.describe('장바구니 뱃지 ↔ 화면 노출상품 자가치유 동기화', () => {
  test('cart.ts는 노출 상품 집합 기준으로 localStorage 카트를 정리하는 함수를 제공한다', () => {
    const cartSource = src('src', 'lib', 'cart.ts');

    expect(cartSource).toContain(
      'export function pruneCartToVisibleProducts(visibleProductIds: Set<string>): CartItem[]',
    );
    const fnBlock = cartSource.slice(cartSource.indexOf('export function pruneCartToVisibleProducts'));
    // 제거된 항목이 없으면 아무 것도 쓰지 않는다(무의미한 리렌더·이벤트 방지).
    expect(fnBlock).toContain('if (removed.length === 0) return removed;');
    // 실제로 지울 때만 localStorage를 다시 쓰고 헤더 뱃지가 구독하는 이벤트를 쏜다.
    expect(fnBlock).toContain("localStorage.setItem(CART_KEY, JSON.stringify(kept));");
    expect(fnBlock).toContain("window.dispatchEvent(new Event('cart-updated'));");
  });

  test('/cart 페이지는 상품 목록을 불러온 직후 자가치유 함수를 호출한다', () => {
    const pageSource = src('src', 'app', 'cart', 'page.tsx');

    expect(pageSource).toContain(
      "import { getCart, updateCartQuantity, removeFromCart, pruneCartToVisibleProducts } from '@/lib/cart';",
    );
    // getPublicProducts()는 is_visible=true만 반환(§api/products/route.ts) — 이 목록이
    // 곧 "유효한 카트 항목" 판정 기준이라 별도 조회 없이 그대로 재사용해야 한다.
    expect(pageSource).toContain(
      'pruneCartToVisibleProducts(new Set(productList.map((product) => product.id)));',
    );
    // 정리 호출이 setProducts보다 먼저 일어나야 이번 렌더에서 getCart()가 이미 정리된
    // 결과를 읽는다(순서가 바뀌면 한 번의 화면 갱신을 더 기다려야 하는 지연 버그가 된다).
    const effectBlock = pageSource.slice(
      pageSource.indexOf('Promise.all([getPublicProducts(), getPublicBrands()])'),
      pageSource.indexOf('});', pageSource.indexOf('Promise.all([getPublicProducts(), getPublicBrands()])')),
    );
    const pruneIdx = effectBlock.indexOf('pruneCartToVisibleProducts(');
    const setProductsIdx = effectBlock.indexOf('setProducts(productList);');
    expect(pruneIdx).toBeGreaterThan(-1);
    expect(setProductsIdx).toBeGreaterThan(-1);
    expect(pruneIdx).toBeLessThan(setProductsIdx);
  });

  test('헤더 뱃지는 여전히 cart-updated 이벤트를 구독해 정리 직후 즉시 반영된다', () => {
    const headerSource = src('src', 'components', 'common', 'Header.tsx');
    expect(headerSource).toContain("window.addEventListener('cart-updated', callback);");
    expect(headerSource).toContain('useSyncExternalStore(subscribeToCart, getCartCount, () => 0)');
  });
});
