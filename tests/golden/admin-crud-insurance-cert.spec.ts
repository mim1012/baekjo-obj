import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { ADMIN_EMAIL, ADMIN_PASSWORD, CRUD_ENABLED, bypassHeaders, loginAsAdmin } from './_lib/adminCrudHelpers';

// 골든플로우 #3 — 증권 업로드 실구동: /insurance/apply에서 진짜 파일을 첨부·제출하고,
// 비공개 버킷(insurance-docs) 저장 → 관리자 signed URL 열람 → DELETE 시 스토리지 선삭제
// (PII 파기 완결)까지 한 여정으로 검증한다.
//
// 왜 이 스펙이 따로 있나: #197(be/insurance-cert-pii-notify)이 증권 업로드를 구현했지만
// 실구동 검증은 임시 파일로 1회 수동 확인 후 박제되지 않았다(§8-6 자기개선 루프 위반 상태).
// insurance.spec.ts(LIVE)는 write 방지를 위해 "첨부 input 존재"만 보고, admin-crud-insurance
// .spec.ts는 파일 없이 제출한다 — 골든플로우 #3의 통과 기준인 "증권 업로드"를 실제로
// 구동하는 스펙은 이 파일이 유일하다.
//
// 보험 신청은 게스트도 가능하므로(upload/route.ts 주석) 제출은 비로그인으로 한다 —
// E2E_MEMBER_* 시크릿이 필요 없다.
//
// 🚨 쓰기(write) 스펙 — E2E_ADMIN_CRUD=1 로 명시적으로 켜지 않으면 전체 skip. 절대
// production을 겨냥하지 말 것 — 대상은 Vercel Preview/staging뿐. 이 스펙이 만드는 신청
// 건과 스토리지 파일은 마지막 단계의 DELETE(파기 검증 겸 정리)가 지운다.
test.describe('골든플로우 #3: 증권 업로드 실구동 — 업로드→관리자 열람→PII 파기', () => {
  test.skip(!CRUD_ENABLED, 'E2E_ADMIN_CRUD=1 미설정 — 쓰기 스펙 skip(Preview/staging 전용)');
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, 'E2E_ADMIN_* secret 미주입 — 관리자 열람 검증 불가로 skip');

  test.use({
    extraHTTPHeaders: bypassHeaders(),
  });

  const runId = Date.now();
  const PET_NAME_PREFIX = 'E2E증권펫';
  const petName = `${PET_NAME_PREFIX}${runId}`;

  // 1x1 투명 PNG — setInputFiles가 통과할 최소 유효 파일. 업로드 라우트가 클라이언트
  // file.type을 불신하고 매직 바이트(\x89PNG)로 판별하므로(upload/route.ts:34) 진짜 PNG여야 한다.
  const PNG_1PX_BASE64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const certFilePath = path.join(os.tmpdir(), `e2e-insurance-cert-${runId}.png`);

  test.beforeAll(() => {
    fs.writeFileSync(certFilePath, Buffer.from(PNG_1PX_BASE64, 'base64'));
  });

  test.afterAll(() => {
    fs.rmSync(certFilePath, { force: true });
  });

  /** 이전 실행이 남긴 잔여 E2E 신청 건 파기 — DELETE가 스토리지도 함께 지우므로 API만으로 충분하다. */
  async function purgeStaleApplications(adminPage: Page): Promise<void> {
    const listRes = await adminPage.request.get('/api/admin/insurance');
    if (!listRes.ok()) return;
    const { applications } = (await listRes.json()) as { applications: Array<{ id: string; petName: string }> };
    for (const stale of applications.filter((a) => a.petName.startsWith(PET_NAME_PREFIX))) {
      await adminPage.request.delete(`/api/admin/insurance/${stale.id}`);
    }
  }

  test('게스트 증권 첨부 제출 → 비공개 버킷 저장 → 관리자 signed URL 열람 → DELETE 시 파일까지 파기', async ({
    page,
  }) => {
    // 0) 관리자 로그인 + 이전 실행 잔재 정리 — 반드시 제출 **전**에 한다. 제출 후에 돌리면
    //    prefix 매칭이 이번 실행 건까지 파기한다(실측 — 첫 실행에서 실제로 그랬다).
    const adminPage = await page.context().browser()!.newPage({ extraHTTPHeaders: bypassHeaders() });
    await loginAsAdmin(adminPage);
    await purgeStaleApplications(adminPage);

    // 1) 게스트로 신청 폼 작성 + 증권 파일 첨부.
    await page.goto('/insurance/apply');
    await page.getByPlaceholder('성명을 입력해 주세요').fill('E2E 증권 보호자');
    await page.getByPlaceholder('010-0000-0000').fill('010-1234-9876');
    await page.getByPlaceholder('아이 이름').fill(petName);
    await page.getByPlaceholder(/말티즈|코리안 숏헤어/).fill('말티즈');
    await page.locator('input[type="number"]').first().fill('4');
    await page.getByRole('button', { name: '가성비 중심' }).click();

    await page.locator('input[type="file"]').setInputFiles(certFilePath);
    // 클라이언트 검증(형식·10MB) 통과 신호 — 선택된 파일명이 폼에 렌더된다(apply/page.tsx:245).
    await expect(page.getByText(/e2e-insurance-cert-.*선택됨/)).toBeVisible();

    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();
    for (let i = 0; i < checkboxCount; i += 1) {
      await checkboxes.nth(i).check();
    }

    // 2) 제출 — 업로드는 제출 시점에 일어난다(apply/page.tsx:96, 첨부 즉시 업로드가 아님).
    //    POST /api/insurance/upload 201과 서버 발급 경로(certs/<uuid>.png)를 직접 확인한다.
    const submitButton = page.getByRole('button', { name: '무료 분석 신청하기' });
    await expect(submitButton).toBeEnabled({ timeout: 15_000 });
    const [uploadRes] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/insurance/upload') && res.request().method() === 'POST',
        { timeout: 15_000 },
      ),
      submitButton.click(),
    ]);
    expect(uploadRes.status(), `증권 업로드 실패(status=${uploadRes.status()})`).toBe(201);
    const { path: certPath } = (await uploadRes.json()) as { path: string };
    // 서버가 UUID로 새 경로를 발급한다(클라이언트 파일명 미반영, upload/route.ts:85) — 열거 방지 방어의 회귀 스펙.
    expect(certPath).toMatch(/^certs\/[0-9a-f-]{36}\.png$/);

    await page.waitForURL(/\/insurance\/complete/, { timeout: 15_000 });

    // 3) 게스트는 증권을 열람할 수 없다 — 신청 id를 모르더라도 엔드포인트 자체가 401이어야 한다.
    //    (id는 아래 관리자 목록에서 얻은 값을 그대로 써서 "존재하는 id에 대한 401"을 검증한다.)
    const listRes = await adminPage.request.get('/api/admin/insurance');
    expect(listRes.ok()).toBe(true);
    const { applications } = (await listRes.json()) as {
      applications: Array<{ id: string; petName: string }>;
    };
    const created = applications.find((a) => a.petName === petName);
    expect(created, `${petName} 신청 건이 admin API 목록에 없습니다`).toBeTruthy();
    const applicationId = created!.id;

    const guestCertRes = await page.request.get(`/api/admin/insurance/${applicationId}/cert`);
    expect(guestCertRes.status(), '게스트가 증권 열람 엔드포인트에 접근됐습니다').toBe(401);

    // 4) 관리자 열람 — signed URL을 발급받아 실제 스토리지의 파일 바이트까지 확인한다
    //    (독립 경로 검증: 업로드 API의 201 응답이 아니라 저장된 실물로 대조).
    const certRes = await adminPage.request.get(`/api/admin/insurance/${applicationId}/cert`);
    expect(certRes.status(), `관리자 증권 열람 실패(status=${certRes.status()})`).toBe(200);
    const { url: signedUrl } = (await certRes.json()) as { url: string };
    expect(signedUrl).toContain(certPath);

    const fileRes = await adminPage.request.get(signedUrl);
    expect(fileRes.ok(), `signed URL 파일 조회 실패(status=${fileRes.status()})`).toBe(true);
    const fileBytes = await fileRes.body();
    expect(fileBytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(true); // \x89PNG

    // 5) 파기 = 정리 — DELETE가 행과 스토리지 파일을 함께 지운다([id]/route.ts DELETE,
    //    repo.deleteInsuranceApplicationById의 스토리지 선삭제). 파기 완결을 3경로로 확인:
    //    행 소멸(목록) · 열람 경로 404 · 살아있던 signed URL로도 파일이 더는 안 열림.
    const deleteRes = await adminPage.request.delete(`/api/admin/insurance/${applicationId}`);
    expect(deleteRes.ok(), `신청 건 삭제 실패(status=${deleteRes.status()})`).toBe(true);

    const afterListRes = await adminPage.request.get('/api/admin/insurance');
    const afterList = (await afterListRes.json()) as { applications: Array<{ id: string }> };
    expect(afterList.applications.some((a) => a.id === applicationId), '삭제 후에도 신청 건이 목록에 남아 있습니다').toBe(false);

    const afterCertRes = await adminPage.request.get(`/api/admin/insurance/${applicationId}/cert`);
    expect(afterCertRes.status()).toBe(404);

    // ⚠️ 낡은 signed URL 재조회로는 파일 파기를 판정할 수 없다 — Supabase CDN이 signed URL
    // 응답을 캐시해 원본 삭제 후에도 한동안 캐시본을 응답하고, 쿼리 cache-buster로도 우회되지
    // 않는다(둘 다 실측 — 원본 버킷은 비어 있는데 URL은 200). 그래서 스토리지 계층을 직접 본다.
    // service key는 CI(golden-crud.yml)에 주입되지 않으므로 있는 환경(로컬↔스테이징)에서만 실행 —
    // CI에서는 위의 행 소멸 + cert 404가 파기 검증을 담당한다.
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
      const { data: remaining, error: listError } = await supabase.storage.from('insurance-docs').list('certs');
      expect(listError).toBeNull();
      const fileName = certPath.replace(/^certs\//, '');
      expect(
        (remaining ?? []).some((f) => f.name === fileName),
        '파기 후에도 스토리지에 증권 파일이 남아 있습니다(스토리지 선삭제 미동작)',
      ).toBe(false);
    }

    await adminPage.close();
  });
});
