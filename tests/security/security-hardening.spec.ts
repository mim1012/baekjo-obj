import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { checkAuthRateLimit, resetAuthRateLimit } from '@/lib/security/authRateLimit';

const root = path.resolve(__dirname, '..', '..');

function read(...segments: string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test.describe('보안 경계 회귀 계약', () => {
  test('관리자와 파트너 인가는 DB status active만 허용한다', () => {
    const admin = read('src', 'lib', 'admin', 'requireAdmin.ts');
    const scoped = read('src', 'lib', 'admin', 'requireBrandScoped.ts');

    expect(admin).toContain("requester.status !== 'active'");
    expect(scoped).toContain("requester.status !== 'active'");
    expect(admin).not.toContain("requester.status === 'inactive'");
    expect(scoped).not.toContain("requester.status === 'inactive'");
  });

  test('운영 메일 링크는 APP_BASE_URL 없이는 요청 Host로 폴백하지 않는다', () => {
    const source = read('src', 'lib', 'email', 'base-url.ts');

    expect(source).toContain("process.env.NODE_ENV === 'production'");
    expect(source).toContain('APP_BASE_URL must be set in production');
    expect(source).toContain('request.nextUrl.origin');
  });

  test('기본 보안 응답 헤더가 모든 경로에 적용된다', () => {
    const source = read('next.config.ts');

    expect(source).toContain("source: '/(.*)'");
    expect(source).toContain("X-Content-Type-Options");
    expect(source).toContain("X-Frame-Options");
    expect(source).toContain("Referrer-Policy");
    expect(source).toContain("Permissions-Policy");
  });

  test('인증 엔드포인트와 결제 취소는 남용·타인 주문 접근을 차단하는 계약을 가진다', () => {
    const authRateLimit = read('src', 'lib', 'security', 'authRateLimit.ts');
    const signup = read('src', 'app', 'api', 'members', 'route.ts');
    const reset = read('src', 'app', 'api', 'members', 'password-reset', 'request', 'route.ts');
    const auth = read('src', 'lib', 'auth.ts');
    const cancel = read('src', 'app', 'api', 'payments', 'cancel', 'route.ts');

    expect(authRateLimit).toContain("'login'");
    expect(authRateLimit).toContain("'signup'");
    expect(authRateLimit).toContain("'password-reset'");
    expect(signup).toContain("checkAuthRateLimit('signup'");
    expect(reset).toContain("checkAuthRateLimit('password-reset'");
    expect(auth).toContain("checkAuthRateLimit('login'");
    expect(cancel).toContain('requireActiveMember');
    expect(cancel).toContain('order.memberId !== activeMember.memberId');
  });

  test('인증 레이트리밋은 한도를 넘기면 막고 창이 지나면 다시 허용한다', () => {
    const key = `qa-${Date.now()}`;
    const start = 10_000;

    for (let index = 0; index < 10; index += 1) {
      expect(checkAuthRateLimit('login', key, start)).toBe(true);
    }
    expect(checkAuthRateLimit('login', key, start)).toBe(false);
    expect(checkAuthRateLimit('login', key, start + 15 * 60_000)).toBe(true);
    resetAuthRateLimit('login', key);
  });
});
