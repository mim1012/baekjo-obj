import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { CMS_PAGE_DEFINITIONS } from '@/lib/cms/pageDefinitions';

const root = path.resolve(__dirname, '..', '..');
const read = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

const publicConsumers: Record<string, string[]> = {
  'site-shell': [
    'src/components/common/Header.tsx',
    'src/components/common/Footer.tsx',
    'src/components/common/MobileBottomNav.tsx',
    'src/components/legal/ManagedLegalDocument.tsx',
    'src/app/sitemap.ts',
    'src/app/insurance/layout.tsx',
  ],
  shop: ['src/components/shop/ShopContent.tsx'],
  brands: ['src/components/brands/BrandsContent.tsx'],
  reviews: ['src/app/reviews/page.tsx'],
  notices: ['src/app/notices/page.tsx'],
  audit: ['src/app/audit/page.tsx'],
  b2b: ['src/app/b2b/page.tsx'],
  concerns: ['src/app/concerns/page.tsx'],
  experts: ['src/app/experts/page.tsx'],
  'care-kit': ['src/app/landing/care-kit/page.tsx'],
  terms: ['src/app/terms/page.tsx', 'src/components/legal/ManagedLegalDocument.tsx'],
  privacy: ['src/app/privacy/page.tsx', 'src/components/legal/ManagedLegalDocument.tsx'],
  'refund-policy': ['src/app/refund-policy/page.tsx', 'src/components/legal/ManagedLegalDocument.tsx'],
};

function regexEscape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('관리자 CMS 입력칸 → 고객 화면 소비 전수 연결', () => {
  test('보험을 제외한 모든 입력칸은 대응 고객 화면에서 실제로 읽힌다', () => {
    for (const definition of CMS_PAGE_DEFINITIONS.filter((page) => page.key !== 'insurance-landing')) {
      const files = publicConsumers[definition.key];
      expect(files, `${definition.key}: 고객 소비 파일 미등록`).toBeTruthy();
      const source = files.map((file) => read(...file.split('/'))).join('\n');

      for (const section of definition.sections) {
        for (const field of section.fields) {
          let expectedReference: string;
          if (definition.key === 'site-shell') {
            const [group, leaf] = field.path.split('.');
            expectedReference = group === 'company'
              ? `company.${leaf}`
              : `siteContent.${field.path}`;
          } else if (definition.group === '정책') {
            expectedReference = `document.${field.path}`;
          } else {
            expectedReference = `content.${field.path}`;
          }

          expect(source, `${definition.key}.${field.path}: 고객 화면에서 읽지 않음`).toContain(expectedReference);

          for (const itemField of field.itemFields ?? []) {
            expect(
              new RegExp(`(?:\\.|[{,]\\s*)${regexEscape(itemField.key)}(?:\\b|\\s*:)`).test(source),
              `${definition.key}.${field.path}[].${itemField.key}: 카드 항목에서 읽지 않음`,
            ).toBe(true);
          }
        }
      }
    }
  });
});
