'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import FocusHeader from './FocusHeader';
import { PublicSiteContentProvider } from '@/components/providers/PublicSiteContentProvider';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');
  const isFocusedFlow = [
    '/checkout',
    '/order-complete',
    '/diagnosis',
    '/insurance/apply',
    '/insurance/recommend',
    '/insurance/complete',
    '/login',
    '/signup',
  ].some((path) => pathname.startsWith(path));

  if (isAdmin) {
    return (
      <PublicSiteContentProvider>
        <main className="min-h-dvh">{children}</main>
      </PublicSiteContentProvider>
    );
  }

  if (isFocusedFlow) {
    return (
      <PublicSiteContentProvider>
        <FocusHeader />
        <main className="public-main min-w-0 flex-1 overflow-x-clip pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
      </PublicSiteContentProvider>
    );
  }

  const isHome = pathname === '/';

  return (
    <PublicSiteContentProvider>
      <Header />
      <main className="public-main min-w-0 flex-1 overflow-x-clip pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
      <Footer variant={isHome ? 'home' : 'default'} />
      <MobileBottomNav />
    </PublicSiteContentProvider>
  );
}
