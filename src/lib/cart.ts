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
