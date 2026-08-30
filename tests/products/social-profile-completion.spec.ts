import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { isMemberProfileComplete } from '../../src/lib/members/profile';

const root = path.resolve(__dirname, '..', '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test.describe('소셜 로그인 회원정보 보완 게이트', () => {
  test('이름과 전화번호가 모두 있어야 프로필 완성으로 판정한다', () => {
    expect(isMemberProfileComplete({ name: '홍길동', phone: '010-0000-0000' })).toBe(true);
    expect(isMemberProfileComplete({ name: '홍길동', phone: '' })).toBe(false);
    expect(isMemberProfileComplete({ name: '', phone: '010-0000-0000' })).toBe(false);
    expect(isMemberProfileComplete({ name: '  ', phone: '  ' })).toBe(false);
  });

  test('소셜 로그인 완료 후 미완성 프로필을 보완 화면으로 보낸다', () => {
    const authComplete = read('src/app/auth/complete/page.tsx');
    const profilePage = read('src/app/auth/complete-profile/page.tsx');
    const orderRoute = read('src/app/api/orders/route.ts');
    expect(authComplete).toContain('user.profileCompleted');
    expect(authComplete).toContain('/auth/complete-profile?returnTo=');
    expect(profilePage).toContain('updateMyProfile');
    expect(profilePage).toContain('저장하고 계속하기');
    expect(orderRoute).toContain("error: 'profile-incomplete'");
    expect(orderRoute).toContain('isStr(b.address, 1, MAX_ADDRESS)');
  });
});
