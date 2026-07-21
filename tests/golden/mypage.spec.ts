import { test, expect } from '@playwright/test';

// Golden Flow #6 — 회원: 비로그인 상태의 마이페이지 인증 가드
// 신선한 컨텍스트(인증 쿠키/스토리지 없음). 비로그인으로 /mypage 진입 시
// 서버/클라이언트 가드가 로그인으로 유도하고 회원 데이터를 전혀 렌더하지 않아야 한다.
test.describe('골든플로우 #6: 회원 — 마이페이지 인증 가드', () => {
  test('비로그인 /mypage 진입 시 /login으로 리다이렉트되고 회원 데이터가 노출되지 않는다', async ({
    page,
  }) => {
    await page.goto('/mypage');

    // 가드는 mount effect에서 실행되므로 리다이렉트를 waitForURL로 기다린다.
    await page.waitForURL(/\/login\?redirect=%2Fmypage|\/login\?redirect=\/mypage/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login\?redirect=(%2F|\/)mypage/);

    // 회원 데이터 누출 방지: 마이페이지 전용 섹션 헤딩이 보이면 안 된다.
    await expect(page.getByText('최근 주문 내역')).toHaveCount(0);
    await expect(page.getByText('보험 분석 내역')).toHaveCount(0);
  });
});
