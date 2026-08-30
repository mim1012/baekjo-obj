import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');

test('저장된 notices_config에서도 미지원 쿠폰 공지를 제거하는 migration이 존재한다', () => {
  const migrationPath = path.join(root, 'supabase', 'migrations', '0145_remove_unavailable_coupon_notice.sql');
  const migration = fs.readFileSync(migrationPath, 'utf8');

  expect(migration).toContain('update public.notices_config');
  expect(migration).toContain("where id = 'default'");
  expect(migration).toContain("entry.item->>'id' <> 'n2'");
  expect(migration).toContain("not ilike '%쿠폰%'");
  expect(migration).toContain("not ilike '%첫 구매 고객 무료 배송 혜택%'");
  expect(migration).toContain("jsonb_array_elements(value->'items') with ordinality");
});
