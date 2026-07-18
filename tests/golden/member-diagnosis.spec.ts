import { test, expect } from '@playwright/test';

// 골든플로우 #1: 1분 맞춤 진단 — 전 여정(응답 → 결과 매칭 렌더). 읽기 전용·결정적(deterministic)
// 이라 다른 wave와 조율 없이 항상 켜져 있다(E2E_ADMIN_CRUD 게이트 불필요 — DB에 아무것도 쓰지 않음,
// localStorage에 답변 스냅샷만 남기고 매칭은 GET /api/survey 설정을 그대로 읽는다).
//
// 각 문항 첫 번째 옵션만 결정적으로 선택한다 — 특정 결과 룰을 하드코딩하지 않고, "질문에 답하면
// 반드시 어떤 결과 화면이든 뜬다"를 검증한다(룰이 비어있는 관리자 설정이면 안내 화면으로 폴백,
// diagnosis/result/page.tsx:60-76 — 그 경로도 함께 검증).
test.describe('골든플로우 #1: 회원 여정 — 1분 맞춤 진단', () => {
  test('문항에 순차 응답 → 결과 페이지에 추천(브랜드/상품/연계케어) 또는 안내 폴백이 렌더된다', async ({
    page,
  }) => {
    await page.goto('/diagnosis');
    await expect(page.locator('body')).not.toContainText('등록된 진단 문항이 없습니다', { timeout: 15_000 });

    const nextButton = page.getByRole('button', { name: /^(다음|결과 확인하기)$/ });

    // 문항 수를 미리 알 수 없으므로(관리자가 동적으로 관리) 최대 20문항까지 안전 상한을 두고
    // "결과 확인하기"가 뜰 때까지 반복한다 — 매 스텝 첫 번째 옵션을 선택해 진행한다.
    for (let step = 0; step < 20; step += 1) {
      const isLast = (await page.getByRole('button', { name: '결과 확인하기' }).count()) > 0;

      const optionButtons = page.locator('div.grid > button');
      await expect(optionButtons.first()).toBeVisible({ timeout: 15_000 });
      await optionButtons.first().click();

      await nextButton.click();

      if (isLast) break;
    }

    await page.waitForURL(/\/diagnosis\/result/, { timeout: 15_000 });

    // 매칭 실패(룰 없음) 폴백과 매칭 성공 결과 화면 둘 다 유효한 최종 상태다 — 어느 쪽이든
    // "분석 중..." 로딩에 무한정 머물지 않고 사용자에게 뭔가 보여줘야 한다는 게 이 스펙의 핵심.
    await expect(page.getByText('분석 중...')).toHaveCount(0, { timeout: 15_000 });

    const resultHeading = page.getByText('우리 아이를 위한');
    const fallbackHeading = page.getByText('진단 결과를 불러오지 못했습니다');
    await expect(resultHeading.or(fallbackHeading)).toBeVisible({ timeout: 15_000 });
  });
});
