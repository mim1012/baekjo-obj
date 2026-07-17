import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test.describe('고민별 케어(concerns) 관리자 저장 → 공개 화면 바인딩 경로', () => {
  test('관리자 고민 화면은 storage 콘센트와 CRUD 콜백을 모두 연결한다', () => {
    const pageSource = src('src', 'app', 'admin', 'concerns', 'page.tsx');

    expect(pageSource).toContain("import { getAdminConcernsConfig, saveConcernsConfig } from '@/lib/storage';");
    expect(pageSource).toContain('getAdminConcernsConfig()');
    expect(pageSource).toContain('saveConcernsConfig({ items })');
    // 로드 실패 시 저장을 막는다 — 공개 폴백을 default 로 덮어쓰는 사고 방지(insurance-content 미러).
    expect(pageSource).toContain('loadError ? Promise.resolve({ ok: false })');
    expect(pageSource).toContain('onSave={handleSave}');
    expect(pageSource).toContain('onCreateRow=');
    expect(pageSource).toContain('onUpdateRow=');
    expect(pageSource).toContain('onDeleteRow=');
    expect(pageSource).not.toContain('readOnly');
    expect(pageSource).not.toContain('Date.now()');
    // slug 는 상세 라우트(/concerns/[slug]) 링크 키 — 편집 시 이전 slug 를 유지하고, 생성 시에만 발급한다.
    expect(pageSource).toContain('previous?.slug ?? createConcernSlug(');
  });

  test('storage 콘센트는 공개 GET 폴백과 관리자 PUT 경로를 제공한다', () => {
    const storageSource = src('src', 'lib', 'storage.ts');

    expect(storageSource).toContain("fetch('/api/concerns')");
    expect(storageSource).toContain('return defaultConcernsConfig;');
    expect(storageSource).toContain("fetch('/api/admin/concerns', {");
    expect(storageSource).toContain("method: 'PUT'");
    // 관리자 getter 는 실패·깨진 응답에 throw 해서 저장을 막는다(공개 폴백과 분리 — insurance-content 미러).
    expect(storageSource).toContain('export async function getAdminConcernsConfig');
    expect(storageSource).toContain("throw new Error('concerns-config-load-failed')");
    expect(storageSource).toContain("throw new Error('concerns-config-invalid-response')");
  });

  test('관리자 API 라우트는 requireAdmin 가드와 고민 모양 검증을 거친다', () => {
    const routeSource = src('src', 'app', 'api', 'admin', 'concerns', 'route.ts');

    expect(routeSource).toContain('await requireAdmin();');
    expect(routeSource).toContain('function isConcern(item: unknown): item is Concern');
    expect(routeSource).toContain('function isFaq(item: unknown): item is FAQ');
    // items 최소 1건 — 전부 삭제하면 공개 케어 가이드·회원가입 관심사 select 가 통째로 빈다.
    expect(routeSource).toContain('items.length < 1');
    // slug 는 상세 라우트·상점 필터의 식별 키 — 중복을 거부한다.
    expect(routeSource).toContain('new Set(slugs).size === slugs.length');
    expect(routeSource).toContain('return NextResponse.json({ ok: true }, { status: 200 });');
  });

  test('공개 API 라우트는 절대 500 을 내지 않고 default 로 폴백한다', () => {
    const routeSource = src('src', 'app', 'api', 'concerns', 'route.ts');

    expect(routeSource).toContain('defaultConcernsConfig');
    expect(routeSource).toContain('logServerError');
  });

  test('repo 는 concerns_config 싱글턴 행을 upsert 하고 서버 폴백 조회를 제공한다', () => {
    const repoSource = src('src', 'lib', 'concerns', 'repo.ts');

    expect(repoSource).toContain(".from('concerns_config')");
    expect(repoSource).toContain('upsert(');
    // 공개 서버 페이지용 폴백 — 미저장·조회 실패에도 기본 목록으로 렌더한다.
    expect(repoSource).toContain('export async function getConcernsConfigWithFallback');
    expect(repoSource).toContain('defaultConcernsConfig');
  });

  test('공개 화면은 더 이상 정적 @/data/concerns 를 import 하지 않는다', () => {
    const consumers = [
      ['src', 'app', 'concerns', 'page.tsx'],
      ['src', 'app', 'concerns', '[slug]', 'page.tsx'],
      ['src', 'app', 'signup', 'page.tsx'],
      ['src', 'components', 'shop', 'ShopContent.tsx'],
      ['src', 'app', 'brands', '[id]', 'page.tsx'],
      ['src', 'app', 'admin', 'brands', '[id]', 'page.tsx'],
    ];
    for (const segments of consumers) {
      const source = src(...segments);
      expect(source).not.toMatch(/from ['"]@\/data\/concerns['"]/);
      expect(source).not.toMatch(/(?:import\s*\(|require\s*\()\s*['"]@\/data\/concerns['"]/);
    }
    // 정적 파일 자체가 삭제됐다 — 재도입은 eslint no-restricted-imports 가 막는다.
    expect(fs.existsSync(path.join(root, 'src', 'data', 'concerns.ts'))).toBe(false);
  });

  test('서버 공개 페이지는 repo 폴백 조회를, 클라이언트 화면은 storage 콘센트를 쓴다', () => {
    // 서버 컴포넌트 — repo 직접 호출(자기 API HTTP 왕복 금지, §10-2 ①경로).
    for (const segments of [
      ['src', 'app', 'concerns', 'page.tsx'],
      ['src', 'app', 'concerns', '[slug]', 'page.tsx'],
      ['src', 'app', 'brands', '[id]', 'page.tsx'],
      ['src', 'app', 'shop', 'page.tsx'],
      ['src', 'app', 'admin', 'brands', '[id]', 'page.tsx'],
    ]) {
      expect(src(...segments)).toContain("import { getConcernsConfigWithFallback } from '@/lib/concerns/repo';");
    }
    // 클라이언트 화면 — storage 콘센트 경유(§4).
    expect(src('src', 'app', 'signup', 'page.tsx')).toContain('getConcernsConfig');
    expect(src('src', 'app', 'signup', 'page.tsx')).toContain("from '@/lib/storage'");
  });
});
