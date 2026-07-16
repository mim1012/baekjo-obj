import OrderDetailPage from '@/components/admin-new/orders/OrderDetailPage';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderPage({ params }: PageProps) {
  const { id } = await params;
  return <OrderDetailPage id={id} />;
}
