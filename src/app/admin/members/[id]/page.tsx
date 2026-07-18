import MemberDetailPage from '@/components/admin-new/members/MemberDetailPage';

// Next 16 부터 동적 라우트의 params 는 Promise 다 — await 없이 동기 접근하면 런타임 에러
// ("params is a Promise and must be unwrapped") 가 나서 id 가 항상 undefined 로 떨어지고,
// MemberDetailPage 는 매 회원마다 '회원 정보를 찾을 수 없습니다'만 렌더했다(생성 이래 미동작,
// 2026-07-18 wave-3 e2e 작업 중 발견). products/[id] 와 동일한 패턴으로 맞춘다.
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function MemberPage({ params }: PageProps) {
  const { id } = await params;
  return <MemberDetailPage id={id} />;
}
