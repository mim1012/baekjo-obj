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
    // 로드 완료 전·로드 실패 시, 그리고 삭제와 동시 진행 중일 때 저장을 막는다
    // (codex F-HIGH, F5, codex 2차 리뷰 HIGH — busyRef 상호배제).
    expect(pageSource).toContain('if (!loaded || loadError || busyRef.current) return { ok: false };');
    expect(pageSource).toContain('onSave={handleSave}');
    expect(pageSource).toContain('onCreateRow=');
    expect(pageSource).toContain('onUpdateRow=');
    expect(pageSource).toContain('onDeleteRow=');
    expect(pageSource).not.toContain('readOnly');
    expect(pageSource).not.toContain('Date.now()');
    // id 는 공개 폼 체크 상태 매핑 키 — 편집 시 이전 id 를 유지하고, 생성 시에만 발급한다.
    expect(pageSource).toContain('previous?.id ?? createContentId(');
  });

  test('동의 문서 삭제는 persisted 기준으로 즉시 저장하고 마지막·법정 항목은 차단한다', () => {
    const pageSource = src('src', 'app', 'admin', 'insurance-content', 'page.tsx');

    // persisted = 마지막으로 DB 와 일치한 consents/faqs — 두 섹션이 하나의 싱글턴 config 를
    // 공유하므로 ref 도 { consents, faqs } 를 함께 든다(opus 리뷰 MEDIUM-1).
    expect(pageSource).toContain('const persistedRef = useRef<{ consents: ConsentDoc[]; faqs: InsuranceFaq[] }>({');
    expect(pageSource).toContain('persistedRef.current = { consents: config.consents, faqs: config.faqs };');
    // 저장·삭제 공용 상호배제 — 동시 PUT 이 서로를 덮어쓰는 레이스 방지(codex 2차 리뷰 HIGH). 두 섹션의
    // 삭제와 배치 저장이 하나의 ref 를 공유한다.
    expect(pageSource).toContain('const busyRef = useRef(false);');
    // 법정 동의 문서('privacy'/'analysis')는 서버 왕복 없이 클라이언트에서 먼저 막는다(opus 리뷰 LOW-2).
    expect(pageSource).toContain("const REQUIRED_LEGAL_CONSENT_IDS = ['privacy', 'analysis'] as const;");
    expect(pageSource).toContain('const handleDeleteConsent = async (id: string | number) => {');
    expect(pageSource).toContain('if (!loaded || loadError) return;');
    expect(pageSource).toContain('if (busyRef.current) return;');
    expect(pageSource).toContain('(REQUIRED_LEGAL_CONSENT_IDS as readonly (string | number)[]).includes(id)');
    expect(pageSource).toContain('필수(법정) 동의 문서는 삭제할 수 없습니다.');
    expect(pageSource).toContain('const nextConsents = persistedRef.current.consents.filter((consent) => consent.id !== id);');
    // 관리자 PUT 라우트가 consents.length < 1 을 거부하므로 마지막 항목은 저장 전에 막는다.
    expect(pageSource).toContain('if (nextConsents.length === 0) {');
    expect(pageSource).toContain('동의 문서는 최소 1건 남아 있어야 합니다.');
    expect(pageSource).toContain(
      'const { ok } = await saveInsuranceContentConfig({ consents: nextConsents, faqs: persistedRef.current.faqs });',
    );
    // 저장 성공 시에만 draft 에서 해당 행만 제거해 다른 미저장 편집을 보존한다.
    expect(pageSource).toContain('persistedRef.current = { consents: nextConsents, faqs: persistedRef.current.faqs };');
    expect(pageSource).toContain('setConsents((prev) => prev.filter((consent) => consent.id !== id));');
    expect(pageSource).toContain('onDeleteRow={handleDeleteConsent}');
  });

  test('FAQ 삭제는 persisted 기준으로 즉시 저장한다(빈 배열 허용 — 마지막 항목 차단 없음)', () => {
    const pageSource = src('src', 'app', 'admin', 'insurance-content', 'page.tsx');

    expect(pageSource).toContain('const handleDeleteFaq = async (id: string | number) => {');
    expect(pageSource).toContain('const nextFaqs = persistedRef.current.faqs.filter((faq) => faq.id !== id);');
    expect(pageSource).toContain(
      'const { ok } = await saveInsuranceContentConfig({ consents: persistedRef.current.consents, faqs: nextFaqs });',
    );
    expect(pageSource).toContain('persistedRef.current = { consents: persistedRef.current.consents, faqs: nextFaqs };');
    expect(pageSource).toContain('setFaqs((prev) => prev.filter((faq) => faq.id !== id));');
    expect(pageSource).toContain('onDeleteRow={handleDeleteFaq}');
    // 배치 저장 성공 시에도 persisted 기준을 draft 로 갱신한다.
    expect(pageSource).toContain('if (result.ok) persistedRef.current = { consents, faqs };');
    // 등록·수정과 달리 삭제는 즉시 반영됨을 두 섹션 설명 문구 모두에 명시한다.
    expect(pageSource).toContain('삭제는 즉시 반영됩니다.');
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
