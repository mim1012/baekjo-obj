import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// 제휴 문의(케어키트 랜딩 폼 → DB 누적 → 관리자 접수함) 경로의 문자열 계약 검증.
// partner-binding-flow.spec.ts 와 동일한 방식 — 브라우저·DB 불필요(admin 프로젝트).

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

function expectNoMutableProductBrandImport(source: string): void {
  expect(source).not.toMatch(/from ['"][^'"]*data\/(?:products|brands)(?:\.[^'"]*)?['"]/);
  expect(source).not.toMatch(/(?:import\s*\(|require\s*\()\s*['"][^'"]*data\/(?:products|brands)(?:\.[^'"]*)?['"]/);
  expect(source).not.toMatch(/@\/data\/(?:products|brands)(?:\.[^'"]*)?/);
}

test.describe('제휴 문의 폼 → DB → 관리자 접수함 바인딩 경로', () => {
  test('랜딩 폼은 storage 콘센트(addPartnerInquiry)만 거치고 fetch 를 직접 호출하지 않는다', () => {
    const formSource = src('src', 'components', 'care-kit', 'PartnerInquiryForm.tsx');
    const storageSource = src('src', 'lib', 'storage.ts');

    expect(formSource).toContain(
      "import { addPartnerInquiry, type CreatePartnerInquiryInput } from '@/lib/storage';",
    );
    expect(formSource).toContain('await addPartnerInquiry(form)');
    expect(formSource).not.toContain('fetch(');
    expect(formSource).not.toContain('localStorage');
    expect(formSource).not.toContain('alert(');
    expect(formSource).toContain('aria-live');
    // 개인정보 수집 동의(필수 체크) — docs/legal 고지 형식의 간단 고지 포함.
    expect(formSource).toContain('개인정보 수집·이용 동의 (필수)');
    expect(formSource).toContain('상담 종료 후 1년');
    expectNoMutableProductBrandImport(formSource);

    // storage 콘센트: 생성=201 아니면 throw, 목록=실패 시 빈 배열, 상태변경=실패 시 throw.
    expect(storageSource).toContain(
      "export type CreatePartnerInquiryInput = Omit<\n  PartnerInquiry,\n  'id' | 'createdAt' | 'status' | 'memo'\n>;",
    );
    expect(storageSource).toContain("fetch('/api/partner-inquiries', {");
    expect(storageSource).toContain("throw new Error('partner-inquiry-create-failed');");
    expect(storageSource).toContain("fetch('/api/admin/partner-inquiries')");
    expect(storageSource).toContain('export async function getAdminPartnerInquiries(): Promise<PartnerInquiry[]>');
    expect(storageSource).toContain('/api/admin/partner-inquiries/${encodeURIComponent(id)}');
    expect(storageSource).toContain("throw new Error('partner-inquiry-update-failed');");
  });

  test('공개 POST 라우트는 런타임 검증을 하고 status/id/createdAt 을 서버가 결정한다', () => {
    const routeSource = src('src', 'app', 'api', 'partner-inquiries', 'route.ts');

    expect(routeSource).toContain('function isPartnerInquiryInput(body: unknown)');
    expect(routeSource).toContain(
      "PARTNER_TYPES.includes(b.partnerType as PartnerInquiry['partnerType'])",
    );
    // mass-assignment 차단: 검증된 화이트리스트 필드만 repo 로 넘긴다(status/id/createdAt 무시).
    const createCall = routeSource.slice(
      routeSource.indexOf('await createPartnerInquiry({'),
      routeSource.indexOf('});', routeSource.indexOf('await createPartnerInquiry({')),
    );
    expect(createCall).toContain('companyName: body.companyName');
    expect(createCall).toContain('message: body.message');
    expect(createCall).not.toContain('status');
    expect(createCall).not.toContain('createdAt');
    expect(createCall).not.toContain('id:');
    expect(routeSource).toContain("return NextResponse.json({ inquiry }, { status: 201 });");
    expect(routeSource).toContain("return NextResponse.json({ error: 'invalid-input' }, { status: 400 });");
  });

  test('관리자 라우트는 requireAdmin 이중 가드와 status enum 검증을 거친다', () => {
    const listRoute = src('src', 'app', 'api', 'admin', 'partner-inquiries', 'route.ts');
    const patchRoute = src('src', 'app', 'api', 'admin', 'partner-inquiries', '[id]', 'route.ts');

    expect(listRoute).toContain("import { requireAdmin } from '@/lib/admin/requireAdmin';");
    expect(listRoute).toContain('await requireAdmin();');
    expect(listRoute).toContain('listPartnerInquiries()');

    expect(patchRoute).toContain("import { requireAdmin } from '@/lib/admin/requireAdmin';");
    expect(patchRoute).toContain('await requireAdmin();');
    expect(patchRoute).toContain(
      'PARTNER_INQUIRY_STATUSES.includes(b.status as PartnerInquiryStatus)',
    );
    expect(patchRoute).toContain("if (typeof b.memo !== 'string' || b.memo.length > MAX_MEMO) return null;");
    expect(patchRoute).toContain("return NextResponse.json({ error: 'not-found' }, { status: 404 });");
  });

  test('repo 는 partner_inquiries 테이블만 접근하고 snake↔camel 매핑을 담당한다', () => {
    const repoSource = src('src', 'lib', 'partnerInquiries', 'repo.ts');

    expect(repoSource).toContain(".from('partner_inquiries')");
    expect(repoSource).toContain("import { getSupabase } from '@/lib/supabase/server';");
    expect(repoSource).toContain('function rowToPartnerInquiry(row: PartnerInquiryRow): PartnerInquiry');
    expect(repoSource).toContain('companyName: row.company_name');
    expect(repoSource).toContain("order('created_at', { ascending: false })");
    // 생성 시 status/id/created_at 은 DB default — insert 에 status 를 넣지 않는다.
    const insertBlock = repoSource.slice(
      repoSource.indexOf('export async function createPartnerInquiry'),
      repoSource.indexOf('export async function updatePartnerInquiryStatus'),
    );
    expect(insertBlock).not.toContain('status');
    expect(insertBlock).not.toContain('created_at');
  });

  test('관리자 접수함 화면은 콘센트만 사용하고 신규 등록 버튼이 없다', () => {
    const pageSource = src('src', 'app', 'admin', 'partner-inquiries', 'page.tsx');

    expect(pageSource).toContain(
      "import { getAdminPartnerInquiries, updatePartnerInquiryStatus } from '@/lib/storage';",
    );
    expect(pageSource).toContain('getAdminPartnerInquiries()');
    expect(pageSource).toContain('updatePartnerInquiryStatus(target.id, target.status');
    expect(pageSource).not.toContain('onCreateRow=');
    expect(pageSource).not.toContain('actionLabel=');
    expect(pageSource).toContain('renderExpandedRow');
    expect(pageSource).toContain('onSave={handleSave}');
    expect(pageSource).not.toContain('fetch(');
    expectNoMutableProductBrandImport(pageSource);
  });
});
