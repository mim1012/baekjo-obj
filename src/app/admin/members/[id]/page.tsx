import MemberDetailPage from '@/components/admin-new/members/MemberDetailPage';

interface PageProps {
  params: {
    id: string;
  };
}

export default function MemberPage({ params }: PageProps) {
  return <MemberDetailPage id={params.id} />;
}
