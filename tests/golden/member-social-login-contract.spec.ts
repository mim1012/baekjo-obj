import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

function sliceBetween(source: string, startNeedle: string, endNeedle: string): string {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

test.describe('골든플로우: 회원 여정 — 소셜 로그인 앱 내부 계약', () => {
  test('Auth.js 설정은 Kakao/Naver provider와 JWT 세션 전달 계약을 유지한다', () => {
    const authConfig = src('src', 'lib', 'auth.config.ts');
    expect(authConfig).toContain("import Kakao from 'next-auth/providers/kakao';");
    expect(authConfig).toContain("import Naver from 'next-auth/providers/naver';");
    expect(authConfig).toContain('providers: [Kakao, Naver]');
    expect(authConfig).toContain("session: { strategy: 'jwt' }");
    expect(authConfig).toContain('session.provider = token.provider;');
    expect(authConfig).toContain('session.user.role = token.role;');
    expect(authConfig).toContain('session.user.memberId = token.memberId;');

    const auth = src('src', 'lib', 'auth.ts');
    const jwtCallback = sliceBetween(auth, 'async jwt({ token, account, user })', 'return token;');
    expect(jwtCallback).toContain("account?.provider === 'kakao' || account?.provider === 'naver'");
    expect(jwtCallback).toContain('await upsertSocialMember({');
    expect(jwtCallback).toContain('providerId: account.providerAccountId');
    expect(jwtCallback).toContain("token.role = 'user';");
    expect(jwtCallback).toContain('token.provider = account.provider;');
  });

  test('소셜 로그인 시작과 완료 브릿지는 /auth/complete → /api/members/me → setCurrentUser 로 이어진다', () => {
    const socialAuth = src('src', 'lib', 'socialAuth.ts');
    expect(socialAuth).toContain("const SOCIAL_COMPLETE_PATH = '/auth/complete';");
    expect(socialAuth).toContain("export async function loginWithProvider(provider: 'kakao' | 'naver')");
    expect(socialAuth).toContain('await signIn(provider, { redirectTo: SOCIAL_COMPLETE_PATH });');
    expect(socialAuth).toContain("const response = await fetch('/api/members/me');");
    expect(socialAuth).toContain('setCurrentUser(user);');

    const completePage = src('src', 'app', 'auth', 'complete', 'page.tsx');
    expect(completePage).toContain("import { completeSocialLogin } from '@/lib/socialAuth';");
    expect(completePage).toContain('completeSocialLogin()');
    expect(completePage).toContain("router.replace(user ? '/' : '/login?error=social');");
    expect(completePage).toContain("router.replace('/login?error=social');");
  });

  test('소셜 계정은 비밀번호 변경 API와 마이페이지 폼에서 이메일 계정과 분리된다', () => {
    const passwordRoute = src('src', 'app', 'api', 'members', 'password', 'route.ts');
    expect(passwordRoute).toContain('if (!member.passwordHash) {');
    expect(passwordRoute).toContain("return NextResponse.json({ error: 'social-account' }, { status: 400 });");

    const mypage = src('src', 'app', 'mypage', 'page.tsx');
    expect(mypage).toContain("user.provider !== 'kakao' && user.provider !== 'naver' && <PasswordChangeSection />");
  });
});
