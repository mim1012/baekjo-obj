import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const src = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

test.describe('상품 문의의 실제 고객 화면 바인딩', () => {
  test('상품상세 문의에는 고객이 작성한 실제 문의만 표시한다', () => {
    const adaptersSource = src('src', 'lib', 'adapters.ts');
    const inquirySource = adaptersSource.slice(adaptersSource.indexOf('export async function getMergedInquiries'));

    expect(inquirySource).toContain('getProductInquiriesByProduct');
    expect(inquirySource).toContain("source: 'user'");
    expect(inquirySource).not.toContain('getQnaConfig');
    expect(inquirySource).not.toContain("source: 'seed'");
    expect(adaptersSource).not.toMatch(/from ['"]@\/data\/qna['"]/);
  });

  test('공개 화면에 연결되지 않은 수동 Q&A 관리 화면은 제거한다', () => {
    expect(fs.existsSync(path.join(root, 'src', 'app', 'admin', 'qna', 'page.tsx'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'src', 'app', 'api', 'admin', 'qna', 'route.ts'))).toBe(false);
    expect(fs.existsSync(path.join(root, 'src', 'app', 'api', 'qna', 'route.ts'))).toBe(false);

    const inquiryPage = src('src', 'app', 'admin', 'inquiries', 'page.tsx');
    expect(inquiryPage).toContain('답변 등록하고 고객에게 반영');
    expect(inquiryPage).toContain('수정 답변 저장');
  });
});
