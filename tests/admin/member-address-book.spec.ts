import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test.describe('회원 배송지 주소록 계약', () => {
  test('배송지 테이블은 회원별 기본 배송지를 하나만 허용한다', () => {
    const migration = read('supabase/migrations/0111_member_addresses.sql');
    expect(migration).toContain('create table public.member_addresses');
    expect(migration).toContain('member_id uuid not null references public.members(id)');
    expect(migration).toContain('create unique index member_addresses_one_default_idx');
    expect(migration).toContain('where is_default = true');
  });

  test('주소록 API와 마이페이지 메뉴가 본인 범위로 연결된다', () => {
    const listRoute = read('src/app/api/members/me/addresses/route.ts');
    const detailRoute = read('src/app/api/members/me/addresses/[id]/route.ts');
    const storage = read('src/lib/storage.ts');
    const sidebar = read('src/app/mypage/components/MypageSidebar.tsx');
    const mobileNav = read('src/app/mypage/components/MypageMobileNav.tsx');
    const page = read('src/app/mypage/page.tsx');

    expect(listRoute).toContain('requireActiveMember');
    expect(detailRoute).toContain('requireActiveMember');
    expect(storage).toContain("fetch('/api/members/me/addresses'");
    expect(sidebar).toContain("id: 'addresses'");
    expect(mobileNav).toContain("id: 'addresses'");
    expect(page).toContain('AddressBookSection');
  });
});
