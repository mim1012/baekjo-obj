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
      ['src', 'app', 'admin', 'partners', 'page.tsx'],
      ['src', 'app', 'admin', 'partner-inquiries', 'page.tsx'],
      ['src', 'app', 'api', 'partner-inquiries', 'route.ts'],
      ['src', 'app', 'api', 'admin', 'partners', 'route.ts'],
    ];

    for (const segments of activeSources) {
      const source = src(...segments);
      expect(source, segments.join('/')).not.toContain('petshop');
      expect(source, segments.join('/')).not.toContain('펫샵');
    }
  });

  test('legacy saved partner type values are normalized to etc on read', () => {
    const repoSource = src('src', 'lib', 'partners', 'repo.ts');

    expect(repoSource).toContain('function normalizePartnerType');
    expect(repoSource).toContain("return typeof type === 'string' && PARTNER_TYPES.includes(type as Partner['type'])");
    expect(repoSource).toContain(": 'etc';");
    expect(repoSource).toContain('return data ? normalizePartnersConfig(data.value as PartnersConfig) : null;');
  });
});
