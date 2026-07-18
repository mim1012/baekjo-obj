import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CRUD_ENABLED,
  bypassHeaders,
  loginAsAdmin,
} from './_lib/adminCrudHelpers';
import type { SurveyConfig } from '@/lib/survey/config';

// 골든플로우 #1 — 관리자 CRUD 실구동: /admin/survey(맞춤 진단 설계) → 공개 진단(/diagnosis) 문항.
//
// 이 도메인은 notices/home-settings보다 흐름이 길다 — 관리자가 설문 config(questions+rules)를
// 편집하면, 실제 방문자가 /diagnosis를 완주해야 /diagnosis/result가 추천을 보여준다. 서버는
// questions·rules 각각 최소 1개 이상을 강제한다(src/app/api/admin/survey/route.ts:17-26의
// isSurveyConfig — 비면 400, rules가 비면 결과 화면이 "분석 중..."에서 영원히 멈춘다).
// 그래서 이 스펙은 문항을 추가/삭제하지 않고, 기존 문항 중 정확히 하나(첫 번째 문항)의
// title 텍스트에만 E2E 마커를 덧붙인다 — 구조가 절대 invalid해질 수 없고, 원복도 텍스트
// 하나만 되돌리면 되므로 손실이 없다.
//
// ⚠️ 첫 번째 문항을 고른 이유: src/app/diagnosis/page.tsx는 currentStep=0으로 시작해 항상
// questions[0]을 먼저 렌더한다(dependsOn 필드가 타입엔 있지만 이 페이지에서 필터링에 쓰이지
// 않는다 — 실측). 그래서 /diagnosis/result처럼 여러 단계를 다 답해야 하는 화면까지 갈 필요
// 없이, 공개 /diagnosis에 바로 들어가는 것만으로 수정된 문항 텍스트를 확인할 수 있다.
// /diagnosis/result는 localStorage에 답변이 없으면 /diagnosis로 즉시 리다이렉트하므로
// (result/page.tsx:23-26) 이 스펙에서 검증하지 않는다 — rules를 건드리지 않으니 결과 매칭
// 로직 자체는 이 스펙의 관심사가 아니고, 완주 흐름을 굳이 시뮬레이션하는 복잡도는 이득에
// 비해 크다고 판단했다. 대신 관리자 UI 반영 + 공개 GET /api/survey 직접 조회 + 공개
// /diagnosis 첫 문항 렌더까지 3중으로 검증한다.
//
// ⚠️ admin/survey/page.tsx의 handleSave()도 home-settings와 동일하게 DOM 텍스트가 아니라
// 네이티브 window.alert()로 성공/실패를 알린다('진단 설문 설정을 저장했습니다.' /
// '저장에 실패했습니다...') — page.waitForEvent('dialog')로 클릭과 동시에 잡아야 한다.
//
// 🚨 쓰기(write) 스펙 — 실제 DB(survey_config 싱글턴 행)를 편집한다. E2E_ADMIN_CRUD=1 로
// 명시적으로 켜지 않으면 전체 skip. 절대 production을 겨냥하지 말 것 — 대상은 Preview/staging뿐.
//
// ⚠️ 싱글턴 설정이라 자기 자신과 동시 실행되면 안 된다 — home-settings와 동일하게 serial 고정.
test.describe.configure({ mode: 'serial' });

test.describe('골든플로우 #1: 관리자 CRUD 실구동 — 맞춤 진단 설문', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const marker = `-E2E-${runId}`;

  // beforeAll에서 찍은 스냅샷을 afterAll이 그대로 되돌린다 — 두 훅 모두 별도 page를 열어
  // 세션에 의존하지 않는다(home-settings.spec.ts와 동일 패턴).
  let originalConfig: SurveyConfig | undefined;
  let originalFirstTitle: string;
  let editedFirstTitle: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    // GET /api/survey는 공개 라우트라 로그인 없이 조회 가능(src/app/api/survey/route.ts).
    const res = await page.request.get('/api/survey');
    expect(res.ok()).toBe(true);
    const data = (await res.json()) as SurveyConfig;
    expect(Array.isArray(data.questions)).toBe(true);
    expect(data.questions.length).toBeGreaterThan(0);
    originalConfig = data;
    originalFirstTitle = data.questions[0].title;
    editedFirstTitle = `${originalFirstTitle}${marker}`;

    // 이전 실행이 크래시로 원복에 실패했다면 첫 문항 title에 E2E 마커가 남아있을 수 있다 —
    // 그 상태를 "정상 스냅샷"으로 오인하면 잘못된 값을 계속 복원하게 되므로 최소한 로그로 드러낸다
    // (완전한 자동 복구는 불가능 — 진짜 원본 텍스트는 이미 유실된 상태일 수 있음).
    if (/-E2E-\d+$/.test(originalFirstTitle)) {
      console.warn(
        `[admin-crud-survey] 이전 실행이 원복에 실패한 것으로 보입니다(첫 문항 title="${originalFirstTitle}"). ` +
          '이 값을 그대로 스냅샷 기준으로 사용합니다 — 진짜 원본 문구는 수동 확인이 필요할 수 있습니다.',
      );
    }
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!originalConfig) return;
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    const restoreRes = await page.request.put('/api/admin/survey', { data: originalConfig });
    if (!restoreRes.ok()) {
      // 원복 실패는 공유 staging 상태를 오염시키는 심각한 상황이라 반드시 시끄럽게 알린다.
      console.error(
        `[admin-crud-survey] 원복 PUT 실패(status=${restoreRes.status()}) — 진단 설문 첫 문항이 ` +
          'E2E 테스트 값으로 남아있을 수 있습니다. /admin/survey에서 수동 확인이 필요합니다.',
      );
    }
    await page.close();
  });

  test('첫 문항 title 편집 → 관리자 UI+공개 GET+공개 진단화면 반영 → 원본으로 복원', async ({ page }) => {
    // home-settings.spec.ts와 동일한 alert 처리 — 클릭과 동시에 dialog 이벤트를 기다린다.
    async function saveAndExpectSuccessAlert() {
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog', { timeout: 15_000 }),
        page.getByRole('button', { name: '설정 저장' }).click(),
      ]);
      expect(dialog.message()).toContain('저장했습니다');
      await dialog.accept();
    }

    await loginAsAdmin(page);
    await page.goto('/admin/survey');

    const questionsHeading = page.getByRole('heading', { name: '진단 문항', level: 2 });
    await expect(questionsHeading).toBeVisible({ timeout: 15_000 });
    // "진단 문항" 패널 = h2의 부모 카드(page.tsx: <h2>가 패널 div의 직계 자식) — 이 스코프 안에서만
    // 검색해야 "결과 추천 규칙" 패널의 동일한 "수정" 버튼 텍스트와 섞이지 않는다.
    const questionsPanel = questionsHeading.locator('xpath=..');

    // 1) 첫 문항 카드를 title 텍스트로 특정 → 수정 모달 열기.
    const originalHeading = questionsPanel.getByRole('heading', { level: 3, name: originalFirstTitle, exact: true });
    await expect(originalHeading).toBeVisible({ timeout: 15_000 });
    // h3 → (flex justify-between 래퍼) → (카드 div) — 카드 전체를 스코프로 잡아야 수정/삭제 버튼을 찾는다.
    const originalCard = originalHeading.locator('xpath=../..');
    await originalCard.getByRole('button', { name: '수정' }).click();

    const editModalTitle = page.getByRole('heading', { name: '진단 문항 수정' });
    await expect(editModalTitle).toBeVisible({ timeout: 15_000 });
    const titleInput = page.locator('label', { hasText: '질문 내용' }).locator('input');
    await expect(titleInput).toHaveValue(originalFirstTitle);
    await titleInput.fill(editedFirstTitle);
    await page.getByRole('button', { name: '수정 저장' }).click();
    await expect(editModalTitle).not.toBeVisible({ timeout: 15_000 });

    // 2) 드래프트를 서버에 반영 — 관리자 목록에 수정된 title이 즉시 보인다.
    await expect(questionsPanel.getByRole('heading', { level: 3, name: editedFirstTitle, exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await saveAndExpectSuccessAlert();

    // 3) 새로고침 후에도 관리자 화면에 남아있는지 확인(진짜 DB에 저장됐는지 — notices 스펙의 교훈).
    await page.reload();
    await expect(page.getByRole('heading', { name: '진단 문항', level: 2 })).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole('heading', { level: 3, name: editedFirstTitle, exact: true }),
    ).toBeVisible({ timeout: 15_000 });

    // 4) 공개 GET /api/survey에도 반영됐는지 직접 확인.
    const publicRes = await page.request.get('/api/survey');
    expect(publicRes.ok()).toBe(true);
    const publicConfig = (await publicRes.json()) as SurveyConfig;
    expect(publicConfig.questions[0].title).toBe(editedFirstTitle);

    // 5) 공개 /diagnosis 첫 문항(questions[0], currentStep=0으로 항상 먼저 렌더)에도 반영되는지 확인.
    await page.goto('/diagnosis');
    await expect(page.getByRole('heading', { name: editedFirstTitle, exact: true })).toBeVisible({ timeout: 15_000 });

    // 6) 원본으로 복원(afterAll과 별개로 테스트 본문에서도 즉시 복원 — afterAll은 안전망).
    await page.goto('/admin/survey');
    await expect(page.getByRole('heading', { name: '진단 문항', level: 2 })).toBeVisible({ timeout: 15_000 });
    const editedCard = questionsPanel
      .getByRole('heading', { level: 3, name: editedFirstTitle, exact: true })
      .locator('xpath=../..');
    await editedCard.getByRole('button', { name: '수정' }).click();
    await expect(editModalTitle).toBeVisible({ timeout: 15_000 });
    const restoreInput = page.locator('label', { hasText: '질문 내용' }).locator('input');
    await expect(restoreInput).toHaveValue(editedFirstTitle);
    await restoreInput.fill(originalFirstTitle);
    await page.getByRole('button', { name: '수정 저장' }).click();
    await expect(editModalTitle).not.toBeVisible({ timeout: 15_000 });
    await saveAndExpectSuccessAlert();

    // 7) 원복이 실제로 반영됐는지 재조회해서 비교(추측하지 않는다 — PUT 성공만으로 끝내지 않음).
    const restoredRes = await page.request.get('/api/survey');
    expect(restoredRes.ok()).toBe(true);
    const restoredConfig = (await restoredRes.json()) as SurveyConfig;
    expect(restoredConfig.questions[0].title).toBe(originalFirstTitle);
    expect(restoredConfig.questions.length).toBe(originalConfig!.questions.length);
    expect(restoredConfig.rules.length).toBe(originalConfig!.rules.length);

    await page.goto('/diagnosis');
    await expect(page.getByRole('heading', { name: originalFirstTitle, exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.locator('body')).not.toContainText(editedFirstTitle);
  });
});
