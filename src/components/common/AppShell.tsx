'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import FocusHeader from './FocusHeader';

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
    return <main className="min-h-dvh">{children}</main>;
  }

  if (isFocusedFlow) {
    return (
      <>
        <FocusHeader />
        <main className="public-main min-w-0 flex-1 overflow-x-clip">{children}</main>
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="public-main min-w-0 flex-1 overflow-x-clip pb-20 md:pb-0">{children}</main>
      <Footer />
      <MobileBottomNav />
    </>
  );
}
