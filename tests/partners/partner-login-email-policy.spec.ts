import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const authSource = fs.readFileSync(path.resolve(__dirname, '../../src/lib/auth.ts'), 'utf8');
const mypageSource = fs.readFileSync(path.resolve(__dirname, '../../src/app/mypage/MypageClient.tsx'), 'utf8');

test('승인된 입점업체는 이메일 인증 여부와 무관하게 로그인 상태 검사를 받는다', () => {
  expect(authSource).toContain("if (member.role !== 'partner' && !member.emailVerified)");
  expect(mypageSource).toContain("user.role !== 'partner'");
});
