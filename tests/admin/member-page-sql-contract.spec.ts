import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// 0173(list_admin_member_page)은 PR#326의 0153을 선별 포팅하면서 원본의 to_jsonb(r) 대신
// jsonb_build_object 화이트리스트로 바꿨다 — to_jsonb(r)은 members 테이블의 모든 컬럼(특히
// password_hash)을 그대로 jsonb에 담아, listMemberPage()가 toUser()를 호출해 걸러내기 전까지는
// RPC 응답 자체에 비밀번호 해시가 실려 있었다(한 번의 누락된 toUser() 호출로 유출될 수 있는 설계).
// 이 스펙은 그 화이트리스트가 실제로 적용돼 있는지, 그리고 PT409 SQLSTATE·정렬·권한 계약을
// 고정한다(소스-계약 스타일, DB 미접속).
const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

const MIGRATION_PATH = ['supabase', 'migrations', '0173_admin_member_pagination.sql'];

test('0173 never selects password_hash into the returned jsonb', () => {
  const sql = read(...MIGRATION_PATH);
  const bodyMatch = sql.match(/jsonb_build_object\(\s*'users'[\s\S]*?\)\s*from paging/);
  expect(bodyMatch, 'jsonb_build_object(...) users payload not found').toBeTruthy();
  const usersPayload = bodyMatch![0];
  expect(usersPayload).not.toContain('password_hash');
  expect(usersPayload).not.toContain('to_jsonb(r)');
  // 화이트리스트 컬럼은 명시적으로 나열돼 있어야 한다 — repo.ts의 SELECT_COLUMNS와 대응.
  for (const column of [
    'id', 'email', 'name', 'phone', 'provider', 'provider_id', 'pet_type', 'breed',
    'main_concern', 'role', 'status', 'profile_image', 'email_verified', 'created_at',
    'company_name', 'business_number', 'reject_reason', 'signup_data', 'managed_brand_ids',
    'must_change_password', 'session_version',
  ]) {
    expect(usersPayload, `missing whitelisted column: ${column}`).toContain(`'${column}'`);
  }
});

test('0173 raises only PT409 (never 40001) for query validation failures', () => {
  const sql = read(...MIGRATION_PATH);
  const pt409Raises = sql.match(/errcode = 'PT409'/g) ?? [];
  expect(pt409Raises.length).toBe(1);
  expect(sql).toContain("raise exception 'INVALID_MEMBER_QUERY' using errcode = 'PT409'");
  expect(sql).not.toContain("'40001'");
});

test('0173 validates the same page/pageSize/search/role/status bounds as listQuery.ts', () => {
  const sql = read(...MIGRATION_PATH);
  expect(sql).toContain('p_page not between 1 and 1000000');
  expect(sql).toContain('p_page_size not between 1 and 100');
  expect(sql).toContain('length(p_search) > 200');
  expect(sql).toContain("p_role not in ('', 'user', 'admin', 'b2b', 'insurance', 'partner')");
  // MemberFilters.tsx의 상태 select에는 withdrawn 옵션이 없다 — 화이트리스트에서도 제외한다
  // (PR#326 원본 0153은 withdrawn을 포함했으나, 이 포트는 UI 필터 옵션과 정합성을 맞춘다).
  expect(sql).toContain("p_status not in ('', 'active', 'inactive', 'pending', 'rejected')");
  expect(sql).not.toContain("'withdrawn'");
});

test('0173 search binds literal text via strpos(lower(...)), never string-interpolated SQL', () => {
  const sql = read(...MIGRATION_PATH);
  expect(sql).toContain("strpos(lower(coalesce(m.name, '')), lower(p_search)) > 0");
  expect(sql).toContain("strpos(lower(coalesce(m.email, '')), lower(p_search)) > 0");
  expect(sql).toContain("strpos(coalesce(m.phone, ''), p_search) > 0");
  expect(sql).toContain("strpos(lower(coalesce(m.company_name, '')), lower(p_search)) > 0");
  expect(sql).not.toMatch(/\|\|\s*p_search\s*\|\|/);
});

test('0173 orders both the page window and the returned jsonb by created_at desc, id desc', () => {
  const sql = read(...MIGRATION_PATH);
  expect(sql).toContain('order by created_at desc, id desc');
  expect(sql).toContain('order by r.created_at desc, r.id desc');
});

test('0173 clamps an out-of-range page to the last page rather than erroring', () => {
  const sql = read(...MIGRATION_PATH);
  expect(sql).toContain('least(p_page::bigint, greatest(1::bigint, (total + p_page_size - 1) / p_page_size))');
});

test('0173 summary counts are unfiltered (computed over all members, not the filtered set)', () => {
  const sql = read(...MIGRATION_PATH);
  const summaryMatch = sql.match(/'summary',[\s\S]*?\) from public\.members\)/);
  expect(summaryMatch, 'summary block not found').toBeTruthy();
  expect(summaryMatch![0]).toContain('from public.members)');
  expect(summaryMatch![0]).not.toContain('from filtered');
});

test('0173 revokes public/anon/authenticated and grants only service_role', () => {
  const sql = read(...MIGRATION_PATH);
  expect(sql).toMatch(
    /revoke all on function public\.list_admin_member_page\(integer, integer, text, text, text\) from public, anon, authenticated;/,
  );
  expect(sql).toMatch(
    /grant execute on function public\.list_admin_member_page\(integer, integer, text, text, text\)\s+to service_role;/,
  );
});

test('0173 declares the RPC as stable and security definer', () => {
  const sql = read(...MIGRATION_PATH);
  const headerMatch = sql.match(/create or replace function public\.list_admin_member_page\([\s\S]*?\$\$;/);
  expect(headerMatch, 'function body not found').toBeTruthy();
  expect(headerMatch![0]).toContain('stable');
  expect(headerMatch![0]).toContain('security definer');
  expect(headerMatch![0]).toContain('set search_path = public');
});

// repo.ts는 'server-only'/next-auth 등을 import하는 다른 모듈과 달리 이 파일 자체는 순수하지만,
// 실제 handler(listMemberPage)를 DB 없이 검증하려면 getSupabase를 stub해야 한다 —
// cms-foundation-contract.spec.ts의 transpile-and-stub 패턴을 그대로 재사용한다.
function loadServerModuleWithStubs(relativePath: string, dependencies: Record<string, unknown>): Record<string, unknown> {
  const file = path.join(root, relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const loaded = { exports: {} as Record<string, unknown> };
  const factory = new Function('require', 'module', 'exports', outputText) as (
    require: (name: string) => unknown,
    module: typeof loaded,
    exports: Record<string, unknown>,
  ) => void;
  factory((name: string) => {
    if (!Object.hasOwn(dependencies, name)) throw new Error(`Unstubbed dependency: ${name}`);
    return dependencies[name];
  }, loaded, loaded.exports);
  return loaded.exports;
}

test('repo.listMemberPage maps RPC SQLSTATE PT409 to InvalidMemberQueryError', async () => {
  const rpcCalls: unknown[] = [];
  const repo = loadServerModuleWithStubs('src/lib/members/repo.ts', {
    '@/lib/supabase/server': {
      getSupabase: () => ({
        rpc: async (...args: unknown[]) => {
          rpcCalls.push(args);
          return { data: null, error: { code: 'PT409', message: 'INVALID_MEMBER_QUERY' } };
        },
      }),
    },
    '@/lib/members/profile': { isMemberProfileComplete: () => true },
    '@/lib/logServerError': { logServerError: () => {} },
  });
  const { listMemberPage, InvalidMemberQueryError } = repo as {
    listMemberPage: (query: { page: number; pageSize: number; search: string; role: string; status: string }) => Promise<unknown>;
    InvalidMemberQueryError: new () => Error;
  };
  await expect(
    listMemberPage({ page: 1, pageSize: 20, search: '', role: '', status: '' }),
  ).rejects.toBeInstanceOf(InvalidMemberQueryError);
  expect(rpcCalls.length).toBe(1);
});

test('repo.listMemberPage never exposes password_hash on returned users even if a row leaks it', async () => {
  // 방어적 회귀 테스트 — 0173이 화이트리스트를 지켜도, RPC 응답 행에 password_hash가 실수로
  // 섞여 들어오는 미래의 회귀까지 잡아야 한다. toUser()가 그 필드를 절대 통과시키지 않는지 확인한다.
  const repo = loadServerModuleWithStubs('src/lib/members/repo.ts', {
    '@/lib/supabase/server': {
      getSupabase: () => ({
        rpc: async () => ({
          data: {
            users: [
              {
                id: 'member-1',
                email: 'leak@test.baekjo',
                name: 'Leak Test',
                phone: '010-0000-0000',
                password_hash: 'should-never-appear',
                provider: 'email',
                provider_id: null,
                pet_type: null,
                breed: null,
                main_concern: null,
                role: 'user',
                status: 'active',
                profile_image: null,
                email_verified: true,
                created_at: '2026-01-01T00:00:00.000Z',
                company_name: null,
                business_number: null,
                reject_reason: null,
                signup_data: {},
                managed_brand_ids: null,
                must_change_password: false,
                session_version: 0,
              },
            ],
            total: 1,
            page: 1,
            pageSize: 20,
            summary: { total: 1, recent: 0, pending: 0, partners: 0 },
          },
          error: null,
        }),
      }),
    },
    '@/lib/members/profile': { isMemberProfileComplete: () => true },
    '@/lib/logServerError': { logServerError: () => {} },
  });
  const { listMemberPage } = repo as {
    listMemberPage: (query: { page: number; pageSize: number; search: string; role: string; status: string }) => Promise<{ users: Array<Record<string, unknown>> }>;
  };
  const result = await listMemberPage({ page: 1, pageSize: 20, search: '', role: '', status: '' });
  expect(result.users).toHaveLength(1);
  expect(Object.keys(result.users[0])).not.toContain('passwordHash');
  expect(JSON.stringify(result.users[0])).not.toContain('should-never-appear');
});
