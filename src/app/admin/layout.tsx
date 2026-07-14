import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import AdminShell from '@/components/admin-new/layout/AdminShell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login?error=admin');
  }

  if (session.user.role !== 'admin') {
    redirect('/');
  }

  return (
    <AdminShell user={{ name: session.user.name, role: session.user.role }}>
      {children}
    </AdminShell>
  );
}
