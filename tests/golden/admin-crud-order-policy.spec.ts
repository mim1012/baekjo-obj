import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /admin/order-policy → 무통장입금 자동취소 singleton config.
//
// ⚠️ 이 config는 admin-crud-orders.spec.ts가 만드는 실제 무통장입금 주문의 만료(expiresAt) 계산에
// 쓰인다(POST /api/orders가 생성 시점에 읽음, src/app/api/orders/route.ts). bankTransferAutoCancelEnabled
// 를 이 스펙이 잠시 true로 바꾸는 동안 다른 스펙이 무통장 주문을 생성하면 그 주문에 영구적으로 만료
// 시각이 찍히고, 이 스펙이 원복해도 이미 생성된 주문의 만료는 되돌릴 수 없다(생성 시점 고정, config.ts
// 주석 확인) — 그래서 이 스펙은 반드시 orders 스펙과 격리 실행(동시 실행 금지, 파일 순서로 직렬화)한다.
//
// 🚨 쓰기(write) 스펙 — 실제 DB 싱글턴 설정을 편집한다. E2E_ADMIN_CRUD=1 로 명시적으로 켜지 않으면
// 전체 skip. 절대 production을 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
test.describe.configure({ mode: 'serial' });

test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 주문 정책(무통장입금 자동취소)', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  // 원본은 항상 비활성(2026-07-18 결정: 무통장 자동취소 미사용)일 것으로 예상되지만, 스냅샷을 실측해
  // 그대로 복원한다 — 하드코딩된 기본값을 "원본"으로 가정하지 않는다(home-settings 스펙과 동일 원칙).
  let originalConfig: { bankTransferAutoCancelEnabled: boolean; bankTransferTtlHours: number } | undefined;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    const res = await page.request.get('/api/admin/order-policy');
    expect(res.ok()).toBe(true);
    originalConfig = await res.json();
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!originalConfig) return;
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    const restoreRes = await page.request.put('/api/admin/order-policy', { data: originalConfig });
    if (!restoreRes.ok()) {
      // 원복 실패는 orders 스펙이 만드는 실제 주문의 만료 계산에 영향을 주는 심각한 상황이라
      // 반드시 시끄럽게 알린다 — home-settings와 동일한 원칙.
      console.error(
        `[admin-crud-order-policy] 원복 PUT 실패(status=${restoreRes.status()}) — 주문 정책이 ` +
          'E2E 테스트 값으로 남아있을 수 있습니다. /admin/order-policy에서 수동 확인이 필요합니다.',
      );
    }
    await page.close();
  });

  test('자동취소 토글+기한 편집 → 저장 반영 확인 → 원본으로 복원', async ({ page }) => {
    await loginAsAdmin(page);
    // ⚠️ 이 화면도 loaded 게이트가 있다(page.tsx:50 `if (!loaded || loadError || saving) return;`) —
    // GET 이 resolve 되기 전에 저장을 누르면 조용히 no-op 한다(home-settings/concerns와 동일 클래스의
    // 레이스). GET 을 명시적으로 기다린다.
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/order-policy') && res.request().method() === 'GET'),
      page.goto('/admin/order-policy'),
    ]);

    const checkbox = page.getByRole('checkbox', { name: '자동취소 사용' });
    const ttlInput = page.locator('#bank-transfer-ttl');
    const saveButton = page.getByRole('button', { name: /^저장/ });
    const feedback = page.locator('p[aria-live="polite"]');

    // 원본과 다른 조합으로 편집 — 활성화 + 임의 TTL(범위 내: 1~720)을 원본과 다르게 골라 대비를 만든다.
    const original = originalConfig!;
    const editedTtl = original.bankTransferTtlHours === 48 ? 96 : 48;

    await expect(checkbox).toBeEnabled({ timeout: 15_000 });
    if (!(await checkbox.isChecked())) {
      await checkbox.check();
    }
    await expect(ttlInput).toBeEnabled();
    await ttlInput.fill(String(editedTtl));
    await saveButton.click();

    await expect(feedback).toContainText(`${editedTtl}시간`, { timeout: 15_000 });

    // 새로고침 후에도 유지되는지 확인 — "저장은 됐는데 새로고침하면 되돌아온다" 버그 클래스 방지.
    await page.reload();
    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/admin/order-policy') && res.request().method() === 'GET'),
    ]);
    await expect(checkbox).toBeChecked({ timeout: 15_000 });
    await expect(ttlInput).toHaveValue(String(editedTtl));

    // API 재조회로도 이중 확인(화면 상태만 신뢰하지 않는다 — products/brands 스펙과 동일 원칙).
    const verifyRes = await page.request.get('/api/admin/order-policy');
    expect(verifyRes.ok()).toBe(true);
    const verified = await verifyRes.json();
    expect(verified.bankTransferAutoCancelEnabled).toBe(true);
    expect(verified.bankTransferTtlHours).toBe(editedTtl);

    // 부정 케이스 — bankTransferTtlHours가 숫자가 아니면 400으로 거부되고 DB는 그대로다
    // (isOrderPolicyShape, order-policy/route.ts:19-23).
    const invalidRes = await page.request.put('/api/admin/order-policy', {
      data: { bankTransferAutoCancelEnabled: true, bankTransferTtlHours: 'not-a-number' },
    });
    expect(invalidRes.status()).toBe(400);
    const unchangedRes = await page.request.get('/api/admin/order-policy');
    const unchanged = await unchangedRes.json();
    expect(
      unchanged.bankTransferTtlHours,
      '깨진 페이로드가 실제로 저장돼 TTL이 바뀌었습니다',
    ).toBe(editedTtl);

    // 원본으로 복원(afterAll과 별개로 테스트 본문에서도 즉시 복원 — afterAll은 안전망).
    if (!original.bankTransferAutoCancelEnabled) {
      await checkbox.uncheck();
    }
    // TTL input은 자동취소가 꺼지면 disabled 되어 값 수정이 불가하다 — 체크 상태를 먼저 원복 방향으로
    // 맞춘 뒤 TTL을 채운다(비활성 상태에서도 fill 시도 시 disabled input이라 실패할 수 있음을 방지).
    if (original.bankTransferAutoCancelEnabled) {
      await ttlInput.fill(String(original.bankTransferTtlHours));
    }
    await saveButton.click();
    await expect(feedback).toBeVisible({ timeout: 15_000 });

    const restoredRes = await page.request.get('/api/admin/order-policy');
    expect(restoredRes.ok()).toBe(true);
    const restored = await restoredRes.json();
    expect(restored.bankTransferAutoCancelEnabled).toBe(original.bankTransferAutoCancelEnabled);
    if (original.bankTransferAutoCancelEnabled) {
      expect(restored.bankTransferTtlHours).toBe(original.bankTransferTtlHours);
    }
  });
});
