// 회원 상태 전이 규칙(순수 함수) — api/admin/members/[id]/route.ts와
// components/admin-new/members/MemberRoleStatusPanel.tsx가 같은 표를 참조해 서버·UI가
// 어긋나지 않게 한다(서버가 최종 검증하지만, UI가 허용 안 되는 선택지를 보여주면 클릭 후에야
// 409로 알게 되어 사용자 경험이 나쁘다).
//
// 'withdrawn'은 회원 본인만(members/me DELETE → withdrawMember) 진입 가능한 상태라
// 관리자 전환 대상이 아니다 — 여기 표에 없으므로 어떤 현재 상태에서도 목표가 될 수 없다.
// 'rejected'에서의 재승인도 의도적으로 막는다(반려 결정을 관리자가 되돌리는 것은 이 흐름의
// 책임 밖 — 필요하면 회원이 재가입한다).
export type MemberStatus = 'active' | 'inactive' | 'pending' | 'rejected' | 'withdrawn';
export type AdminSettableMemberStatus = 'active' | 'inactive' | 'rejected';

export const MEMBER_STATUS_TRANSITIONS: Record<string, readonly AdminSettableMemberStatus[]> = {
  pending: ['active', 'rejected'],
  active: ['inactive'],
  inactive: ['active'],
};

/** target이 status(현재)에서 관리자가 전환 가능한 목표인지. admin 계정 자체 여부는 호출부(§관리자
 *  자기잠금 방지)가 별도로 막으므로 여기서는 다루지 않는다 — 순수하게 상태 전이 표만 본다. */
export function isAllowedMemberStatusTransition(
  currentStatus: string,
  targetStatus: string,
): boolean {
  const allowed = MEMBER_STATUS_TRANSITIONS[currentStatus] ?? [];
  return (allowed as readonly string[]).includes(targetStatus);
}

export function allowedMemberStatusTargets(
  currentStatus: string,
): readonly AdminSettableMemberStatus[] {
  return MEMBER_STATUS_TRANSITIONS[currentStatus] ?? [];
}
