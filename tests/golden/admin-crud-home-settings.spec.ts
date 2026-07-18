import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /admin/settings → 공개 홈(/) CMS 문구 파이프라인.
//
// 이 도메인은 notices/reviews/concerns와 성격이 다르다 — 항목을 append/delete하는 목록이
// 아니라 site_settings 싱글턴 행 하나를 통째로 PUT하는 편집 화면이다(SiteSettingsProvider.tsx:
// GET /api/settings 로 읽고, PUT /api/admin/settings 로 전체 객체를 덮어쓴다). staging DB의
// 실제 운영 문구를 건드리므로 원본을 스냅샷 → 편집 → 검증 → **반드시 원복**한다. 홈 화면은
// tests/golden/visual.spec.ts의 시각 회귀 대상이기도 해서, 복원에 실패하면 이 스펙과 무관한
// 다른 PR의 시각 회귀가 오탐으로 깨진다 — afterAll의 원복은 테스트 실패 여부와 무관하게 항상
// 실행되어야 한다(Playwright의 test.afterAll은 본문 실패와 무관하게 실행됨을 이용).
//
// 🚨 쓰기(write) 스펙 — 실제 DB에 데이터를 만들고 지운다. E2E_ADMIN_CRUD=1 로 명시적으로
// 켜지 않으면 전체 skip. 절대 production을 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
//
// ⚠️ 싱글턴 설정이라 자기 자신과 동시 실행되면 안 된다 — 이 파일은 테스트 1개뿐이라 원래도
// 병렬 위험이 없지만, 의도를 명시하기 위해 serial로 고정한다(다른 도메인 스펙과의 병렬은
// 별개 DB 행이라 안전).
test.describe.configure({ mode: 'serial' });

test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 홈 문구(사이트 설정)', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const eyebrow = `E2E-히어로-${runId}`;

  // beforeAll에서 찍은 스냅샷을 afterAll이 그대로 되돌린다 — 두 훅 모두 별도 page를 열어
  // 세션에 의존하지 않는다.
  let originalSettings: unknown;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    const res = await page.request.get('/api/settings');
    expect(res.ok()).toBe(true);
    const data = await res.json();
    originalSettings = data.settings;
    // 이전 실행이 크래시로 원복에 실패했다면 eyebrow에 E2E- 마커가 남아있을 수 있다 —
    // 그 상태를 "정상 스냅샷"으로 오인하면 잘못된 값을 계속 복원하게 되므로 최소한 로그로
    // 드러낸다(완전한 자동 복구는 불가능 — 진짜 원본은 이미 유실된 상태일 수 있음).
    const heroEyebrow = (originalSettings as { hero?: { eyebrow?: string } })?.hero?.eyebrow ?? '';
    if (heroEyebrow.startsWith('E2E-히어로-')) {
      console.warn(
        `[admin-crud-home-settings] 이전 실행이 원복에 실패한 것으로 보입니다(hero.eyebrow="${heroEyebrow}"). ` +
          '이 값을 그대로 스냅샷 기준으로 사용합니다 — 진짜 원본 문구는 수동 확인이 필요할 수 있습니다.',
      );
    }
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!originalSettings) return;
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    const restoreRes = await page.request.put('/api/admin/settings', { data: originalSettings });
    if (!restoreRes.ok()) {
      // 원복 실패는 공유 staging 상태를 오염시키는 심각한 상황이라 반드시 시끄럽게 알린다.
      console.error(
        `[admin-crud-home-settings] 원복 PUT 실패(status=${restoreRes.status()}) — 홈 히어로 문구가 ` +
          'E2E 테스트 값으로 남아있을 수 있습니다. /admin/settings에서 수동 확인이 필요합니다.',
      );
    }
    await page.close();
  });

  test('히어로 eyebrow 편집 → 공개 홈에 반영 → 원본으로 복원', async ({ page }) => {
    // ⚠️ admin/settings/page.tsx의 handleSave()는 성공/실패를 DOM 텍스트가 아니라 네이티브
    // window.alert()로 알린다('설정이 저장되었습니다.' / '설정 저장에 실패했습니다...') — getByText로는
    // 절대 못 잡는다(실측: alert는 Playwright가 리스너 없으면 자동으로 닫아버려 그냥 타임아웃 난다).
    // 클릭과 동시에 dialog 이벤트를 기다려 메시지를 읽고 accept한다.
    async function saveAndExpectSuccessAlert() {
      const [dialog] = await Promise.all([
        page.waitForEvent('dialog', { timeout: 15_000 }),
        page.getByRole('button', { name: '변경사항 저장' }).click(),
      ]);
      expect(dialog.message()).toContain('설정이 저장되었습니다');
      await dialog.accept();
    }

    await loginAsAdmin(page);
    await page.goto('/admin/settings');

    // ⚠️ admin/settings/page.tsx의 renderInput()은 <label>과 <input>을 형제 요소로만 렌더한다
    // (htmlFor/id 연결도, label로 감싸지도 않음 — AdminResourcePage의 폼과 다른 패턴이다).
    // getByLabel은 이 구조에서 매치되지 않으므로, 라벨 텍스트를 담은 div.mb-4 블록을 먼저 찾고
    // 그 안의 input을 스코핑한다.
    const eyebrowField = page.locator('div.mb-4', { hasText: '상단 영문 뱃지 (eyebrow)' }).locator('input');
    await expect(eyebrowField).toBeVisible({ timeout: 15_000 });
    await eyebrowField.fill(eyebrow);
    await saveAndExpectSuccessAlert();

    // 공개 홈에 반영되는지 확인 — HomeClient.tsx:102 `{hero.eyebrow}`.
    await page.goto('/');
    await expect(page.locator('body')).toContainText(eyebrow);

    // 원본으로 복원(afterAll과 별개로 테스트 본문에서도 즉시 복원 — afterAll은 안전망).
    await page.goto('/admin/settings');
    const restoreField = page.locator('div.mb-4', { hasText: '상단 영문 뱃지 (eyebrow)' }).locator('input');
    await expect(restoreField).toHaveValue(eyebrow, { timeout: 15_000 });
    const originalEyebrow = (originalSettings as { hero: { eyebrow: string } }).hero.eyebrow;
    await restoreField.fill(originalEyebrow);
    await saveAndExpectSuccessAlert();

    // 공개 홈에서도 원본 문구로 되돌아왔는지 확인 — 이 스펙이 공유 staging 상태를 깨지 않았다는 증거.
    await page.goto('/');
    await expect(page.locator('body')).toContainText(originalEyebrow);
    await expect(page.locator('body')).not.toContainText(eyebrow);
  });
});
