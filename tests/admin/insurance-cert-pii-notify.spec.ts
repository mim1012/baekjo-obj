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

  // opus 리뷰 MEDIUM-1 고정 — summary는 게스트 입력(이름·연락처 등, 길이만 검증되고 형식은
  // 자유로운 텍스트)으로 조립되므로 HTML에 그대로 보간하면 인젝션 경로가 된다. notifyAdmin.ts는
  // sendMail(mailer.ts, server-only)을 import하므로 이 파일을 직접 import하면 next-auth류
  // 서버 전용 의존성 로딩이 걸린다(다른 admin 스펙과 동일 제약) — 소스-계약 검증으로 고정한다.
  const escapeHtmlLogic = (value: string): string =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  test('이스케이프 로직 자체가 <script> 등 HTML 특수문자를 안전하게 치환한다(참조 구현)', () => {
    expect(escapeHtmlLogic('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
    expect(escapeHtmlLogic(`"'&`)).toBe('&quot;&#39;&amp;');
  });

  test('notifyAdmin.ts는 summary를 html에 보간하기 전에 escapeHtml을 거치고, text 대체본도 함께 담는다', () => {
    const notifySource = src('src', 'lib', 'email', 'notifyAdmin.ts');
    expect(notifySource).toContain('function escapeHtml(value: string): string');
    expect(notifySource).toContain("replace(/</g, '&lt;')");
    expect(notifySource).toContain("replace(/>/g, '&gt;')");
    // html 보간 시 escapeHtml을 거친 값을 쓰고, text 필드에도 원문을 함께 담아 안전한 대체
    // 경로를 제공한다(mailer.ts sendMail의 text 옵션, HTML로 해석되지 않음).
    expect(notifySource).toContain('const escapedSummary = escapeHtml(input.summary)');
    expect(notifySource).toContain('${escapedSummary}');
    expect(notifySource).toContain('text: `[백조오브제]');
    // input.summary가 escapeHtml을 거치지 않은 채 html 템플릿 리터럴에 직접 보간되지 않는지도
    // 고정 — html 블록(첫 backtick부터 그 블록을 닫는 backtick까지)만 잘라내 검사한다(text
    // 필드에도 ${input.summary}가 등장하므로 전체 소스에 대고 검사하면 오탐한다).
    const htmlBlockMatch = notifySource.match(/html: `([\s\S]*?)`,\n\s*text:/);
    expect(htmlBlockMatch).not.toBeNull();
    expect(htmlBlockMatch![1]).not.toContain('${input.summary}');
  });

  test('mailer.ts의 SendMailInput은 text를 가산(optional) 필드로 받는다', () => {
    const mailerSource = src('src', 'lib', 'email', 'mailer.ts');
    expect(mailerSource).toContain('text?: string;');
    expect(mailerSource).toContain('...(input.text !== undefined ? { text: input.text } : {})');
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
  });

  // opus 리뷰 MEDIUM-2 고정 — 스토리지 삭제를 행 삭제보다 먼저 실행해야, 스토리지가 실패했을 때
  // insuranceCertPath 포인터가 아직 살아 있는 행을 남겨 재시도할 수 있다. 순서가 반대로 돌아가면
  // (행 먼저 삭제) 스토리지 실패 시 고아 파일이 영구 잔존해도 API가 success를 반환하게 된다.
  test('스토리지 삭제가 행 삭제보다 먼저 실행된다(순서 고정)', () => {
    const repoSource = src('src', 'lib', 'insurance', 'repo.ts');
    const deleteFnMatch = repoSource.match(/export async function deleteInsuranceApplicationById[\s\S]*?\n}\n/);
    const deleteFn = deleteFnMatch![0];

    const storageRemoveIndex = deleteFn.indexOf('.storage.from(CERT_BUCKET).remove(');
    const rowDeleteIndex = deleteFn.indexOf(".from('insurance_applications')\n    .delete()");
    expect(storageRemoveIndex).toBeGreaterThan(-1);
    expect(rowDeleteIndex).toBeGreaterThan(-1);
    expect(storageRemoveIndex).toBeLessThan(rowDeleteIndex);
  });

  test('스토리지 삭제가 실패(not-found 아님)하면 throw하고 행을 지우지 않는다(재시도 가능)', () => {
    const repoSource = src('src', 'lib', 'insurance', 'repo.ts');
    const deleteFnMatch = repoSource.match(/export async function deleteInsuranceApplicationById[\s\S]*?\n}\n/);
    const deleteFn = deleteFnMatch![0];
    expect(deleteFn).toMatch(/if \(!alreadyGone\) \{[\s\S]*?throw storageError;/);
  });

  test('스토리지에서 파일이 이미 없으면(not found) 멱등하게 진행한다', () => {
    const repoSource = src('src', 'lib', 'insurance', 'repo.ts');
    const deleteFnMatch = repoSource.match(/export async function deleteInsuranceApplicationById[\s\S]*?\n}\n/);
    const deleteFn = deleteFnMatch![0];
    expect(deleteFn).toContain('/not.?found/i.test(storageError.message');
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
