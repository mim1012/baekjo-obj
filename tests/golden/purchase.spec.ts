import { test, expect } from '@playwright/test';

// Golden Flow #2 — 스토어 구매 여정: shop → 상세 → 장바구니 → 결제 → 완료
test.describe('골든플로우 #2: 스토어 구매 여정', () => {
  test.fixme('상품 선택 → 장바구니 → 결제 → 주문완료까지 완결된다', async ({ page }) => {
    await page.goto('/shop');
    // TODO(golden): 첫 상품 클릭 → /shop/[id] 상세
    // TODO(golden): 장바구니 담기 → /cart
    // TODO(golden): 체크아웃 → /checkout 배송/결제 정보 입력
    // TODO(golden): 주문 제출 → /order-complete
    await expect(page).toHaveURL(/\/order-complete/);
  });
});
