import OrderDetailPage from '@/components/admin-new/orders/OrderDetailPage';

interface PageProps {
  params: {
    id: string;
  };
}

export default function OrderPage({ params }: PageProps) {
  return <OrderDetailPage id={params.id} />;
}
