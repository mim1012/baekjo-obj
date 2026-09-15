import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';

// GET /api/admin/members(0173/U2)의 계약을 실제 라우트 파일을 transpile+stub해서 검증한다 —
// DB·auth는 호출하지 않는다(refund-replay-route.spec.ts와 동일한 transpile-and-stub 패턴).
class StubInvalidMemberQueryError extends Error {}

function route(opts: {
  adminOk?: boolean;
  parseImpl?: (params: URLSearchParams) => unknown;
  listMemberPageImpl?: (query: unknown) => Promise<unknown>;
} = {}) {
  const parseCalls: URLSearchParams[] = [];
  const listCalls: unknown[] = [];

  const mocks: Record<string, unknown> = {
    '@/lib/admin/requireAdmin': {
      requireAdmin: async () =>
        opts.adminOk === false
          ? {
              ok: false,
              response: new Response(JSON.stringify({ error: 'unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              }),
            }
          : { ok: true, requester: { id: 'admin' } },
    },
    '@/lib/members/repo': {
      InvalidMemberQueryError: StubInvalidMemberQueryError,
      listMemberPage:
        opts.listMemberPageImpl ??
        (async (query: unknown) => {
          listCalls.push(query);
          return { users: [], total: 0, page: 1, pageSize: 20, summary: { total: 0, recent: 0, pending: 0, partners: 0 } };
        }),
    },
    '@/lib/members/listQuery': {
      parseMemberListQuery:
        opts.parseImpl ??
        ((params: URLSearchParams) => {
          parseCalls.push(params);
          return { page: 1, pageSize: 20, search: '', role: '', status: '' };
        }),
    },
    '@/lib/logServerError': { logServerError: () => {} },
  };

  const source = readFileSync('src/app/api/admin/members/route.ts', 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const mockModule = { exports: {} as { GET: (req: Request) => Promise<Response> } };
  const realRequire = createRequire(`${process.cwd()}/package.json`);
  new Function('require', 'module', 'exports', compiled)(
    (name: string) => mocks[name] ?? realRequire(name),
    mockModule,
    mockModule.exports,
  );
  return {
    call: (search = '') => mockModule.exports.GET(new Request(`http://localhost/api/admin/members${search}`)),
    parseCalls,
    listCalls,
  };
}

test('admin이 아니면 requireAdmin의 응답을 그대로 반환한다(쿼리 파싱·목록 조회 전에 차단)', async () => {
  const r = route({ adminOk: false });
  const response = await r.call();
  expect(response.status).toBe(401);
  expect((await response.json()).error).toBe('unauthorized');
  expect(r.parseCalls.length).toBe(0);
  expect(r.listCalls.length).toBe(0);
});

test('parseMemberListQuery가 던지면 400 invalid-member-query로 접고 listMemberPage는 부르지 않는다', async () => {
  const r = route({
    parseImpl: () => {
      throw new Error('invalid-member-query');
    },
  });
  const response = await r.call('?page=0');
  expect(response.status).toBe(400);
  expect((await response.json()).error).toBe('invalid-member-query');
  expect(r.listCalls.length).toBe(0);
});

test('정상 조회는 listMemberPage의 결과를 그대로 반환하고 no-store 헤더를 붙인다', async () => {
  const page = { users: [{ id: 'u1' }], total: 1, page: 1, pageSize: 20, summary: { total: 1, recent: 1, pending: 0, partners: 0 } };
  const r = route({ listMemberPageImpl: async () => page });
  const response = await r.call('?search=test');
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual(page);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});

test('listMemberPage가 InvalidMemberQueryError를 던지면 400 invalid-member-query로 매핑한다(DB 이중 방어)', async () => {
  const r = route({
    listMemberPageImpl: async () => {
      throw new StubInvalidMemberQueryError('invalid-member-query');
    },
  });
  const response = await r.call();
  expect(response.status).toBe(400);
  expect((await response.json()).error).toBe('invalid-member-query');
});

test('listMemberPage가 그 외 에러를 던지면 500 server-error로 접는다', async () => {
  const r = route({
    listMemberPageImpl: async () => {
      throw new Error('unexpected-db-error');
    },
  });
  const response = await r.call();
  expect(response.status).toBe(500);
  expect((await response.json()).error).toBe('server-error');
});

test('요청 쿼리스트링이 parseMemberListQuery로 그대로 전달된다', async () => {
  const r = route();
  await r.call('?search=abc&page=2&role=partner&status=pending');
  expect(r.parseCalls.length).toBe(1);
  expect(r.parseCalls[0].get('search')).toBe('abc');
  expect(r.parseCalls[0].get('page')).toBe('2');
  expect(r.parseCalls[0].get('role')).toBe('partner');
  expect(r.parseCalls[0].get('status')).toBe('pending');
});
