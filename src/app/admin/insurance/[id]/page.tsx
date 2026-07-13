import InsuranceDetailPage from '@/components/admin-new/insurance/InsuranceDetailPage';

interface PageProps {
  params: {
    id: string;
  };
}

export default function InsurancePage({ params }: PageProps) {
  return <InsuranceDetailPage id={params.id} />;
}
