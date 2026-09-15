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
});

test('최초 로드 실패를 포함한 모든 조회 실패는 전체 페이지 early-return이 아니라 인라인 ErrorState로 처리된다', () => {
  // 전체 페이지 ErrorState early-return이 없어야 한다 — error를 가드로 한 "if (...) { return (" 블록이
  // 없다. (과거에는 "!initialLoadDone && error"로 걸린 도달 불가능한 죽은 분기가 있었다: setError는
  // catch 한 곳뿐이고 같은 finally 가드가 setInitialLoadDone(true)를 항상 함께 실행하므로, error가
  // 보이는 첫 렌더에서 이미 initialLoadDone === true였다.)
  const deadBranchMatch = source.match(/if \([^)]*error[^)]*\)\s*\{\s*\n\s*return\s*\(/);
  expect(deadBranchMatch).toBeNull();

  // 메인 렌더 경로(MemberFilters 렌더 이후)에 error를 조건으로 한 인라인 분기가 있어야 한다.
  const filtersIndex = source.indexOf('<MemberFilters');
  const inlineErrorIndex = source.indexOf('{error ? (', filtersIndex);
  expect(inlineErrorIndex).toBeGreaterThan(filtersIndex);

  // 그 인라인 분기 안에 재시도 가능한 ErrorState가 있어야 한다(전체 페이지 교체가 아니라
  // MemberFilters·Pagination과 같은 렌더 트리 안의 형제 요소로 — 즉 error 중에는 Pagination도
  // 함께 숨는다).
  const inlineBlock = source.slice(inlineErrorIndex, inlineErrorIndex + 400);
  expect(inlineBlock).toContain('<ErrorState');
  expect(inlineBlock).toContain('onRetry={handleRetry}');
});

test('MemberDataTable는 loading을 isLoading prop으로 계속 전달한다(표 내부 로딩은 유지)', () => {
  expect(source).toMatch(/<MemberDataTable[^>]*isLoading=\{loading\}/);
});
