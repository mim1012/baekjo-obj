import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

test.describe('brand naming normalization', () => {
  test('home uses the full Baekjo Objet Audit label', () => {
    // PR #112(홈 문구 → 관리자 설정 이관)로 홈 카피의 정본이 HomeClient 하드코딩에서
    // src/data/homeContent.ts 의 defaultHomeSettings 로 이동했다. 라벨 표기는 정본에서 검증한다.
    const home = read('src/components/home/HomeClient.tsx');
    const defaults = read('src/data/homeContent.ts');

    expect(defaults).toContain('백조오브제 Audit 검증을 통과한 브랜드만 소개합니다.');
    expect(defaults).toContain("badge: '백조오브제 Audit'");
    expect(home).not.toContain('백조 Audit');
    expect(defaults).not.toContain('백조 Audit');
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
