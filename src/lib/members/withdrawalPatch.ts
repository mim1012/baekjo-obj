// 회원 탈퇴(소프트 탈퇴) 시 적용할 PII 익명화 patch — 순수 함수로 뽑아 members/repo.ts
// withdrawMember()가 이 결과를 그대로 update()에 넘긴다. DB 없이 회귀 테스트가 가능하도록
// 분리했다(§자기개선 루프 — 재현 시나리오를 소스 계약 스펙으로 박제).
//
// 이메일은 unique 제약이 있으므로 회원 id를 박은 고정 문자열로 치환해 재사용 불가능하게 만든다.
// 주문 이력(orders 테이블)은 여기서 건드리지 않는다 — 전자상거래법 등 거래기록 보존 의무 때문에
// 소프트 탈퇴로만 처리하고 삭제하지 않는다.
//
// provider는 members 테이블에서 NOT NULL(0001_members.sql)이라 null화할 수 없다 — 대신
// provider_id를 null화해 (provider, provider_id) 부분 유니크 인덱스(provider_id is not null)에서
// 이 행을 빼낸다. 그래야 같은 카카오/네이버 계정으로 재로그인해도 upsertSocialMember의
// findMemberByProvider가 이 탈퇴 행을 다시 찾지 못하고(= 익명화를 되돌릴 경로가 없고) 새 행을
// 만든다(§CRITICAL-1 재발 방지 — opus 리뷰).
// password_hash도 null화(가입 안 된 소셜 계정과 동일 상태로) + b2b 전용 컬럼(company_name·
// business_number)도 별도 컬럼이라 signup_data({}) 만으로는 안 지워지므로 함께 null화한다.
export interface MemberWithdrawalPatch {
  status: 'withdrawn';
  name: string;
  phone: string;
  email: string;
  profile_image: null;
  signup_data: Record<string, never>;
  password_hash: null;
  provider_id: null;
  company_name: null;
  business_number: null;
}

export function buildWithdrawalPatch(memberId: string): MemberWithdrawalPatch {
  return {
    status: 'withdrawn',
    name: '(탈퇴회원)',
    phone: '',
    email: `withdrawn-${memberId}@deleted.baekjo`,
    profile_image: null,
    signup_data: {},
    password_hash: null,
    provider_id: null,
    company_name: null,
    business_number: null,
  };
}
