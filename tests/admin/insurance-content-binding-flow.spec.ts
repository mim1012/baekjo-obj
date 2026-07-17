import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test.describe('보험 콘텐츠(동의 전문·FAQ) 관리자 저장 → 공개 보험 페이지 바인딩 경로', () => {
  test('관리자 보험 콘텐츠 화면은 storage 콘센트와 CRUD 콜백을 모두 연결한다', () => {
    const pageSource = src('src', 'app', 'admin', 'insurance-content', 'page.tsx');

    expect(pageSource).toContain("import { getAdminInsuranceContentConfig, saveInsuranceContentConfig } from '@/lib/storage';");
    expect(pageSource).toContain('getAdminInsuranceContentConfig()');
    expect(pageSource).toContain('saveInsuranceContentConfig({ consents, faqs })');
    // 로드 실패 시 저장을 막는다 — 공개 폴백을 default 로 덮어쓰는 사고 방지(codex 리뷰 F5).
    expect(pageSource).toContain('loadError ? Promise.resolve({ ok: false })');
    expect(pageSource).toContain('onSave={handleSave}');
    expect(pageSource).toContain('onCreateRow=');
    expect(pageSource).toContain('onUpdateRow=');
    expect(pageSource).toContain('onDeleteRow=');
    expect(pageSource).not.toContain('readOnly');
    expect(pageSource).not.toContain('Date.now()');
    // id 는 공개 폼 체크 상태 매핑 키 — 편집 시 이전 id 를 유지하고, 생성 시에만 발급한다.
    expect(pageSource).toContain('previous?.id ?? createContentId(');
  });

  test('storage 콘센트는 공개 GET 폴백과 관리자 PUT 경로를 제공한다', () => {
    const storageSource = src('src', 'lib', 'storage.ts');

    expect(storageSource).toContain("fetch('/api/insurance-content')");
    expect(storageSource).toContain('return defaultInsuranceContentConfig;');
    expect(storageSource).toContain("fetch('/api/admin/insurance-content', {");
    expect(storageSource).toContain("method: 'PUT'");
    // 관리자 getter 는 실패·깨진 응답에 throw 해서 저장을 막는다(공개 폴백과 분리 — codex 리뷰 F5).
    expect(storageSource).toContain('export async function getAdminInsuranceContentConfig');
    expect(storageSource).toContain("throw new Error('insurance-content-config-load-failed')");
    expect(storageSource).toContain("throw new Error('insurance-content-config-invalid-response')");
  });

  test('관리자 API 라우트는 requireAdmin 가드와 콘텐츠 모양 검증을 거친다', () => {
    const routeSource = src('src', 'app', 'api', 'admin', 'insurance-content', 'route.ts');

    expect(routeSource).toContain('await requireAdmin();');
    expect(routeSource).toContain('function isConsentDoc(item: unknown): item is ConsentDoc');
    expect(routeSource).toContain('function isInsuranceFaq(item: unknown): item is InsuranceFaq');
    // consents 최소 1건 — 전부 삭제하면 공개 신청 폼의 동의 체크가 사라져 신청 플로우가 깨진다.
    expect(routeSource).toContain('consents.length < 1');
    // 법정 동의 문서('privacy'/'analysis')는 required 로 반드시 존재 — 삭제·id변경 시 동의 기록 의미 소실(codex 리뷰 F1).
    expect(routeSource).toContain("const REQUIRED_LEGAL_CONSENT_IDS = ['privacy', 'analysis'] as const;");
    expect(routeSource).toContain('consent.id === legalId && consent.required');
    expect(routeSource).toContain('return NextResponse.json({ ok: true }, { status: 200 });');
  });

  test('공개 API 라우트는 절대 500 을 내지 않고 default 로 폴백한다', () => {
    const routeSource = src('src', 'app', 'api', 'insurance-content', 'route.ts');

    expect(routeSource).toContain('defaultInsuranceContentConfig');
    expect(routeSource).toContain('logServerError');
  });

  test('repo 는 insurance_content_config 싱글턴 행을 upsert 한다', () => {
    const repoSource = src('src', 'lib', 'insuranceContent', 'repo.ts');

    expect(repoSource).toContain(".from('insurance_content_config')");
    expect(repoSource).toContain('upsert(');
  });

  test('공개 보험 페이지는 인라인 faqs 대신 콘센트 콘텐츠를 렌더한다', () => {
    const pageSource = src('src', 'app', 'insurance', 'page.tsx');

    expect(pageSource).toContain('getInsuranceContentConfig');
    expect(pageSource).not.toContain('const faqs = [');
    expect(pageSource).toContain('setOpenConsent');
    expect(pageSource).toMatch(/<button[\s\S]*?setOpenConsent\(consent\)/);
    expect(pageSource).toContain('전문 보기');
    expect(pageSource).toContain('whitespace-pre-line');
    expect(pageSource).toContain('aria-expanded');
  });
});
