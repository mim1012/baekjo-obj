import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test.describe('brand naming normalization', () => {
  test('home uses the full Baekjo Objet Audit label', () => {
    const home = read('src/components/home/HomeClient.tsx');

    expect(home).toContain('백조오브제 Audit 검증을 통과한 브랜드만 소개합니다.');
    expect(home).toContain('백조오브제 Audit</span>');
    expect(home).not.toContain('백조 Audit');
  });

  // NOTE: the former "canonical seed data" assertion read src/data/{brands,products}.ts,
  // which were removed on main (be/kill-static-seed-canon) — the DB is now the sole SSOT
  // for products/brands. The brand-name display label now lives only in the DB and is
  // asserted below against migration 0036, which is the vehicle for that value.

  test('runtime DB migration backfills only display labels', () => {
    const migration = read('supabase/migrations/0036_brand_naming_normalization.sql');

    expect(migration).toContain("set name = 'RE:펫'");
    expect(migration).toContain("set detail = jsonb_set(detail, '{brandName}', to_jsonb('RE:펫'::text), true)");
    expect(migration).toContain("replace(detail->>'philosophy', 're펫은', 'RE:펫은')");
    expect(migration).not.toContain("set name = replace(name");
  });
});
