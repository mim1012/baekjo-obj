import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_APP_ROUTES } from '../golden/_lib/allPagesRoutes';

// 전 페이지 스모크 검수 커버리지 감사 — golden-crud-coverage.spec.ts(§ 관리자 도메인 커버리지)와
// 같은 사상을 페이지 단위로 적용한다: 새 page.tsx 가 생겼는데 all-pages-smoke.spec.ts 의 검수
// 대상(ALL_APP_ROUTES)에 등록을 깜빡하면 CI 가 잡는다. "새 페이지 만들고 검수 누락"을 사람 기억이
// 아니라 기계가 막는다.

const root = path.resolve(__dirname, '..', '..');
const APP_DIR = path.join(root, 'src', 'app');

/** src/app 아래 모든 page.tsx 를 재귀 탐색해 라우트 문자열(동적 세그먼트는 [id] 그대로)로 변환한다. */
function listAppRoutes(dir: string, base = ''): string[] {
  const routes: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    // 라우트 세그먼트가 아닌 디렉터리는 건너뛴다(컴포넌트/헬퍼 폴더 등 페이지 트리 밖 관례는
    // src/app 에는 없지만, 혹시 생기더라도 page.tsx 존재 여부로만 판단하므로 안전하다).
    const segmentPath = path.join(dir, entry.name);
    const routeSegment = `${base}/${entry.name}`;
    if (fs.existsSync(path.join(segmentPath, 'page.tsx'))) {
      routes.push(routeSegment);
    }
    routes.push(...listAppRoutes(segmentPath, routeSegment));
  }
  return routes;
}

function actualRoutes(): string[] {
  const nested = listAppRoutes(APP_DIR);
  const hasRootPage = fs.existsSync(path.join(APP_DIR, 'page.tsx'));
  return (hasRootPage ? ['/', ...nested] : nested).sort();
}

test.describe('전 페이지 스모크 검수 커버리지 감사 — 새 page.tsx 누락 방지', () => {
  test('src/app 의 모든 page.tsx 가 ALL_APP_ROUTES(all-pages-smoke 검수 대상)에 등록돼 있다', () => {
    const actual = actualRoutes();
    const registered = new Set(ALL_APP_ROUTES.map((r) => r.route));

    const missing = actual.filter((route) => !registered.has(route));
    expect(
      missing,
      `신규 페이지 [${missing.join(', ')}] 가 tests/golden/_lib/allPagesRoutes.ts 의 ` +
        'ALL_APP_ROUTES 에 없습니다 — 전 페이지 스모크 검수 대상에 등록하세요(auth/kind/anchor 근거 포함).',
    ).toEqual([]);
  });

  // 대칭 검사(golden-crud-coverage.spec.ts 의 리뷰 LOW-A 교훈과 동일) — 페이지가 삭제됐는데
  // ALL_APP_ROUTES 에는 그대로 남아 있으면, 위 검사는 "실제 페이지 목록 ⊆ 등록 목록"만 확인하므로
  // 조용히 통과한다. 이 검사가 그 반대 방향(등록 목록 ⊆ 실제 페이지 목록)을 잡는다.
  test('ALL_APP_ROUTES 의 모든 라우트가 여전히 실존하는 page.tsx 를 가리킨다', () => {
    const actual = new Set(actualRoutes());
    const stale = ALL_APP_ROUTES.map((r) => r.route).filter((route) => !actual.has(route));
    expect(
      stale,
      `ALL_APP_ROUTES 에 있지만 더 이상 존재하지 않는 페이지: [${stale.join(', ')}] — ` +
        '페이지가 삭제됐다면 allPagesRoutes.ts 와 all-pages-smoke.spec.ts 에서도 정리하세요.',
    ).toEqual([]);
  });

  test('ALL_APP_ROUTES 안에 중복 라우트가 없다', () => {
    const routes = ALL_APP_ROUTES.map((r) => r.route);
    const duplicates = routes.filter((route, index) => routes.indexOf(route) !== index);
    expect(duplicates).toEqual([]);
  });

  test('동적 라우트는 전부 paramSource 를 지정한다(런타임 표본 id 해석 근거)', () => {
    const missingParamSource = ALL_APP_ROUTES.filter((r) => r.kind === 'dynamic' && !r.paramSource).map(
      (r) => r.route,
    );
    expect(missingParamSource).toEqual([]);
  });

  test('redirect 라우트는 전부 expectedRedirect 목적지를 명시한다', () => {
    const missingRedirect = ALL_APP_ROUTES.filter((r) => r.auth === 'redirect' && !r.expectedRedirect).map(
      (r) => r.route,
    );
    expect(missingRedirect).toEqual([]);
  });
});
