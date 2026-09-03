import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const source = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

test('인증된 마이페이지는 로그아웃 후 캐시된 문서를 재사용하지 않는다', () => {
  const mypage = source('src/app/mypage/page.tsx');
  const client = source('src/app/mypage/MypageClient.tsx');

  expect(mypage).toContain("export const dynamic = 'force-dynamic';");
  expect(mypage).not.toContain("'use client';");
  expect(client).toContain("'use client';");
});

test('관리자 데스크톱·모바일 로그아웃은 공통 세션 정리 후 홈으로 이동한다', () => {
  for (const relativePath of [
    'src/components/admin-new/layout/AdminSidebar.tsx',
    'src/components/admin-new/layout/AdminMobileNav.tsx',
  ]) {
    const component = source(relativePath);

    expect(component).toContain("import { logout } from '@/lib/storage';");
    expect(component).toContain("window.location.assign('/');");
  }
});
