import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import type { AdminMemberPage } from '@/types';

// PR5 U0(순수 계약)의 경계 고정 — repo.ts는 'server-only'를 요구하는 @/lib/supabase/server를
// import하므로 이 spec 프로세스에서 그냥 require하면 throw한다(cms-foundation-contract.spec.ts와
// 동일한 transpile-and-stub 패턴으로 회피). DB·브라우저 불필요.
//
// session_version 컬럼은 0172 마이그레이션 적용 전까지 staging에 존재하지 않는다 — SELECT_COLUMNS에
// 넣으면 전 로그인이 500이 된다. 그래서 U0는 SELECT_COLUMNS를 건드리지 않고, 별도
// memberSelectColumns(withSessionVersion)/SESSION_VERSION_COLUMN만 추가한다(U1이 마이그레이션
// 적용 후 호출부를 전환). 이 스펙은 그 경계와, rowToRecord가 없는 컬럼을 0으로 흡수하는 계약을
// 함께 고정한다.

const root = path.resolve(__dirname, '..', '..');
const repoPath = path.join(root, 'src', 'lib', 'members', 'repo.ts');
const repoSource = fs.readFileSync(repoPath, 'utf8');

function loadServerModuleWithStubs(
  file: string,
  dependencies: Record<string, unknown>,
): Record<string, unknown> {
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
  factory(
    (name: string) => {
      if (!Object.hasOwn(dependencies, name)) throw new Error(`Unstubbed dependency: ${name}`);
      return dependencies[name];
    },
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

/** members.select().eq(...).maybeSingle() 체인만 흉내 내는 최소 fake — findMemberById가
 *  실제로 밟는 경로를 그대로 태워 rowToRecord를 간접 호출한다(rowToRecord 자체는 비공개 유지). */
function fakeSupabaseReturning(row: Record<string, unknown> | null) {
  return {
    getSupabase: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: row, error: null }),
          }),
        }),
      }),
    }),
  };
}

function loadRepoModule(
  row: Record<string, unknown> | null,
  logServerErrorStub: (context: string, error: unknown) => void = () => {},
): Record<string, unknown> {
  return loadServerModuleWithStubs(repoPath, {
    '@/lib/supabase/server': fakeSupabaseReturning(row),
    '@/lib/members/profile': { isMemberProfileComplete: () => true },
    '@/lib/logServerError': { logServerError: logServerErrorStub },
  });
}

const baseRow = {
  id: 'member-1',
  email: 'a@example.com',
  name: '테스터',
  phone: '01000000000',
  password_hash: 'hash',
  provider: 'email' as const,
  provider_id: null,
  pet_type: null,
  breed: null,
  main_concern: null,
  role: 'user' as const,
  status: 'active' as const,
  profile_image: null,
  email_verified: true,
  created_at: '2026-09-15T00:00:00.000Z',
  company_name: null,
  business_number: null,
  reject_reason: null,
  signup_data: {},
  managed_brand_ids: null,
  must_change_password: false,
};

test('rowToRecord(via findMemberById) maps a row without session_version to sessionVersion 0', async () => {
  const repo = loadRepoModule({ ...baseRow, session_version: undefined });
  const findMemberById = repo.findMemberById as (id: string) => Promise<{ sessionVersion: number } | null>;
  const record = await findMemberById('member-1');
  expect(record).not.toBeNull();
  expect(record?.sessionVersion).toBe(0);
});

test('rowToRecord(via findMemberById) maps a row with session_version=null to sessionVersion 0', async () => {
  const repo = loadRepoModule({ ...baseRow, session_version: null });
  const findMemberById = repo.findMemberById as (id: string) => Promise<{ sessionVersion: number } | null>;
  const record = await findMemberById('member-1');
  expect(record?.sessionVersion).toBe(0);
});

test('rowToRecord(via findMemberById) passes a present session_version through unchanged', async () => {
  const repo = loadRepoModule({ ...baseRow, session_version: 7 });
  const findMemberById = repo.findMemberById as (id: string) => Promise<{ sessionVersion: number } | null>;
  const record = await findMemberById('member-1');
  expect(record?.sessionVersion).toBe(7);
});

test('AdminMemberPage shape compiles with users/total/page/pageSize/summary', () => {
  const page: AdminMemberPage = {
    users: [],
    total: 0,
    page: 1,
    pageSize: 20,
    summary: { total: 0, recent: 0, pending: 0, partners: 0 },
  };
  expect(page.summary).toEqual({ total: 0, recent: 0, pending: 0, partners: 0 });
});

test('SELECT_COLUMNS stays unchanged (no session_version) until the 0172 migration ships', () => {
  const match = repoSource.match(/const SELECT_COLUMNS =\s*\n?\s*'([^']+)'/);
  expect(match).not.toBeNull();
  const columns = (match?.[1] ?? '').split(',').map((c) => c.trim());
  expect(columns).not.toContain('session_version');
  expect(columns).toContain('must_change_password');
});

/** select().eq().maybeSingle() 체인에서 첫 호출은 42703(undefined_column)을 던지고, 두 번째
 *  호출(폴백의 findMemberByEmail/findMemberById 재조회)은 정상 행을 돌려주는 fake. N1 — 42703
 *  폴백이 실제로 발동할 때 logServerError가 호출되는지(관측 가능성 확보) 검증하기 위함이다. */
function fakeSupabaseUndefinedColumnThenSuccess(row: Record<string, unknown>) {
  let call = 0;
  return {
    getSupabase: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => {
              call += 1;
              if (call === 1) {
                return { data: null, error: { code: '42703', message: 'column "session_version" does not exist' } };
              }
              return { data: row, error: null };
            },
          }),
        }),
      }),
    }),
  };
}

test('N1: session_version 42703 폴백이 발동하면 logServerError가 호출된다 (findMemberByEmailWithSessionVersion)', async () => {
  const logCalls: Array<[string, unknown]> = [];
  const repo = loadServerModuleWithStubs(repoPath, {
    '@/lib/supabase/server': fakeSupabaseUndefinedColumnThenSuccess(baseRow),
    '@/lib/members/profile': { isMemberProfileComplete: () => true },
    '@/lib/logServerError': { logServerError: (context: string, error: unknown) => { logCalls.push([context, error]); } },
  });
  const findMemberByEmailWithSessionVersion = repo.findMemberByEmailWithSessionVersion as (
    email: string,
  ) => Promise<{ sessionVersion: number } | null>;
  const record = await findMemberByEmailWithSessionVersion('a@example.com');
  expect(record?.sessionVersion).toBe(0);
  expect(logCalls).toHaveLength(1);
  expect(logCalls[0][0]).toContain('session_version 컬럼이 없어 레거시 조회로 폴백합니다');
  expect(logCalls[0][0]).toContain('0172');
});

test('N1: session_version 42703 폴백이 발동하면 logServerError가 호출된다 (findMemberByIdWithSessionVersion)', async () => {
  const logCalls: Array<[string, unknown]> = [];
  const repo = loadServerModuleWithStubs(repoPath, {
    '@/lib/supabase/server': fakeSupabaseUndefinedColumnThenSuccess(baseRow),
    '@/lib/members/profile': { isMemberProfileComplete: () => true },
    '@/lib/logServerError': { logServerError: (context: string, error: unknown) => { logCalls.push([context, error]); } },
  });
  const findMemberByIdWithSessionVersion = repo.findMemberByIdWithSessionVersion as (
    id: string,
  ) => Promise<{ sessionVersion: number } | null>;
  const record = await findMemberByIdWithSessionVersion('member-1');
  expect(record?.sessionVersion).toBe(0);
  expect(logCalls).toHaveLength(1);
  expect(logCalls[0][0]).toContain('session_version 컬럼이 없어 레거시 조회로 폴백합니다');
});

test('SESSION_VERSION_COLUMN constant and memberSelectColumns(withSessionVersion) helper exist', () => {
  expect(repoSource).toContain("SESSION_VERSION_COLUMN = 'session_version'");
  expect(repoSource).toMatch(/function memberSelectColumns\(withSessionVersion: boolean\): string/);

  const repo = loadRepoModule(baseRow);
  const memberSelectColumns = repo.memberSelectColumns as (withSessionVersion: boolean) => string;
  expect(memberSelectColumns(false)).not.toContain('session_version');
  expect(memberSelectColumns(true)).toContain('session_version');
  expect(memberSelectColumns(true)).toContain('must_change_password');
});
