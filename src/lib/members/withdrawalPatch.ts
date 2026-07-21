// 회원 탈퇴(소프트 탈퇴) 시 적용할 PII 익명화 patch — 순수 함수로 뽑아 members/repo.ts
// withdrawMember()가 이 결과를 그대로 update()에 넘긴다. DB 없이 회귀 테스트가 가능하도록
// 분리했다(§자기개선 루프 — 재현 시나리오를 소스 계약 스펙으로 박제).
//
// 이메일은 unique 제약이 있으므로 회원 id를 박은 고정 문자열로 치환해 재사용 불가능하게 만든다.
// 주문 이력(orders 테이블)은 여기서 건드리지 않는다 — 전자상거래법 등 거래기록 보존 의무 때문에
// 소프트 탈퇴로만 처리하고 삭제하지 않는다.
export interface MemberWithdrawalPatch {
  status: 'withdrawn';
  name: string;
  phone: string;
  email: string;
  profile_image: null;
  signup_data: Record<string, never>;
}

export function buildWithdrawalPatch(memberId: string): MemberWithdrawalPatch {
  return {
    status: 'withdrawn',
    name: '(탈퇴회원)',
    phone: '',
    email: `withdrawn-${memberId}@deleted.baekjo`,
    profile_image: null,
    signup_data: {},
  };
}
