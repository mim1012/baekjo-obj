import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

test.describe('익명 세션 조회 계약', () => {
  test('공개 화면의 세션 조회는 익명을 정상 상태로 반환하고 쓰기 API 보호는 유지한다', () => {
    const route = fs.readFileSync(
      path.join(process.cwd(), 'src/app/api/members/me/route.ts'),
      'utf8',
    );

    expect(route).toContain("NextResponse.json({ user: null }, { status: 200 })");
    expect(route).toContain('const activeMember = await requireActiveMember()');
    expect(route.match(/const activeMember = await requireActiveMember\(\)/g)).toHaveLength(2);
  });
});
