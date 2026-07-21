import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { CERT_PATH_PATTERN } from '@/lib/insurance/certPath';

// 보험 도메인 P0 3건(증권 업로드·PII 삭제·신규 신청 알림) 회귀 스펙 — 순수 함수/소스-계약
// 검증, 브라우저·DB 불필요(tests/admin은 이런 검증 전용, playwright.config.ts 참고).

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

/* ── U15: POST /api/insurance의 insuranceCertPath 검증(CERT_PATH_PATTERN) ── */

test.describe('CERT_PATH_PATTERN — 신청 페이로드의 증권 경로 형식 검증', () => {
  test('업로드 API가 발급하는 정상 경로(certs/<uuid>.<ext>)를 통과시킨다', () => {
    expect(CERT_PATH_PATTERN.test('certs/11111111-2222-3333-4444-555555555555.pdf')).toBe(true);
    expect(CERT_PATH_PATTERN.test('certs/abc123.jpg')).toBe(true);
    expect(CERT_PATH_PATTERN.test('certs/abc123.png')).toBe(true);
    expect(CERT_PATH_PATTERN.test('certs/abc123.webp')).toBe(true);
  });

  test('경로 순회(..)나 다른 버킷 접두어는 거부한다', () => {
    expect(CERT_PATH_PATTERN.test('../../etc/passwd')).toBe(false);
    expect(CERT_PATH_PATTERN.test('catalog-assets/products/1/main/x.jpg')).toBe(false);
    expect(CERT_PATH_PATTERN.test('certs/../../secret.pdf')).toBe(false);
  });

  test('허용되지 않은 확장자·빈 파일명은 거부한다', () => {
    expect(CERT_PATH_PATTERN.test('certs/abc123.exe')).toBe(false);
    expect(CERT_PATH_PATTERN.test('certs/.pdf')).toBe(false);
    expect(CERT_PATH_PATTERN.test('certs/abc123')).toBe(false);
  });
});

test.describe('POST /api/insurance — insuranceCertPath 가산 필드 배선', () => {
  test('validate()가 형식이 올바르지 않은 insuranceCertPath를 거부한다', () => {
    const routeSource = src('src', 'app', 'api', 'insurance', 'route.ts');
    expect(routeSource).toContain('CERT_PATH_PATTERN.test(b.insuranceCertPath)');
  });

  test('신청 성공 시 after()로 관리자 알림을 보낸다(접수 자체를 지연시키지 않음)', () => {
    const routeSource = src('src', 'app', 'api', 'insurance', 'route.ts');
    expect(routeSource).toContain("import { NextResponse, after,");
    expect(routeSource).toContain('notifyAdminNewSubmission');
    expect(routeSource).toContain("after(() => notifyAdminNewSubmission(");
  });
});

test.describe('POST /api/partner-inquiries — 신규 신청 관리자 알림', () => {
  test('문의 접수 성공 시 after()로 관리자 알림을 보낸다', () => {
    const routeSource = src('src', 'app', 'api', 'partner-inquiries', 'route.ts');
    expect(routeSource).toContain('notifyAdminNewSubmission');
    expect(routeSource).toContain("after(() => notifyAdminNewSubmission(");
  });
});

test.describe('notifyAdminNewSubmission — 실패를 삼키고 접수 성공을 보장한다', () => {
  test('메일 발송 실패는 throw하지 않고 logServerError로만 남긴다', () => {
    const notifySource = src('src', 'lib', 'email', 'notifyAdmin.ts');
    expect(notifySource).toContain('try {');
    expect(notifySource).toMatch(/catch \(error\) \{\s*logServerError/);
    // catch 블록이 재throw하지 않는지(= 조용히 삼키는지) 확인.
    expect(notifySource).not.toMatch(/catch \(error\) \{[\s\S]*?throw/);
  });

  test('수신자는 ADMIN_NOTIFY_EMAIL 우선, 없으면 SMTP_GMAIL_USER로 폴백한다', () => {
    const notifySource = src('src', 'lib', 'email', 'notifyAdmin.ts');
    expect(notifySource).toContain('process.env.ADMIN_NOTIFY_EMAIL ?? process.env.SMTP_GMAIL_USER');
  });
});

/* ── U11/U12: 관리자 보험 신청 삭제(PII 파기) ── */

test.describe('DELETE /api/admin/insurance/[id] — PII 삭제', () => {
  test('PATCH와 동일한 가드 블록(admin 재검증)을 DELETE에도 적용한다', () => {
    const routeSource = src('src', 'app', 'api', 'admin', 'insurance', '[id]', 'route.ts');
    const deleteHandlerMatch = routeSource.match(/export async function DELETE[\s\S]*$/);
    expect(deleteHandlerMatch).not.toBeNull();
    const deleteHandler = deleteHandlerMatch![0];
    expect(deleteHandler).toContain("session.user.role !== 'admin'");
    expect(deleteHandler).toContain("requester.role !== 'admin'");
    expect(deleteHandler).toContain("requester.status === 'inactive'");
    expect(deleteHandler).toContain('deleteInsuranceApplicationById(id)');
  });

  test('대상이 없으면 404, 성공하면 200을 반환한다', () => {
    const routeSource = src('src', 'app', 'api', 'admin', 'insurance', '[id]', 'route.ts');
    const deleteHandler = routeSource.match(/export async function DELETE[\s\S]*$/)![0];
    expect(deleteHandler).toContain("{ error: 'not-found' }, { status: 404 }");
    expect(deleteHandler).toContain('{ success: true }, { status: 200 }');
  });

  test('repo.deleteInsuranceApplicationById는 증권 파일이 있으면 비공개 버킷에서도 함께 지운다', () => {
    const repoSource = src('src', 'lib', 'insurance', 'repo.ts');
    const deleteFnMatch = repoSource.match(/export async function deleteInsuranceApplicationById[\s\S]*?\n}\n/);
    expect(deleteFnMatch).not.toBeNull();
    const deleteFn = deleteFnMatch![0];
    expect(deleteFn).toContain("getSupabase().storage.from(CERT_BUCKET).remove([certPath])");
    // 스토리지 삭제 실패는 throw하지 않는다(행 삭제는 이미 끝났으므로 되돌릴 수 없는 단계).
    expect(deleteFn).not.toMatch(/storageError[\s\S]*?throw/);
  });
});

test.describe('storage.ts — deleteInsuranceApplication 콘센트', () => {
  test('DELETE /api/admin/insurance/[id]를 호출하고 실패 시 throw한다', () => {
    const storageSource = src('src', 'lib', 'storage.ts');
    const fnMatch = storageSource.match(/export async function deleteInsuranceApplication[\s\S]*?\n}\n/);
    expect(fnMatch).not.toBeNull();
    const fn = fnMatch![0];
    expect(fn).toContain("method: 'DELETE'");
    expect(fn).toContain("throw new Error('insurance-delete-failed')");
  });
});

/* ── 타입 계약(가산) ── */

test.describe('InsuranceApplication 타입 — insuranceCertPath는 가산(optional) 필드다', () => {
  test('types/index.ts에 optional로 추가돼 있다(기존 필드 삭제·이름 변경 없음)', () => {
    const typesSource = src('src', 'types', 'index.ts');
    expect(typesSource).toContain('insuranceCertPath?: string;');
  });
});
