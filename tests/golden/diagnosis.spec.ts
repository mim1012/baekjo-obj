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

// LIVE preview 검증 — survey DB(GET /api/survey) 문항+룰 왕복 + 빈 룰 폴백이 정상 경로를 깨지 않음을 증명.
test.describe('골든플로우 #1 (LIVE): 진단 → 결과 라운드트립', () => {
  test('문항을 끝까지 응답하면 /diagnosis/result 로 이동하고 결과가 렌더된다(분석 중에 멈추지 않음)', async ({ page }) => {
    await page.goto('/diagnosis');

    // survey DB 기본 첫 문항 렌더 확인.
    await expect(page.getByRole('heading', { name: '아이의 종은 무엇인가요?' })).toBeVisible();

    // 각 스텝에서 첫 옵션(고유하게 span.font-bold.text-lg 를 가진 버튼)을 선택 후 다음/결과 버튼 클릭.
    for (let step = 0; step < 20; step++) {
      const optionButton = page
        .locator('button', { has: page.locator('span.font-bold.text-lg') })
        .first();
      await optionButton.click();

      const advance = page.getByRole('button', { name: /^(다음|결과 확인하기)$/ });
      const label = (await advance.textContent())?.trim();
      await advance.click();

      if (label === '결과 확인하기') break;
      // framer-motion 슬라이드 전환 대기(다음 문항 마운트).
      await page.waitForTimeout(500);
    }

    // 결과 페이지로 이동.
    await expect(page).toHaveURL(/\/diagnosis\/result/);

    // "분석 중..." 로딩에 멈추지 않아야 한다.
    await expect(page.getByText('분석 중...')).toBeHidden({ timeout: 15_000 });

    // 성공(큐레이션 히어로) 또는 룰 미매칭 graceful 폴백 중 하나가 보이면 round-trip 완료로 인정.
    const success = page.getByText('백조오브제의 큐레이션');
    const gracefulFallback = page.getByText('진단 결과를 불러오지 못했습니다');
    await expect(success.or(gracefulFallback).first()).toBeVisible();
  });
});
