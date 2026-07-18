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
    expect(pageSource).toContain('saveConcernsConfig({');
    // 등록·수정·삭제가 모두 즉시 저장으로 전환되며 header batch save(onSave)는 제거됐다
    // (2026-07-18 저장 유실 리포트 — 모달 "목록에 반영"이 새로고침에 사라지는 2단계 저장 함정 제거).
    expect(pageSource).not.toContain('onSave=');
    expect(pageSource).not.toContain('const handleSave');
    expect(pageSource).toContain('onCreateRow=');
    expect(pageSource).toContain('onUpdateRow=');
    expect(pageSource).toContain('onDeleteRow=');
    expect(pageSource).not.toContain('readOnly');
    expect(pageSource).not.toContain('Date.now()');
    // slug 는 상세 라우트(/concerns/[slug]) 링크 키 — 편집 시 이전 slug 를 유지하고, 생성 시에만 발급한다.
    expect(pageSource).toContain('previous?.slug ?? createConcernSlug(');
  });

  test('등록·수정·삭제 모두 persisted 기준으로 즉시 저장한다(마지막 항목은 차단)', () => {
    const pageSource = src('src', 'app', 'admin', 'concerns', 'page.tsx');

    // persisted = 마지막으로 DB 와 일치한 목록 — 모든 CRUD 가 이 기준으로 저장해 다른 미저장
    // 편집이 함께 커밋되지 않게 한다(opus 리뷰 MEDIUM-1 확장).
    expect(pageSource).toContain('const persistedItemsRef = useRef<Concern[]>([]);');
    expect(pageSource).toContain('persistedItemsRef.current = config.items;');
    // 저장·삭제 공용 상호배제 — 동시 PUT 이 서로를 덮어쓰는 레이스 방지(codex 2차 리뷰 HIGH).
    expect(pageSource).toContain('const busyRef = useRef(false);');

    expect(pageSource).toContain('const handleCreate = async (draft: Record<string, string | number>) => {');
    expect(pageSource).toContain('const newConcern = draftToConcern(draft, persistedItemsRef.current.map((concern) => concern.slug));');
    expect(pageSource).toContain('const nextItems = [...persistedItemsRef.current, newConcern];');
    expect(pageSource).toContain('등록 저장에 실패했습니다.');

    expect(pageSource).toContain('const handleUpdate = async (id: string | number, draft: Record<string, string | number>) => {');
    expect(pageSource).toContain('concern.slug === id ? draftToConcern(draft, existingSlugs, concern) : concern,');
    expect(pageSource).toContain('수정 저장에 실패했습니다.');

    expect(pageSource).toContain('const handleDelete = async (id: string | number) => {');
    expect(pageSource).toContain('if (!loaded || loadError) return;');
    expect(pageSource).toContain('if (busyRef.current) return;');
    expect(pageSource).toContain('busyRef.current = true;');
    expect(pageSource).toContain('const nextItems = persistedItemsRef.current.filter((concern) => concern.slug !== id);');
    expect(pageSource).toContain('const { ok } = await saveConcernsConfig({ items: nextItems });');
    // 관리자 PUT 라우트가 items.length < 1 을 거부하므로 마지막 항목은 저장 전에 막는다.
    expect(pageSource).toContain('if (nextItems.length === 0) {');
    expect(pageSource).toContain('마지막 항목은 삭제할 수 없습니다.');
    // 저장 성공 시에만 draft 를 갱신한다.
    expect(pageSource).toContain('persistedItemsRef.current = nextItems;');
    expect(pageSource).toContain('setItems((prev) => prev.filter((concern) => concern.slug !== id));');
    expect(pageSource).toContain('삭제 저장에 실패했습니다.');
    // 등록·수정·삭제 모두 즉시 반영됨을 설명 문구에 명시한다.
    expect(pageSource).toContain('등록·수정·삭제가 모두 즉시 반영됩니다.');
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
