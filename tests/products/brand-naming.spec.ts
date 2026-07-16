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

  test('canonical seed data uses RE:펫 as the visible brand label', () => {
    const brands = read('src/data/brands.ts');
    const products = read('src/data/products.ts');

    expect(brands).toContain("name: 'RE:펫'");
    expect(brands).toContain("philosophy: 'RE:펫은");
    expect(brands).not.toContain("name: 're펫");
    expect(brands).not.toContain('re펫은');

    expect(products).toContain("brandName: 'RE:펫'");
    expect(products).not.toContain("brandName: 're펫'");

    // Product/model English stays intact by design: the product names still use RePet.
    expect(products).toContain("name: 'RePet 강아지 뿌리는 배변유도제 80ml × 2개'");
    expect(products).toContain("name: 'RePet 강아지·고양이 약용·진정 샴푸 400ml'");
  });

  test('runtime DB migration backfills only display labels', () => {
    const migration = read('supabase/migrations/0036_brand_naming_normalization.sql');

    expect(migration).toContain("set name = 'RE:펫'");
    expect(migration).toContain("set detail = jsonb_set(detail, '{brandName}', to_jsonb('RE:펫'::text), true)");
    expect(migration).toContain("replace(detail->>'philosophy', 're펫은', 'RE:펫은')");
    expect(migration).not.toContain("set name = replace(name");
  });
});
