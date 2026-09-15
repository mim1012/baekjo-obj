import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.join(
  path.resolve(__dirname, '..', '..'),
  'supabase/migrations/0172_member_session_version.sql',
);

test('0172는 session_version 컬럼을 추가만 하고(add column if not exists) 기존 행을 다시 쓰지 않는다', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  expect(migration).toContain('add column if not exists session_version');
  expect(migration).toContain('not null default 0');
});

test('트리거는 password_hash/role 변경과 정지·탈퇴·반려로의 상태 전이에서만 버전을 올린다', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  expect(migration).toContain('new.password_hash is distinct from old.password_hash');
  expect(migration).toContain('new.role is distinct from old.role');
  expect(migration).toContain("new.status in ('inactive', 'withdrawn', 'rejected')");
  // 재활성(→active)은 이 in() 목록에 없으므로 별도 분기로 올리지 않는다 — 명시적 부재 확인.
  expect(migration).not.toContain("'active'");
});

test('트리거는 password_hash/status/role 컬럼 UPDATE에만 걸리고, 40001 SQLSTATE는 어디에도 없다', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  expect(migration).toContain('before update of password_hash, status, role on public.members');
  expect(migration).toContain('execute function public.bump_member_session_version()');
  expect(migration).not.toContain('40001');
});

test('트리거 함수 실행권한은 public/anon/authenticated에서 회수된다', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  expect(migration).toContain('revoke execute on function public.bump_member_session_version()');
  expect(migration).toContain('from public, anon, authenticated');
});

test('멱등 재적용을 위해 트리거를 만들기 전에 drop trigger if exists를 두 번 실행한다', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  const dropCount = migration.match(/drop trigger if exists/g)?.length ?? 0;
  expect(dropCount).toBe(2);
});
