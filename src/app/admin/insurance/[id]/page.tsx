import InsuranceDetailPage from '@/components/admin-new/insurance/InsuranceDetailPage';

// Next 16 부터 동적 라우트의 params 는 Promise 다 — await 없이 동기 접근하면 런타임 에러
// ("params is a Promise and must be unwrapped") 가 나서 id 가 항상 undefined 로 떨어진다
// (동일 클래스 버그, admin/members/[id] 와 함께 2026-07-18 wave-3 e2e 전수 점검 중 발견).
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InsurancePage({ params }: PageProps) {
  const { id } = await params;
  return <InsuranceDetailPage id={id} />;
}
