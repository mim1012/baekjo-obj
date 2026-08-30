import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import PartnerOrdersClient from '@/components/partner/PartnerOrdersClient';

export default async function PartnerOrdersPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const role = String(session.user.role);
  if (role !== 'partner' && role !== 'admin') redirect('/');
  return <PartnerOrdersClient />;
}
