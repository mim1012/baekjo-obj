import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /admin/categories → 공개 /shop 카테고리 필터.
//
// ⚠️ 이 화면은 즉시저장(2026-07-18 전환)이라 notices류(등록→저장→삭제 각각 별도 PUT)와 다르게
// 추가·삭제는 즉시 PUT, 이름 수정만 blur-commit이다(page.tsx:60-83). 배치 저장 버튼이 없다.
//
// ⚠️ productCategories/lifestyleCategories는 ShopContent.tsx:160이 그대로 필터 옵션으로 렌더한다
// (실시간 config, 하드코딩 아님) — 이 스펙의 테스트 카테고리가 /shop 필터에 실제로 나타난다.
// 삭제 정리를 놓치면 공개 화면에 "E2E-카테고리-..." 같은 이상한 필터가 계속 남는다.
//
// 🚨 쓰기(write) 스펙 — 실제 DB 싱글턴 설정(productCategories 배열)에 항목을 추가·삭제한다.
// E2E_ADMIN_CRUD=1 로 명시적으로 켜지 않으면 전체 skip. 절대 production을 겨냥하지 말 것.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 카테고리(상품 카테고리)', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const name = `E2E-카테고리-${runId}`;
  const renamedName = `E2E-카테고리-수정-${runId}`;

  /** '상품 카테고리' 편집 카드로 스코핑 — 같은 화면에 '라이프스타일 카테고리' 카드가 나란히 있고
   * 둘 다 '추가' 버튼·placeholder="항목 이름" 입력을 공유해 스코프 없이는 어느 컬럼인지 모호하다.
   * ⚠️ `locator('div', {has: heading})` 방식은 실측 결과 `.first()`가 가장 안쪽(카드 하나)이 아니라
   * 가장 바깥(두 카드를 모두 감싸는 grid wrapper)을 반환해 두 카드의 '추가' 버튼이 동시에 잡히는
   * strict-mode 위반을 냈다(문서 순서상 조상 div가 먼저 나옴). 카드 하나(h-[500px])까지 정확히
   * 타고 올라가는 xpath ancestor로 바꿔 스코프를 명확히 한다.
   */
  function productCategoryCard(page: import('@playwright/test').Page) {
    return page
      .getByRole('heading', { name: '상품 카테고리', exact: true })
      .locator('xpath=ancestor::div[contains(@class,"h-[500px]")][1]');
  }

  /**
   * commit()은 loaded(provider의 GET이 resolve됐다는 React state)가 true여야만 실제로 PUT을
   * 보낸다(page.tsx:34). page.goto/reload 직후 `waitForResponse`로 GET '네트워크 응답'은 확인해도,
   * 그 응답을 앱이 `.then(setLoaded(true))`로 React state에 반영하는 건 별도의 비동기 틱이라
   * 아주 짧은 간극이 있다 — 이 틈에 fill()/click()이 들어가면 updateItemLocal/commit이 `!loaded`
   * 가드에 걸려 조용히 no-op하고(대상 PUT이 영영 안 뜸), waitForResponse가 타임아웃난다(실측,
   * 재현 2회). 액션을 재시도 가능하게 감싸 loaded가 실제로 true가 된 뒤의 재시도가 성공하게 한다.
   */
  async function retryUntilPutFires(
    page: import('@playwright/test').Page,
    action: () => Promise<void>,
  ): Promise<void> {
    await expect(async () => {
      const putPromise = page
        .waitForResponse(
          (res) => res.url().includes('/api/admin/category-settings') && res.request().method() === 'PUT',
          { timeout: 2_000 },
        )
        .catch(() => null);
      await action();
      const res = await putPromise;
      expect(res, 'PUT이 발생하지 않음 — loaded 게이트 레이스로 재시도 필요').toBeTruthy();
    }).toPass({ timeout: 20_000 });
  }

  /** 잔여 E2E 테스트 카테고리를 정리한다 — 이름 매칭 행을 전부 찾아 삭제 버튼 클릭(즉시 PUT). */
  async function cleanupStaleCategories(page: import('@playwright/test').Page): Promise<void> {
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/category-settings') && res.request().method() === 'GET'),
      page.goto('/admin/categories'),
    ]);
    const card = productCategoryCard(page);

    for (let i = 0; i < 10; i += 1) {
      const rows = card.locator('input[placeholder="항목 이름"]');
      const count = await rows.count();
      let found = false;
      for (let idx = 0; idx < count; idx += 1) {
        const value = await rows.nth(idx).inputValue();
        if (value.startsWith('E2E-카테고리-')) {
          const row = rows.nth(idx).locator('xpath=ancestor::div[contains(@class,"group")][1]');
          await retryUntilPutFires(page, async () => {
            await row.getByRole('button').last().click();
          });
          found = true;
          break;
        }
      }
      if (!found) break;
    }
  }

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupStaleCategories(page);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await cleanupStaleCategories(page);
    await page.close();
  });

  test('등록 → 새로고침 후 영속 확인 → 이름 수정(blur-commit) → 새로고침 후 반영 → 삭제 → 새로고침 후 사라짐', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/category-settings') && res.request().method() === 'GET'),
      page.goto('/admin/categories'),
    ]);

    const card = productCategoryCard(page);
    const addButton = card.getByRole('button', { name: '추가' });

    // 1) 등록 — 추가 버튼은 클릭 즉시 '새 항목' 이름으로 PUT한다(입력 폼 없음, page.tsx:60-62).
    // ⚠️ 여기(로그인 리다이렉트 직후 첫 상호작용)는 실측 2회 모두 재시도 없이 안정적으로 통과했다 —
    // retryUntilPutFires로 감싸지 않는다(추가는 클릭마다 새 행을 만들어 재시도가 중복 생성 위험을
    // 낳는다 — 재시도가 실제로 필요한 지점(신선한 재탐색 직후)에서만 쓴다, 아래 3)·4) 참고).
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/category-settings') && res.request().method() === 'PUT'),
      addButton.click(),
    ]);

    // 새로 추가된 항목은 리스트 맨 끝에 붙는다.
    const newRowInput = card.locator('input[placeholder="항목 이름"]').last();
    await expect(newRowInput).toHaveValue('새 항목', { timeout: 15_000 });

    // 이름을 테스트 마커로 채운 뒤 blur(Tab)로 커밋 — 키 입력마다 PUT하지 않고 blur 시에만 PUT된다.
    await newRowInput.fill(name);
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/category-settings') && res.request().method() === 'PUT'),
      newRowInput.press('Tab'),
    ]);

    // 2) 새로고침 후 영속 확인.
    // ⚠️ goto/reload 뒤에 waitForResponse를 순차로 호출하면(goto가 'load' 이벤트까지만 기다리고
    // 클라이언트 fetch는 그 이후에 register되므로 이론상 안전해 보이지만) 실측에서 레이스가 났다 —
    // Promise.all로 탐색과 응답 대기를 짝지어 놓쳤을 GET을 확실히 잡는다(home-settings/order-policy
    // 스펙과 동일한, 이미 검증된 안전 패턴).
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/category-settings') && res.request().method() === 'GET'),
      page.reload(),
    ]);
    const persistedInput = card.locator(`input[value="${name}"]`);
    await expect(persistedInput).toBeVisible({ timeout: 15_000 });

    // 공개 /shop 필터에도 실제로 반영되는지 확인(ShopContent.tsx:160 — 하드코딩이 아니라 실시간 config).
    await page.goto('/shop');
    await expect(page.locator('body')).toContainText(name, { timeout: 15_000 });

    // 3) 이름 수정(blur-commit) — 재확인.
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/category-settings') && res.request().method() === 'GET'),
      page.goto('/admin/categories'),
    ]);
    // ⚠️ `input[value="${name}"]` 같은 값-기반 CSS 셀렉터는 안 된다 — React 컨트롤드 인풋은 값이
    // 바뀌어도 초기 렌더 시점의 HTML value 속성이 그대로 남고(런타임엔 프로퍼티만 바뀜), 그래서
    // fill()로 값을 바꾼 뒤 재시도가 같은 셀렉터로 다시 element를 찾으려 하면 더 이상 매치되지 않아
    // 타임아웃난다(실측). 이 항목은 등록 단계에서 맨 끝에 추가됐고 이후 순서가 안 바뀌므로 위치
    // 기반(.last())으로 찾아 fill 재시도에도 안정적으로 재사용한다.
    const editInput = productCategoryCard(page).locator('input[placeholder="항목 이름"]').last();
    await expect(editInput).toHaveValue(name, { timeout: 15_000 });
    // fill 도 updateItemLocal(loaded 가드)을 거치므로, blur뿐 아니라 fill부터 재시도 대상에 포함한다
    // (fill이 loaded=false 시점에 드롭되면 dirty가 안 서서 이후 blur는 안전하게 no-op 하기 때문).
    await retryUntilPutFires(page, async () => {
      await editInput.fill(renamedName);
      await editInput.press('Tab');
    });

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/category-settings') && res.request().method() === 'GET'),
      page.reload(),
    ]);
    await expect(productCategoryCard(page).locator(`input[value="${renamedName}"]`)).toBeVisible({ timeout: 15_000 });

    await page.goto('/shop');
    await expect(page.locator('body')).toContainText(renamedName, { timeout: 15_000 });
    await expect(page.locator('body')).not.toContainText(name);

    // 4) 삭제 — 즉시 PUT, 확인 다이얼로그 없음(page.tsx:81-83).
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/category-settings') && res.request().method() === 'GET'),
      page.goto('/admin/categories'),
    ]);
    const deleteCard = productCategoryCard(page);
    const targetRow = deleteCard
      .locator(`input[value="${renamedName}"]`)
      .locator('xpath=ancestor::div[contains(@class,"group")][1]');
    await retryUntilPutFires(page, async () => {
      await targetRow.getByRole('button').last().click();
    });

    // 5) 새로고침 후 사라짐 확인 + 공개 /shop 필터에서도 사라짐.
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/category-settings') && res.request().method() === 'GET'),
      page.reload(),
    ]);
    await expect(productCategoryCard(page).locator(`input[value="${renamedName}"]`)).toHaveCount(0, {
      timeout: 15_000,
    });

    await page.goto('/shop');
    await expect(page.locator('body')).not.toContainText(renamedName);
  });
});
