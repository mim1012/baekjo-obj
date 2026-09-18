import type { MemberRecord } from '@/lib/members/repo';

/**
 * JWT에 실린 세션 버전이 DB의 현재 값과 일치하는지 검사한다.
 * 비밀번호 변경·role 변경·정지/탈퇴/반려로의 상태 전이(0172 트리거, bump_member_session_version)가
 * 일어나면 members.session_version이 올라가고, 그 순간부터 이전 버전을 담은 JWT는 모두 무효가 된다.
 *
 * - member가 없으면(탈퇴·삭제 등) 무효.
 * - status가 'active'가 아니면 무효 — 정지·반려 회원의 기존 세션도 즉시 차단한다.
 * - version이 안전 정수가 아니면(마이그레이션 이전 발급된 sessionVersion 필드 없는 구버전 JWT 등) 무효.
 * - 마지막으로 값이 정확히 일치해야 유효.
 */
export function isCurrentSession(
  version: unknown,
  member: Pick<MemberRecord, 'status' | 'sessionVersion'> | null,
): boolean {
  return Boolean(
    member
    && member.status === 'active'
    && Number.isSafeInteger(version)
    && version === member.sessionVersion,
  );
}
