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
    expect(Object.keys(patch)).toEqual([
      'status',
      'name',
      'phone',
      'email',
      'profile_image',
      'signup_data',
      'password_hash',
      'provider_id',
      'company_name',
      'business_number',
    ]);
  });

  // §HIGH-2(opus 리뷰) — 탈퇴 후에도 남아있던 PII 잔존 필드 4종.
  test('password_hash를 null화한다(가입 안 된 소셜 계정과 동일 상태)', () => {
    expect(buildWithdrawalPatch('member-1').password_hash).toBeNull();
  });

  test('provider_id를 null화한다(§CRITICAL-1 — 카카오/네이버 재로그인이 이 행을 다시 못 찾게 함)', () => {
    expect(buildWithdrawalPatch('member-1').provider_id).toBeNull();
    // provider 컬럼 자체는 patch에 없어야 한다 — members.provider는 NOT NULL 제약이라 null화 불가.
    expect('provider' in buildWithdrawalPatch('member-1')).toBe(false);
  });

  test('b2b 전용 컬럼(company_name·business_number)을 null화한다(signup_data={}만으로는 안 지워짐)', () => {
    const patch = buildWithdrawalPatch('member-1');
    expect(patch.company_name).toBeNull();
    expect(patch.business_number).toBeNull();
  });
});

test.describe('탈퇴 시 member_tokens 정리 (소스 계약)', () => {
  const repoSource = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'src', 'lib', 'members', 'repo.ts'),
    'utf8',
  );

  test('withdrawMember가 member_tokens 테이블에서 해당 회원 행을 삭제한다(0002_email_tokens.sql)', () => {
    const fnStart = repoSource.indexOf('export async function withdrawMember(');
    expect(fnStart).toBeGreaterThanOrEqual(0);
    const fn = repoSource.slice(fnStart, repoSource.indexOf('\n}', fnStart));
    expect(fn).toContain("from('member_tokens')");
    expect(fn).toContain('.delete()');
    expect(fn).toContain(".eq('member_id', id)");
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

test.describe('소셜(카카오/네이버) 재로그인 거부 (§CRITICAL-1 — opus 리뷰)', () => {
  const authSource = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'src', 'lib', 'auth.ts'),
    'utf8',
  );

  test('signIn 콜백이 소셜 provider 분기를 갖고 upsertSocialMember 결과의 status를 검사한다', () => {
    const fnStart = authSource.indexOf('async signIn(');
    expect(fnStart).toBeGreaterThanOrEqual(0);
    const fnEnd = authSource.indexOf('async jwt(');
    expect(fnEnd).toBeGreaterThan(fnStart);
    const fn = authSource.slice(fnStart, fnEnd);

    expect(fn).toContain("account?.provider === 'kakao' || account?.provider === 'naver'");
    expect(fn).toContain('await upsertSocialMember(');
    expect(fn).toContain("if (member.status !== 'active') return false;");
  });

  test('signIn 체크가 jwt 콜백보다 먼저 나온다(세션이 발급되기 전에 거부해야 한다)', () => {
    const signInIndex = authSource.indexOf('async signIn(');
    const jwtIndex = authSource.indexOf('async jwt(');
    expect(signInIndex).toBeGreaterThanOrEqual(0);
    expect(jwtIndex).toBeGreaterThan(signInIndex);
  });
});

test.describe('upsertSocialMember 익명화 되돌리기 차단 (소스 계약)', () => {
  const repoSource = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'src', 'lib', 'members', 'repo.ts'),
    'utf8',
  );

  test('기존 provider_id로 찾은 회원의 status가 active가 아니면 name/profile_image를 갱신하지 않는다', () => {
    const fnStart = repoSource.indexOf('export async function upsertSocialMember(');
    expect(fnStart).toBeGreaterThanOrEqual(0);
    const fnEnd = repoSource.indexOf('\nexport interface UpdateMemberProfileInput', fnStart);
    const fn = repoSource.slice(fnStart, fnEnd > 0 ? fnEnd : undefined);

    const guardIndex = fn.indexOf("existingByProvider.status !== 'active'");
    const updateIndex = fn.indexOf(".update({ name: nextName, profile_image: nextImage })");
    expect(guardIndex).toBeGreaterThanOrEqual(0);
    expect(updateIndex).toBeGreaterThan(guardIndex);
    // 가드 분기가 이름/이미지 갱신 UPDATE보다 먼저 return 해야 되돌리기가 막힌다.
    expect(fn.slice(guardIndex, updateIndex)).toContain('return existingByProvider;');
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
