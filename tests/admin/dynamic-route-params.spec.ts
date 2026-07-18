import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

/**
 * Next 16 부터 동적 라우트의 params 는 Promise 다. 동기 타입(`params: { id: string }`)으로
 * 선언하고 `params.id` 를 바로 읽으면 런타임에 "params is a Promise and must be unwrapped" 가
 * 나서 id 가 항상 undefined 로 떨어진다 — admin/members/[id]는 생성 이래 매 회원마다
 * '회원 정보를 찾을 수 없습니다'만 렌더했고, admin/insurance/[id]도 같은 형태였다(2026-07-18
 * wave-3 e2e 전수 점검 중 발견). 이 스펙은 관리자 동적 라우트 page.tsx 전체가 Promise 타입 +
 * await 패턴을 따르는지 고정한다 — 새 동적 라우트를 추가할 때 같은 실수를 재현하면 여기서 잡힌다.
 */
const ADMIN_DYNAMIC_PAGES = [
  ['src', 'app', 'admin', 'brands', '[id]', 'page.tsx'],
  ['src', 'app', 'admin', 'insurance', '[id]', 'page.tsx'],
  ['src', 'app', 'admin', 'members', '[id]', 'page.tsx'],
  ['src', 'app', 'admin', 'orders', '[id]', 'page.tsx'],
  ['src', 'app', 'admin', 'products', '[id]', 'page.tsx'],
  ['src', 'app', 'admin', 'products', '[id]', 'editor', 'page.tsx'],
];

test.describe('관리자 동적 라우트 params — Next 16 Promise 계약(2026-07-18 e2e 발견)', () => {
  for (const segments of ADMIN_DYNAMIC_PAGES) {
    const relPath = segments.join('/');
    test(`${relPath} 는 params 를 Promise 로 타입하고 await 로 해제한다`, () => {
      const source = src(...segments);

      expect(source).toMatch(/params:\s*Promise<\{/);
      expect(source).toContain('await params');
      // 동기 타입 선언(`params: { id: ... }` 형태)이 남아있지 않은지도 함께 확인한다.
      expect(source).not.toMatch(/params:\s*\{\s*\n?\s*id:\s*string;?\s*\n?\s*\}\s*;/);
    });
  }
});
