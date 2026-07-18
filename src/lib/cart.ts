import { CartItem, Product } from '@/types';

const CART_KEY = 'baekjo_cart';

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : [];
}

export const getCartItems = getCart;

export function addToCart(item: CartItem): CartItem[] {
  const cart = getCart();
  const idx = cart.findIndex(
    (c) => c.productId === item.productId && c.optionId === item.optionId
  );
  if (idx >= 0) {
    cart[idx].quantity += item.quantity;
  } else {
    cart.push(item);
  }
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('cart-updated'));
  return cart;
}

export function updateCartQuantity(
  productId: string,
  optionId: string | undefined,
  quantity: number
): CartItem[] {
  const cart = getCart();
  const idx = cart.findIndex(
    (c) => c.productId === productId && c.optionId === optionId
  );
  if (idx >= 0) {
    if (quantity <= 0) {
      cart.splice(idx, 1);
    } else {
      cart[idx].quantity = quantity;
    }
  }
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('cart-updated'));
  return cart;
}

export function removeFromCart(
  productId: string,
  optionId?: string
): CartItem[] {
  let cart = getCart();
  cart = cart.filter(
    (c) => !(c.productId === productId && c.optionId === optionId)
  );
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('cart-updated'));
  return cart;
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event('cart-updated'));
}

export function getCartCount(): number {
  return getCart().reduce((sum, item) => sum + item.quantity, 0);
}

/**
 * 카트를 "현재 노출 중인" 상품 id 집합 기준으로 정리한다(자가치유). 관리자가 상품을
 * 숨기거나 삭제하면 그 상품은 더 이상 유효한 카트 항목이 아니다 — 카트 페이지는 이미
 * enrichedItems 단계에서 그런 항목을 걸러 화면에는 안 보여주지만, localStorage 자체는
 * 손대지 않아 헤더 뱃지(getCartCount, localStorage 원본 수량 합산)만 옛 개수를 계속
 * 보여주는 불일치가 있었다(wave-6 발견, "뱃지엔 2개인데 열면 1개"). 카트 페이지가 상품
 * 목록을 불러온 직후 이 함수로 localStorage 자체를 정리해야 뱃지도 다음 read에서
 * 자연히 맞아떨어진다. 제거된 항목이 있을 때만 쓰고 'cart-updated'를 쏜다(무의미한
 * 리렌더 방지 — addToCart 등과 동일하게 변경이 실제로 있을 때만 이벤트 발행).
 */
export function pruneCartToVisibleProducts(visibleProductIds: Set<string>): CartItem[] {
  const cart = getCart();
  const removed = cart.filter((item) => !visibleProductIds.has(item.productId));
  if (removed.length === 0) return removed;

  const kept = cart.filter((item) => visibleProductIds.has(item.productId));
  localStorage.setItem(CART_KEY, JSON.stringify(kept));
  window.dispatchEvent(new Event('cart-updated'));
  return removed;
}

// products 는 이 함수를 부르는 화면이 (repo/공개 API 로 읽어온) 최신 카탈로그를 넘긴다.
// cart.ts 는 클라이언트 번들에 포함되므로 mock 데이터나 서버 repo 를 정적 import 하지 않는다.
export function calculateCartTotal(products: Product[], items: CartItem[] = getCart()) {
  const productsTotal = items.reduce((total, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    if (!product || product.price === null || product.price === undefined) return total;
    const option = product.options?.find((candidate) => candidate.id === item.optionId);
    const unitPrice = (product.salePrice ?? product.price) + (option?.priceDiff ?? option?.price ?? 0);
    return total + unitPrice * item.quantity;
  }, 0);
  const deliveryFee = productsTotal > 0 && productsTotal < 50000 ? 3000 : 0;
  return {
    productsTotal,
    deliveryFee,
    total: productsTotal + deliveryFee,
  };
}
