import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test.describe('회원 상세 제출정보 표시', () => {
  test('signupData를 JSON 덤프가 아닌 사용자용 요약 컴포넌트로 렌더한다', () => {
    const detailPage = src('src', 'components', 'admin-new', 'members', 'MemberDetailPage.tsx');
    const summary = src('src', 'components', 'admin-new', 'members', 'MemberSignupDataSummary.tsx');

    expect(detailPage).toContain('<MemberSignupDataSummary data={member.signupData} />');
    expect(detailPage).not.toContain('JSON.stringify(member.signupData');
    expect(detailPage).not.toContain('<pre');

    expect(summary).toContain('제출 서류');
    expect(summary).toContain('사업자등록증');
    expect(summary).toContain('개인정보 및 자료 활용 동의');
    expect(summary).toContain('{AGREEMENT_LABELS[key]} 완료');
  });
});
