import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { isCurrentSession } from '@/lib/members/sessionVersion';

/**
 * src/lib/auth.ts를 실제로 transpile해서 jwt 콜백을 꺼내 실행한다(목이 아니라 실물 구현 검증).
 * PR326(`origin/be/review-correctness-20260905` tests/security/session-revocation.spec.ts) 원문
 * 포팅 — 다만 이 저장소의 auth.ts는 findMemberByEmail/findMemberById 대신 session_version까지
 * 함께 읽는 findMemberByEmailWithSessionVersion/findMemberByIdWithSessionVersion(repo.ts, 0172
 * 미적용 시 42703 폴백)을 쓰므로 mocks 키를 그에 맞춘다.
 */
type Token = { memberId?: string; sessionVersion?: number };
type Member = { sessionVersion: number; status: string };
type Jwt = (input: {
  token: Token;
  user?: { id: string; sessionVersion: number };
  account?: { provider: string; providerAccountId: string };
  trigger?: string;
  session?: unknown;
}) => Promise<Token | null>;

function loadJwt() {
  let jwt: Jwt;
  let version = 0;
  let status = 'active';
  const member = (): Member => ({ sessionVersion: version, status });
  const mocks: Record<string, unknown> = {
    'next-auth': {
      default: (config: { callbacks: { jwt: Jwt } }) => {
        jwt = config.callbacks.jwt;
        return {};
      },
      CredentialsSignin: class extends Error {},
    },
    'next-auth/providers/credentials': { default: (options: unknown) => options },
    '@/lib/auth.config': { authConfig: { providers: [], callbacks: {} } },
    '@/lib/members/repo': {
      // authorize()는 이 스펙에서 호출되지 않으므로 실제 반환값은 중요하지 않다 — 참조만 존재하면 된다.
      findMemberByEmailWithSessionVersion: async () => null,
      // jwt 콜백의 else 분기(기존 토큰 재검증)와 소셜 분기가 실제로 쓰는 함수.
      findMemberByIdWithSessionVersion: async () => member(),
      upsertSocialMember: async () => ({ id: 'member-1', ...member() }),
    },
    '@/lib/members/sessionVersion': { isCurrentSession },
    '@/lib/members/password': { verifyPassword: async () => false },
    '@/lib/security/authRateLimit': { checkAuthRateLimit: () => true, resetAuthRateLimit: () => {} },
  };
  const compiled = ts.transpileModule(readFileSync('src/lib/auth.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mockModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(
    (name: string) => {
      if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
      return mocks[name];
    },
    mockModule,
    mockModule.exports,
  );
  return {
    jwt: (input: Parameters<Jwt>[0]) => jwt(input),
    changePassword: () => {
      ++version;
    },
    suspend: () => {
      status = 'inactive';
    },
  };
}

test('버전이 일치하는 기존 토큰은 그대로 통과하고, 비밀번호 변경 후 이전 버전 토큰은 무효화된다', async () => {
  const auth = loadJwt();
  const token = await auth.jwt({ token: {}, user: { id: 'member-1', sessionVersion: 0 } });
  expect(token?.sessionVersion).toBe(0);
  const revalidated = await auth.jwt({ token: token! });
  expect(revalidated).not.toBeNull();
  expect(revalidated).toBe(token); // DB 값을 되쓰지 않고 같은 객체를 그대로 반환한다.

  auth.changePassword();
  expect(await auth.jwt({ token: token! })).toBeNull();

  // 새로 로그인하면 새 버전을 실은 토큰이 발급되고, 그 토큰은 다시 유효하다.
  const fresh = await auth.jwt({ token: {}, user: { id: 'member-1', sessionVersion: 1 } });
  expect(await auth.jwt({ token: fresh! })).not.toBeNull();
});

test('정지된 회원의 기존 토큰은 버전이 그대로여도 즉시 무효화된다', async () => {
  const auth = loadJwt();
  const token = await auth.jwt({ token: {}, user: { id: 'member-1', sessionVersion: 0 } });
  auth.suspend();
  expect(await auth.jwt({ token: token! })).toBeNull();
});

test('sessionVersion 필드가 없는 구버전(마이그레이션 이전 발급) 토큰은 무효화된다', async () => {
  const auth = loadJwt();
  expect(await auth.jwt({ token: { memberId: 'member-1' } })).toBeNull();
});

test('session.update로 주입한 값은 기존 토큰을 되살리지 못한다', async () => {
  const auth = loadJwt();
  auth.changePassword();
  const revived = await auth.jwt({
    token: { memberId: 'member-1', sessionVersion: 0 },
    trigger: 'update',
    session: { sessionVersion: 1 },
  });
  expect(revived).toBeNull();
});
