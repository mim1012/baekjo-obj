import { test, expect } from '@playwright/test';

// Golden Flow #7 — 관리자 콘솔 CRUD (⚠️ 클라이언트 주 사용 surface)
// 레거시 데이터 형태가 섞인 픽스처로도 목록/필터가 정상 렌더되는지 반드시 검증.
test.describe('골든플로우 #7: 관리자 콘솔', () => {
  test.fixme('주문/상품/회원 목록이 실데이터로 렌더되고 수정된다', async ({ page }) => {
    await page.goto('/admin');
    // TODO(golden): /admin/orders 목록 렌더 + 주문 상태 변경
    // TODO(golden): /admin/products 등록/수정/삭제
    // TODO(golden): /admin/members 목록·필터 (레거시 데이터 shape 포함)
    await expect(page).toHaveURL(/\/admin/);
  });
});
