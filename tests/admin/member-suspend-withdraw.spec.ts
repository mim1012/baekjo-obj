import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  isAllowedMemberStatusTransition,
  allowedMemberStatusTargets,
} from '@/lib/members/statusTransitions';
import { buildWithdrawalPatch } from '@/lib/members/withdrawalPatch';

// 회원 정지·탈퇴·세션 실효(U6/U7/U8/U9/U18) 회귀 스펙 — 순수 함수, 브라우저·DB 불필요.
// staging DB나 실 세션 없이도 CI에서 항상 돈다(§자기개선 루프 — 재현 시나리오를 소스 계약 스펙으로 박제).

test.describe('회원 상태 전이 매트릭스 (isAllowedMemberStatusTransition)', () => {
  test('pending -> active/rejected 허용', () => {
    expect(isAllowedMemberStatusTransition('pending', 'active')).toBe(true);
    expect(isAllowedMemberStatusTransition('pending', 'rejected')).toBe(true);
  });

  test('active -> inactive(정지) 허용', () => {
    expect(isAllowedMemberStatusTransition('active', 'inactive')).toBe(true);
  });

  test('inactive -> active(재활성) 허용', () => {
    expect(isAllowedMemberStatusTransition('inactive', 'active')).toBe(true);
  });

  test('pending -> inactive 는 차단(승인 전 정지 전이는 없음)', () => {
    expect(isAllowedMemberStatusTransition('pending', 'inactive')).toBe(false);
  });

  test('active -> rejected 는 차단(이미 활성인 회원을 반려로 되돌릴 수 없음)', () => {
    expect(isAllowedMemberStatusTransition('active', 'rejected')).toBe(false);
  });

  test('rejected 는 어떤 목표로도 전이 불가(관리자가 반려를 뒤집는 경로 없음)', () => {
    expect(isAllowedMemberStatusTransition('rejected', 'active')).toBe(false);
    expect(isAllowedMemberStatusTransition('rejected', 'pending')).toBe(false);
    expect(allowedMemberStatusTargets('rejected')).toEqual([]);
  });

  test('withdrawn 은 어떤 목표로도 전이 불가(관리자가 탈퇴를 되살리는 경로 없음)', () => {
    expect(isAllowedMemberStatusTransition('withdrawn', 'active')).toBe(false);
    expect(isAllowedMemberStatusTransition('withdrawn', 'inactive')).toBe(false);
    expect(allowedMemberStatusTargets('withdrawn')).toEqual([]);
  });

  test('active -> active(무변경) 은 차단 — 자기 자신으로의 전이는 표에 없다', () => {
    expect(isAllowedMemberStatusTransition('active', 'active')).toBe(false);
  });

  test('허용 목표 배열이 매트릭스와 정확히 일치한다', () => {
    expect(allowedMemberStatusTargets('pending')).toEqual(['active', 'rejected']);
    expect(allowedMemberStatusTargets('active')).toEqual(['inactive']);
    expect(allowedMemberStatusTargets('inactive')).toEqual(['active']);
  });
});

test.describe('탈퇴 시 PII 익명화 패치 (buildWithdrawalPatch)', () => {
  test('status를 withdrawn으로 바꾼다', () => {
    const patch = buildWithdrawalPatch('member-1');
    expect(patch.status).toBe('withdrawn');
  });

  test('이름·연락처·프로필사진·가입폼 데이터를 익명화/삭제한다', () => {
    const patch = buildWithdrawalPatch('member-1');
    expect(patch.name).toBe('(탈퇴회원)');
    expect(patch.phone).toBe('');
    expect(patch.profile_image).toBeNull();
    expect(patch.signup_data).toEqual({});
  });

  test('이메일은 회원 id를 박은 재사용 불가능한 고정 문자열로 치환한다(unique 제약 회피)', () => {
    const patch = buildWithdrawalPatch('abc-123');
    expect(patch.email).toBe('withdrawn-abc-123@deleted.baekjo');
  });

  test('서로 다른 회원 id는 서로 다른 익명 이메일을 만든다(재가입 시 unique 충돌 없음)', () => {
    const a = buildWithdrawalPatch('member-a');
    const b = buildWithdrawalPatch('member-b');
    expect(a.email).not.toBe(b.email);
  });

  test('주문 이력(orders) 관련 필드는 패치에 포함하지 않는다(소프트 탈퇴 — 거래기록 보존)', () => {
    const patch = buildWithdrawalPatch('member-1');
    expect(Object.keys(patch)).toEqual(['status', 'name', 'phone', 'email', 'profile_image', 'signup_data']);
  });
});

test.describe('withdrawn 회원 로그인 거부 (소스 계약)', () => {
  const authSource = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'src', 'lib', 'auth.ts'),
    'utf8',
  );

  test("credentials authorize()가 status !== 'active' 를 명시적으로 차단한다", () => {
    // active만 화이트리스트로 통과시키는 방식이라 withdrawn/inactive/pending/rejected 전부
    // 이 한 줄로 차단된다 — withdrawn을 추가할 때 새 분기를 만들 필요가 없다.
    expect(authSource).toContain("member.status !== 'active'");
  });

  test('DUMMY_PASSWORD_HASH 타이밍 오라클 방어가 여전히 존재한다(§10-7 보안장치 — 손대지 않음 확인)', () => {
    expect(authSource).toContain('DUMMY_PASSWORD_HASH');
  });

  test('소셜 로그인은 여전히 role을 항상 user로 고정한다(§10-7 보안장치 — 손대지 않음 확인)', () => {
    expect(authSource).toContain("token.role = 'user'");
  });
});

test.describe('세션 실효 헬퍼(requireActiveMember) 소스 계약', () => {
  const helperSource = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'src', 'lib', 'members', 'requireActiveMember.ts'),
    'utf8',
  );

  test('DB 재조회 후 active 상태만 통과시킨다', () => {
    expect(helperSource).toContain('findMemberById');
    expect(helperSource).toContain("member.status !== 'active'");
  });

  test('세션 자체가 없으면 401, 있지만 비활성이면 403을 반환한다', () => {
    expect(helperSource).toContain('401');
    expect(helperSource).toContain('403');
  });
});
