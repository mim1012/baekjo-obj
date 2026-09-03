import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test.describe('회원가입 동의·이메일 인증 복구 계약', () => {
  test('회원 테이블은 약관 동의 시각과 버전을 보존한다', () => {
    const migration = read('supabase', 'migrations', '0150_member_signup_consents.sql');

    expect(migration).toContain('terms_agreed_at timestamptz');
    expect(migration).toContain('privacy_agreed_at timestamptz');
    expect(migration).toContain('terms_version text');
    expect(migration).toContain('privacy_version text');
  });

  test('일반 가입 API는 필수 동의 누락을 서버에서 거부하고 동의 정보를 저장한다', () => {
    const route = read('src', 'app', 'api', 'members', 'route.ts');
    const repo = read('src', 'lib', 'members', 'repo.ts');

    expect(route).toContain('termsAgree');
    expect(route).toContain('privacyAgree');
    expect(route).toContain("{ error: 'consent-required' }");
    expect(repo).toContain('terms_agreed_at');
    expect(repo).toContain('privacy_agreed_at');
  });

  test('가입 성공은 인증 대기 상태로 이어지고 로그인 전 인증 메일 재발송 경로를 제공한다', () => {
    const storage = read('src', 'lib', 'storage.ts');
    const signup = read('src', 'app', 'signup', 'page.tsx');
    const publicRequest = read('src', 'app', 'api', 'members', 'verify', 'public-request', 'route.ts');

    expect(storage).toContain('verificationPending');
    expect(signup).toContain('이메일 인증을 완료해 주세요');
    expect(signup).toContain('requestEmailVerificationByEmail');
    expect(publicRequest).toContain("{ ok: true }");
    expect(publicRequest).toContain('checkAuthRateLimit');
  });
});
