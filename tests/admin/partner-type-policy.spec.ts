import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');

function src(...segments: string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test.describe('B2B partner type policy', () => {
  test('active source no longer offers petshop as a partner type', () => {
    const activeSources = [
      ['src', 'types', 'index.ts'],
      ['src', 'components', 'care-kit', 'PartnerInquiryForm.tsx'],
      ['src', 'app', 'admin', 'partner-inquiries', 'page.tsx'],
      ['src', 'app', 'api', 'partner-inquiries', 'route.ts'],
    ];

    for (const segments of activeSources) {
      const source = src(...segments);
      expect(source, segments.join('/')).not.toContain('petshop');
      expect(source, segments.join('/')).not.toContain('펫샵');
    }
  });

  test('공개 제휴 문의는 화면 선택지와 서버 허용 유형이 동일하다', () => {
    const formSource = src('src', 'components', 'care-kit', 'PartnerInquiryForm.tsx');
    const routeSource = src('src', 'app', 'api', 'partner-inquiries', 'route.ts');

    for (const value of ['hospital', 'funeral', 'brand', 'hotel', 'etc']) {
      expect(formSource).toContain(`value: '${value}'`);
      expect(routeSource).toContain(`'${value}'`);
    }
    expect(routeSource).toContain("PARTNER_TYPES.includes(b.partnerType as PartnerInquiry['partnerType'])");
  });
});
