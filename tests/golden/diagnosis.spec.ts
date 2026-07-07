import { test, expect } from '@playwright/test';

// Golden Flow #1 — 1분 맞춤 진단 → 결과(추천 상품 + 펫보험)
// 화면/로직 완성 시 test.fixme → test 로 바꾸고 TODO(golden) 채우기.
test.describe('골든플로우 #1: 1분 맞춤 진단', () => {
  test.fixme('문항 응답 → /diagnosis/result에 매칭 상품·보험 추천이 렌더된다', async ({ page }) => {
    await page.goto('/diagnosis');
    // TODO(golden): 객관식 문항 순차 응답 (framer-motion 슬라이드)
    // TODO(golden): 마지막 응답 후 결과 페이지로 이동
    await expect(page).toHaveURL(/\/diagnosis\/result/);
    // TODO(golden): 추천 상품 카드 + 펫보험 추천 노출 단언
  });
});
