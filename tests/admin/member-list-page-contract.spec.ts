import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// B1 회귀 잠금 — MemberListPage의 전체 페이지 LoadingState는 최초 1회 로드에만 걸려야 한다.
// 서버 페이지네이션 도입 후 검색어를 입력할 때마다 loadMembers()가 setLoading(true)를 다시
// 호출하는데, 결과가 0건인 상태에서 이 early-return이 재진입하면 MemberFilters(검색 <input>)가
// 언마운트되어 타이핑 중 포커스가 사라진다. 브라우저 없이 소스 텍스트로 다음 계약을 고정한다:
//   1. 컴포넌트에 "최초 로드 완료" 여부를 추적하는 상태가 있다.
//   2. 전체 페이지 LoadingState 분기는 그 상태가 아직 false일 때만 참이 될 수 있다.
//   3. 그 상태는 응답(성공/실패 불문) 이후 true로 고정되고 다시 false로 되돌리는 코드가 없다.
//   4. MemberFilters는 그 early-return 바깥, 즉 메인 렌더 경로에서 항상 렌더된다.

const root = path.resolve(__dirname, '..', '..');
const filePath = path.join(root, 'src', 'components', 'admin-new', 'members', 'MemberListPage.tsx');
const source = fs.readFileSync(filePath, 'utf8');

test('초기 로드 완료 상태(initialLoadDone)가 존재한다', () => {
  expect(source).toMatch(/const \[initialLoadDone, setInitialLoadDone\] = useState\(false\)/);
});

test('전체 페이지 LoadingState 분기는 initialLoadDone이 false일 때만 참이 될 수 있다', () => {
  const guardMatch = source.match(/if \(([^)]*initialLoadDone[^)]*)\)\s*\{\s*\n\s*return\s*\(/);
  expect(guardMatch).not.toBeNull();
  const condition = guardMatch?.[1] ?? '';
  // "!initialLoadDone && ..." 형태여야 한다 — initialLoadDone이 true가 되면 이 분기 자체가
  // 항상 거짓이 되어 전체 페이지 LoadingState로 다시 빠질 수 없다.
  expect(condition).toMatch(/!initialLoadDone/);
  // 이 조건이 걸린 return 블록 안에 LoadingState가 있어야 한다(다른 early-return과 혼동 방지).
  const guardIndex = source.indexOf(guardMatch![0]);
  const blockAfterGuard = source.slice(guardIndex, guardIndex + 400);
  expect(blockAfterGuard).toContain('<LoadingState');
});

test('initialLoadDone을 다시 false로 되돌리는 코드가 없다(최초 1회 로드 이후 영구히 true)', () => {
  expect(source).not.toMatch(/setInitialLoadDone\(false\)/);
});

test('setInitialLoadDone(true)가 loadMembers의 finally(응답 완료) 경로에서 호출된다', () => {
  const finallyMatch = source.match(/\}\s*finally\s*\{[\s\S]*?\n\s*\}\s*\n\s*\}, \[currentPage, searchTerm, roleFilter, statusFilter\]\);/);
  expect(finallyMatch).not.toBeNull();
  expect(finallyMatch?.[0]).toContain('setInitialLoadDone(true)');
  // 디바운스로 취소된 요청(아직 최신이 아니거나 abort된 요청)은 상태를 건드리지 않는 기존 가드를
  // 그대로 유지해야 한다 — requestId 레이스 가드 회귀 방지.
  expect(finallyMatch?.[0]).toMatch(/id === requestId\.current/);
});

test('MemberFilters(검색 입력창)는 전체 페이지 LoadingState early-return 바깥, 메인 렌더 경로에서 렌더된다', () => {
  const loadingGuardIndex = source.search(/if \([^)]*initialLoadDone[^)]*\)\s*\{\s*\n\s*return\s*\(/);
  expect(loadingGuardIndex).toBeGreaterThan(-1);

  const filtersIndex = source.indexOf('<MemberFilters');
  expect(filtersIndex).toBeGreaterThan(-1);

  // MemberFilters 렌더 지점이 로딩 early-return 블록보다 뒤에 있어야, 그 early-return이 실행될
  // 때 MemberFilters는 아직 렌더되지 않은(=별도의 나중 return에 속한) 것이 보장된다.
  expect(filtersIndex).toBeGreaterThan(loadingGuardIndex);

  // 로딩 early-return 블록과 error early-return 블록을 제외한, 그 이후의 메인 return 블록에
  // MemberFilters가 있어야 한다 — 즉 loading/error 분기 전용 블록 내부가 아니어야 한다.
  const errorGuardIndex = source.indexOf('if (error) {');
  expect(errorGuardIndex).toBeGreaterThan(loadingGuardIndex);
  expect(filtersIndex).toBeGreaterThan(errorGuardIndex);
});

test('MemberDataTable는 loading을 isLoading prop으로 계속 전달한다(표 내부 로딩은 유지)', () => {
  expect(source).toMatch(/<MemberDataTable[^>]*isLoading=\{loading\}/);
});
