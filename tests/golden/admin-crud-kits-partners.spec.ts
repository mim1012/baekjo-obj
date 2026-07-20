import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  CRUD_ENABLED,
  bypassHeaders,
  deleteMatchingAdminRows,
  loginAsAdmin,
} from './_lib/adminCrudHelpers';

// 골든플로우 #7 — 관리자 콘솔 CRUD 실구동: /admin/kits, /admin/partners (관리자 전용 — 공개 소비자 없음).
//
// kits와 partners는 서로 다른 페이지·DB 행(싱글턴 config 테이블의 별도 row)이라 이 파일 안의
// 두 테스트가 병렬로 돌아도 서로 간섭하지 않는다 — "싱글턴 설정은 자기 자신과 병렬 금지"
// 원칙은 같은 도메인을 두 번 동시에 건드리는 경우를 막는 것이고, 이 파일은 도메인당 테스트가
// 하나뿐이라 애초에 자기-병렬 위험이 없다.
//
// 🚨 쓰기(write) 스펙 — 실제 DB에 데이터를 만들고 지운다. E2E_ADMIN_CRUD=1 로 명시적으로
// 켜지 않으면 전체 skip. 절대 production을 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐.
test.describe('골든플로우 #7: 관리자 CRUD 실구동 — 케어 키트', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const SEARCH_PREFIX = 'E2E-키트-';
  const name = `${SEARCH_PREFIX}${runId}`;
  const editedName = `${name}-수정`;
  const target = `E2E대상-${runId}`;
  const purpose = `E2E목적-${runId}`;
  const itemA = `E2E구성품A${runId}`;
  const itemB = `E2E구성품B${runId}`;
  const KITS_SEARCH_PLACEHOLDER = '키트명, 구성품 검색';

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await deleteMatchingAdminRows(page, '/admin/kits', KITS_SEARCH_PLACEHOLDER, SEARCH_PREFIX);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await deleteMatchingAdminRows(page, '/admin/kits', KITS_SEARCH_PLACEHOLDER, SEARCH_PREFIX);
    await page.close();
  });

  test('등록 → 새로고침 후 영속 확인 → 수정 → 새로고침 후 반영 확인 → 삭제 → 새로고침 후 사라짐', async ({
    page,
  }) => {
    page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });

    await loginAsAdmin(page);
    await page.goto('/admin/kits');

    // 1) 등록 — onCreateRow만 있고 onSave는 없는 화면이라 저장 버튼 라벨은 '저장'(AdminResourcePage.tsx).
    // ⚠️ '키트명'은 검색창 aria-label("키트명, 구성품 검색")과 substring이 겹쳐 exact:true가 필요하다.
    await page.getByRole('button', { name: '키트 등록' }).click();
    await page.getByLabel('키트명', { exact: true }).fill(name);
    await page.getByLabel('키트 유형').selectOption('hospital');
    await page.getByLabel('제공 대상').fill(target);
    await page.getByLabel('제공 목적').fill(purpose);
    await page.getByLabel('주요 구성품(쉼표 구분)').fill(`${itemA}, ${itemB}`);
    await page.getByLabel('재고 수량').fill('5');
    await page.getByLabel('노출 상태').selectOption('true');
    await page.getByRole('button', { name: '저장' }).click();

    const adminRow = page.locator('tr', { hasText: name });
    await expect(adminRow).toBeVisible({ timeout: 15_000 });
    await expect(adminRow).toContainText('병원 비치용');
    await expect(adminRow).toContainText(target);
    await expect(adminRow).toContainText(purpose);
    await expect(adminRow).toContainText(itemA);
    await expect(adminRow).toContainText(itemB);
    await expect(adminRow).toContainText('5개'); // stockLabel
    await expect(adminRow).toContainText('노출중');

    // 2) ⭐ 새로고침 후에도 남아있는지 확인 — 이게 오늘 유실된 버그(draft-only 저장)를 정확히 잡는 지점이다.
    await page.reload();
    const rowAfterReload = page.locator('tr', { hasText: name });
    await expect(rowAfterReload).toBeVisible({ timeout: 15_000 });
    await expect(rowAfterReload).toContainText(target);
    await page.goto('/landing/care-kit');
    const publicBody = page.locator('body');
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(publicBody).toContainText(target);
    await expect(publicBody).toContainText(purpose);
    await expect(publicBody).toContainText(itemA);

    // 3) 수정
    await page.goto('/admin/kits');
    await page.getByPlaceholder(KITS_SEARCH_PLACEHOLDER).fill(name);
    await expect(page.getByRole('button', { name: '수정' })).toHaveCount(1);
    await page.getByRole('button', { name: '수정' }).click();
    await page.getByLabel('키트명', { exact: true }).fill(editedName);
    await page.getByLabel('재고 수량').fill('7');
    await page.getByRole('button', { name: '저장' }).click();
    await expect(page.locator('table')).toContainText(editedName, { timeout: 15_000 });

    // 4) 새로고침 후 수정 내용이 남아있는지 확인.
    await page.reload();
    await page.getByPlaceholder(KITS_SEARCH_PLACEHOLDER).fill(editedName);
    const editedRow = page.locator('tr', { hasText: editedName });
    await expect(editedRow).toBeVisible({ timeout: 15_000 });
    await expect(editedRow).toContainText('7개');
    await page.goto('/landing/care-kit');
    await expect(page.getByRole('heading', { name: editedName, exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);

    // 5) 삭제
    await page.goto('/admin/kits');
    await page.getByPlaceholder(KITS_SEARCH_PLACEHOLDER).fill(editedName);
    await expect(page.getByRole('button', { name: '삭제' })).toHaveCount(1);
    await page.getByRole('button', { name: '삭제' }).click();
    await expect(page.locator('table')).not.toContainText(editedName, { timeout: 15_000 });

    // 6) 새로고침 후 완전히 사라졌는지 확인(삭제가 진짜 DB에 반영됐는지 검증).
    await page.reload();
    await page.getByPlaceholder(KITS_SEARCH_PLACEHOLDER).fill(editedName);
    await expect(page.getByRole('button', { name: '수정' })).toHaveCount(0);
    await page.goto('/landing/care-kit');
    await expect(page.getByRole('heading', { name: editedName, exact: true })).toHaveCount(0);
  });
});

test.describe('골든플로우 #7: 관리자 CRUD 실구동 — B2B 제휴처', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 로그인 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const SEARCH_PREFIX = 'E2E-제휴처-';
  const name = `${SEARCH_PREFIX}${runId}`;
  const editedName = `${name}-수정`;
  const contactPerson = `E2E담당자${runId}`;
  const phone = '010-0000-0000';
  const PARTNERS_SEARCH_PLACEHOLDER = '제휴처명, 담당자 검색';

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await deleteMatchingAdminRows(page, '/admin/partners', PARTNERS_SEARCH_PLACEHOLDER, SEARCH_PREFIX);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(page);
    await deleteMatchingAdminRows(page, '/admin/partners', PARTNERS_SEARCH_PLACEHOLDER, SEARCH_PREFIX);
    await page.close();
  });

  test('등록 → 새로고침 후 영속 확인 → 수정 → 새로고침 후 반영 확인 → 삭제 → 새로고침 후 사라짐', async ({
    page,
  }) => {
    page.on('dialog', (dialog) => {
      dialog.accept().catch(() => {});
    });

    await loginAsAdmin(page);
    await page.goto('/admin/partners');

    // 1) 등록 — '제휴처명'·'담당자' 둘 다 검색창 aria-label("제휴처명, 담당자 검색")과
    // substring이 겹쳐 exact:true가 필요하다.
    await page.getByRole('button', { name: '제휴처 등록' }).click();
    await page.getByLabel('제휴처명', { exact: true }).fill(name);
    await page.getByLabel('분류').selectOption('hospital');
    await page.getByLabel('담당자', { exact: true }).fill(contactPerson);
    await page.getByLabel('연락처').fill(phone);
    await page.getByLabel('상태').selectOption('상담중');
    await page.getByRole('button', { name: '저장' }).click();

    const adminRow = page.locator('tr', { hasText: name });
    await expect(adminRow).toBeVisible({ timeout: 15_000 });
    await expect(adminRow).toContainText('동물병원');
    await expect(adminRow).toContainText(contactPerson);
    await expect(adminRow).toContainText(phone);
    await expect(adminRow).toContainText('상담중');

    // 2) ⭐ 새로고침 후에도 남아있는지 확인 — 이게 오늘 유실된 버그(draft-only 저장)를 정확히 잡는 지점이다.
    await page.reload();
    const rowAfterReload = page.locator('tr', { hasText: name });
    await expect(rowAfterReload).toBeVisible({ timeout: 15_000 });
    await expect(rowAfterReload).toContainText(contactPerson);

    // 3) 수정
    await page.getByPlaceholder(PARTNERS_SEARCH_PLACEHOLDER).fill(name);
    await expect(page.getByRole('button', { name: '수정' })).toHaveCount(1);
    await page.getByRole('button', { name: '수정' }).click();
    await page.getByLabel('제휴처명', { exact: true }).fill(editedName);
    await page.getByLabel('상태').selectOption('제안서 발송');
    await page.getByRole('button', { name: '저장' }).click();
    await expect(page.locator('table')).toContainText(editedName, { timeout: 15_000 });

    // 4) 새로고침 후 수정 내용이 남아있는지 확인.
    await page.reload();
    await page.getByPlaceholder(PARTNERS_SEARCH_PLACEHOLDER).fill(editedName);
    const editedRow = page.locator('tr', { hasText: editedName });
    await expect(editedRow).toBeVisible({ timeout: 15_000 });
    await expect(editedRow).toContainText('제안서 발송');

    // 5) 삭제
    await expect(page.getByRole('button', { name: '삭제' })).toHaveCount(1);
    await page.getByRole('button', { name: '삭제' }).click();
    await expect(page.locator('table')).not.toContainText(editedName, { timeout: 15_000 });

    // 6) 새로고침 후 완전히 사라졌는지 확인(삭제가 진짜 DB에 반영됐는지 검증).
    await page.reload();
    await page.getByPlaceholder(PARTNERS_SEARCH_PLACEHOLDER).fill(editedName);
    await expect(page.getByRole('button', { name: '수정' })).toHaveCount(0);
  });
});
