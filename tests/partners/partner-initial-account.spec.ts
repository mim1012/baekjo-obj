import { expect, test } from '@playwright/test';
import type { buildPartnerInsertSql as BuildPartnerInsertSql } from '../../scripts/create-partner-account.mjs';

// scripts/create-partner-account.mjs 는 순수 ESM(.mjs, import.meta 사용)이라 Playwright의
// TS→CJS 변환 경유 정적 import(require)로는 로드되지 않는다 — 동적 import()로 우회한다.
let buildPartnerInsertSql: typeof BuildPartnerInsertSql;

test.beforeAll(async () => {
  ({ buildPartnerInsertSql } = await import('../../scripts/create-partner-account.mjs'));
});

test('파트너 계정 INSERT SQL은 partner role/active/must_change_password를 포함한다', () => {
  const sql = buildPartnerInsertSql({
    email: 'partner@penefit.co.kr',
    name: '페네핏',
    companyName: '페네핏',
    passwordHash: 'hashed-value',
    brandIds: ['b1', 'b6'],
  });

  expect(sql).toContain('role');
  expect(sql).toContain("'partner'");
  expect(sql).toContain('status');
  expect(sql).toContain("'active'");
  expect(sql).toContain('must_change_password');
  expect(sql).toContain('true');
  expect(sql).toContain("'{b1,b6}'");
});

test('이름에 작은따옴표가 들어가면 이스케이프된다', () => {
  const sql = buildPartnerInsertSql({
    email: 'partner@example.com',
    name: "O'Brien",
    companyName: null,
    passwordHash: 'hashed-value',
    brandIds: ['b1'],
  });

  expect(sql).toContain("O''Brien");
});

test('companyName 미지정 시 null 리터럴을 사용한다', () => {
  const sql = buildPartnerInsertSql({
    email: 'partner@example.com',
    name: '담당자',
    companyName: null,
    brandIds: ['b1'],
    passwordHash: 'hashed-value',
  });

  expect(sql).toContain('null');
});
