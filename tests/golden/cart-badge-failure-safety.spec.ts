import { test, expect } from '@playwright/test';

// CRITICAL 회귀 방지(2026-07-19, PR #173 리뷰에서 발견) — /cart의 자가치유 프루닝
// (pruneCartToVisibleProducts)이 상품 조회 실패를 "노출 상품 0건"으로 오인해 고객
// 장바구니 전체를 영구 삭제하던 사고의 재발을 막는다. 이 스펙은 실제 브라우저에서
// /api/products 응답을 강제로 실패시켜, 그래도 localStorage 카트가 살아남는지 확인한다.
// DB 쓰기가 전혀 없는 순수 클라이언트 시나리오라(route 가로채기만 함) golden-crud처럼
// E2E_ADMIN_CRUD 게이트가 필요 없다 — 항상 돈다(visual.yml에서 매 프리뷰 배포마다 실행).

test('상품 목록 조회가 실패해도 장바구니(localStorage)는 지워지지 않는다', async ({ page }) => {
  const CART_KEY = 'baekjo_cart';

  // 실제 상품 존재 여부는 이 테스트의 관심사가 아니다 — "조회 실패 시 절대 안 지운다"만
  // 검증하면 되므로 임의의 productId로 카트를 미리 심어둔다.
  await page.goto('/');
  await page.evaluate(
    ({ key }) => {
      localStorage.setItem(key, JSON.stringify([{ productId: 'p1', optionId: undefined, quantity: 2 }]));
    },
    { key: CART_KEY },
  );

  // /api/products 조회를 강제로 실패시킨다(네트워크 블립·일시 500 시뮬레이션).
  await page.route('**/api/products*', (route) => route.fulfill({ status: 500, body: '{}' }));

  await page.goto('/cart');
  // CartPage는 productsLoading이 끝나기 전엔 아무 것도 렌더링하지 않는다 — h1을 먼저
  // 기다려야 자가치유 useEffect가 이미 실행된 뒤의 상태를 확인하는 것이 된다.
  await page.getByRole('heading', { name: '장바구니', exact: true }).waitFor({ state: 'visible', timeout: 15_000 });

  const cartAfterFailure = await page.evaluate(
    ({ key }) => {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Array<{ productId: string; quantity: number }>) : null;
    },
    { key: CART_KEY },
  );

  expect(
    cartAfterFailure,
    '상품 조회 실패(500) 시 localStorage 카트가 삭제됨 — 자가치유 프루닝이 실패를 진짜 0건으로 오인했다',
  ).not.toBeNull();
  expect(cartAfterFailure).toHaveLength(1);
  expect(cartAfterFailure?.[0].productId).toBe('p1');
  expect(cartAfterFailure?.[0].quantity).toBe(2);
});
