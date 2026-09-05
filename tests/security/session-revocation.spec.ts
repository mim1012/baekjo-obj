import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { isCurrentSession } from '@/lib/members/sessionVersion';

type Token = { memberId?: string; sessionVersion?: number };
type Jwt = (input: { token: Token; user?: { id: string; sessionVersion: number }; trigger?: string; session?: unknown }) => Promise<Token | null>;
function loadJwt() {
  let jwt: Jwt;
  let version = 0;
  let status = 'active';
  const mocks: Record<string, unknown> = {
    'next-auth': {
      default: (config: { callbacks: { jwt: Jwt } }) => { jwt = config.callbacks.jwt; return {}; },
      CredentialsSignin: class extends Error {},
    },
    'next-auth/providers/credentials': { default: (options: unknown) => options },
    '@/lib/auth.config': { authConfig: { providers: [], callbacks: {} } },
    '@/lib/members/repo': { findMemberById: async () => ({ sessionVersion: version, status }) },
    '@/lib/members/sessionVersion': { isCurrentSession },
    '@/lib/members/password': {},
    '@/lib/security/authRateLimit': {},
  };
  const compiled = ts.transpileModule(readFileSync('src/lib/auth.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mockModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((name: string) => {
    if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
    return mocks[name];
  }, mockModule, mockModule.exports);
  return { jwt: (input: Parameters<Jwt>[0]) => jwt(input), changePassword: () => { ++version; }, suspend: () => { status = 'inactive'; } };
}

test('the actual JWT callback rejects a pre-change session and accepts a new login', async () => {
  const auth = loadJwt();
  const token = await auth.jwt({ token: {}, user: { id: 'member-1', sessionVersion: 0 } });
  expect(await auth.jwt({ token: token! })).not.toBeNull();
  auth.changePassword();
  expect(await auth.jwt({ token: token! })).toBeNull();
  const fresh = await auth.jwt({ token: {}, user: { id: 'member-1', sessionVersion: 1 } });
  expect(await auth.jwt({ token: fresh! })).not.toBeNull();
});
test('session.update cannot supply a new version to revive an old JWT', async () => {
  const auth = loadJwt();
  auth.changePassword();
  expect(await auth.jwt({ token: { memberId: 'member-1', sessionVersion: 0 }, trigger: 'update', session: { sessionVersion: 1 } })).toBeNull();
});
test('legacy and suspended sessions are rejected', async () => {
  const auth = loadJwt();
  expect(await auth.jwt({ token: { memberId: 'member-1' } })).toBeNull();
  auth.suspend();
  expect(await auth.jwt({ token: { memberId: 'member-1', sessionVersion: 0 } })).toBeNull();
});
