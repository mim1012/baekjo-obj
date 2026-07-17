import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test.describe('공지사항(notices) 관리자 저장 → 공개 화면 바인딩 경로', () => {
  test('관리자 공지 화면은 storage 콘센트와 CRUD 콜백을 모두 연결한다', () => {
    const pageSource = src('src', 'app', 'admin', 'notices', 'page.tsx');

    expect(pageSource).toContain("import { getAdminNoticesConfig, saveNoticesConfig } from '@/lib/storage';");
    expect(pageSource).toContain('getAdminNoticesConfig()');
    expect(pageSource).toContain('saveNoticesConfig({ items })');
    // 로드 완료 전·로드 실패 시 저장을 막는다 — default 로 DB 를 덮어쓰는 레이스 방지(codex F-HIGH).
    expect(pageSource).toContain('!loaded || loadError ? Promise.resolve({ ok: false })');
    expect(pageSource).toContain('onSave={handleSave}');
    expect(pageSource).toContain('onCreateRow=');
    expect(pageSource).toContain('onUpdateRow=');
    expect(pageSource).toContain('onDeleteRow=');
    expect(pageSource).not.toContain('readOnly');
    // id 는 상세 라우트(/notices/[id]) 링크 키 — 편집 시 이전 id 를 유지하고, 생성 시에만 발급한다.
    expect(pageSource).toContain('previous?.id ?? createNoticeId()');
    // views/likes 는 폼 미노출 — 신규 0 고정, 기존값 보존.
    expect(pageSource).toContain('previous?.views ?? 0');
    expect(pageSource).toContain('previous?.likes ?? 0');
  });

  test('storage 콘센트는 공개 GET 폴백과 관리자 PUT 경로를 제공한다', () => {
    const storageSource = src('src', 'lib', 'storage.ts');

    expect(storageSource).toContain("fetch('/api/notices')");
    expect(storageSource).toContain('return defaultNoticesConfig;');
    expect(storageSource).toContain("fetch('/api/admin/notices', {");
    // 관리자 getter 는 실패·깨진 응답에 throw 해서 저장을 막는다(공개 폴백과 분리 — concerns 미러).
    expect(storageSource).toContain('export async function getAdminNoticesConfig');
    expect(storageSource).toContain("throw new Error('notices-config-load-failed')");
    expect(storageSource).toContain("throw new Error('notices-config-invalid-response')");
  });

  test('관리자 API 라우트는 requireAdmin 가드와 공지 모양 검증을 거친다', () => {
    const routeSource = src('src', 'app', 'api', 'admin', 'notices', 'route.ts');

    expect(routeSource).toContain('await requireAdmin();');
    expect(routeSource).toContain('function isNotice(item: unknown): item is Notice');
    // views/likes 는 카운트 — 숫자 아님·음수를 거부한다.
    expect(routeSource).toContain('function isCount(value: unknown): value is number');
    expect(routeSource).toContain('value >= 0');
    // category 는 undefined 또는 enum('notice'|'event'|'brand')만 허용한다.
    expect(routeSource).toContain("const NOTICE_CATEGORIES = ['notice', 'event', 'brand'] as const;");
    // items 최소 1건 — 전부 삭제하면 공개 공지 목록·홈 소식 4건이 통째로 빈다.
    expect(routeSource).toContain('items.length < 1');
    // id 는 상세 라우트의 식별 키 — 중복을 거부한다.
    expect(routeSource).toContain('new Set(ids).size === ids.length');
    expect(routeSource).toContain('return NextResponse.json({ ok: true }, { status: 200 });');
  });

  test('공개 API 라우트는 절대 500 을 내지 않고 default 로 폴백한다', () => {
    const routeSource = src('src', 'app', 'api', 'notices', 'route.ts');

    expect(routeSource).toContain('defaultNoticesConfig');
    expect(routeSource).toContain('logServerError');
  });

  test('repo 는 notices_config 싱글턴 행을 upsert 하고 서버 폴백 조회를 제공한다', () => {
    const repoSource = src('src', 'lib', 'notices', 'repo.ts');

    expect(repoSource).toContain(".from('notices_config')");
    expect(repoSource).toContain('upsert(');
    // 공개 서버 페이지용 폴백 — 미저장·조회 실패에도 기본 목록으로 렌더한다.
    expect(repoSource).toContain('export async function getNoticesConfigWithFallback');
    expect(repoSource).toContain('defaultNoticesConfig');
  });

  test('공개 화면은 더 이상 정적 @/data/notices 를 import 하지 않는다', () => {
    const consumers = [
      ['src', 'app', 'notices', 'page.tsx'],
      ['src', 'app', 'notices', '[id]', 'page.tsx'],
      ['src', 'app', 'admin', 'notices', 'page.tsx'],
      ['src', 'components', 'home', 'HomeClient.tsx'],
      ['src', 'app', 'page.tsx'],
    ];
    for (const segments of consumers) {
      const source = src(...segments);
      expect(source).not.toMatch(/from ['"]@\/data\/notices['"]/);
      expect(source).not.toMatch(/(?:import\s*\(|require\s*\()\s*['"]@\/data\/notices['"]/);
    }
    // 정적 파일 자체가 삭제됐다 — 재도입은 eslint no-restricted-imports 가 막는다.
    expect(fs.existsSync(path.join(root, 'src', 'data', 'notices.ts'))).toBe(false);
  });

  test('서버 공개 페이지는 repo 폴백 조회를, 홈은 props 주입을 쓴다', () => {
    // 서버 컴포넌트 — repo 직접 호출(자기 API HTTP 왕복 금지, §10-2 ①경로).
    for (const segments of [
      ['src', 'app', 'notices', 'page.tsx'],
      ['src', 'app', 'notices', '[id]', 'page.tsx'],
      ['src', 'app', 'page.tsx'],
    ]) {
      expect(src(...segments)).toContain("import { getNoticesConfigWithFallback } from '@/lib/notices/repo';");
    }
    // 홈 표현 파일(dad 소유)은 notices 를 props 로만 받는다 — 배선은 서버 wrapper 가 한다(§3-1).
    const clientSource = src('src', 'components', 'home', 'HomeClient.tsx');
    expect(clientSource).toContain('notices: Notice[];');
    expect(clientSource).toContain('notices.slice(0, 4)');
  });
});
