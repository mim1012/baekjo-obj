'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import FocusHeader from './FocusHeader';
import { SiteBrandingContext } from './BrandMark';
import type { SiteShellContent } from '@/lib/cms/source/siteShell';

function ShellContent({
  children,
  siteShell = null,
}: {
  children: React.ReactNode;
  siteShell?: SiteShellContent | null;
}) {
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
        <main className="public-main min-w-0 flex-1">{children}</main>
      </>
    );
  }

  const isHome = pathname === '/';

  return (
    <>
      <Header siteShell={siteShell} />
      <main className="public-main min-w-0 flex-1 overflow-x-clip pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
      <Footer variant={isHome ? 'home' : 'default'} siteShell={siteShell} />
      {/* MobileBottomNav의 5개 탭(홈/케어/쇼핑/보험/마이)은 site-shell CMS 정의에 없는 아이콘형
          앱 내비게이션 chrome이다 — 펫보험 탭은 이미 FEATURES.insurance로만 게이팅되고(D6과
          동일 원칙), 편집 가능한 CMS 문구가 없으므로 siteShell을 전달하지 않는다. */}
      <MobileBottomNav />
    </>
  );
}

export default function AppShell(props: { children: React.ReactNode; siteShell?: SiteShellContent | null }) {
  return (
    <SiteBrandingContext.Provider value={props.siteShell?.branding ?? null}>
      <ShellContent {...props} />
    </SiteBrandingContext.Provider>
  );
}
