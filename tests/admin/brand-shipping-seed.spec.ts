import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const migration = fs.readFileSync(
  path.join(root, 'supabase', 'migrations', '0145_seed_brand_shipping_policy_common_fields.sql'),
  'utf8',
);

test('7개 브랜드의 공통 배송정책 초기값과 브랜드 ID가 migration에 포함된다', () => {
  for (const id of ['b1', 'b2', 'b3', 'b5', 'b6', 'b7', 'b9']) {
    expect(migration).toContain(`where id = '${id}'`);
  }
  expect(migration).toContain('supportEmail');
  expect(migration).toContain('supportKakaoLabel');
});

test('초기 정책에 미확정 안내 문구를 저장하지 않는다', () => {
  for (const unresolved of ['확인 필요', '추가 안내 예정', '해당 없음']) {
    expect(migration).not.toContain(unresolved);
  }
});
