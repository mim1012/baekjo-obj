'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  Star,
  Users,
  ClipboardCheck,
  Activity,
  Gift,
  HeartHandshake,
  Settings,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import BrandMark from '@/components/common/BrandMark';
import { logout } from '@/lib/storage';

const adminLinks = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/members', label: '회원 관리', icon: Users },
  { href: '/admin/products', label: '상품 관리', icon: Package },
  { href: '/admin/brands', label: '브랜드 관리', icon: BadgeCheck },
  { href: '/admin/concerns', label: '고민 관리', icon: HeartPulse },
  { href: '/admin/orders', label: '주문 관리', icon: ShoppingCart },
  { href: '/admin/insurance', label: '보험 분석 관리', icon: ShieldCheck },
  { href: '/admin/reviews', label: '후기 관리', icon: Star },
  { href: '/admin/qna', label: 'Q&A 관리', icon: MessageCircle },
  { href: '/admin/notices', label: '공지사항 관리', icon: Megaphone },
  { href: '/admin/survey', label: '맞춤 진단 관리', icon: ClipboardCheck },
  { href: '/admin/survey-results', label: '진단 참여 내역', icon: Activity },
  { href: '/admin/kits', label: '케어 키트 관리', icon: Gift },
  { href: '/admin/partners', label: 'B2B 제휴 관리', icon: HeartHandshake },
  { href: '/admin/settings', label: '환경설정', icon: Settings },
];

/** 드로어 안에서 Tab 포커스 트랩 대상이 되는 포커스 가능 요소를 모두 반환한다. */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export default function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const closeNav = () => setIsNavOpen(false);

  // 드로어 오픈 시 닫기 버튼으로 포커스 이동, 닫힐 때 햄버거 버튼으로 포커스 복원.
  // ref로만 DOM을 다루므로 effect 내 setState 없음.
  useEffect(() => {
    if (!isNavOpen) return;
    closeButtonRef.current?.focus();
    const hamburgerButton = hamburgerButtonRef.current;
    return () => {
      hamburgerButton?.focus();
    };
  }, [isNavOpen]);

  // Esc 닫기 + Tab/Shift+Tab 포커스 트랩 + 오픈 중 배경 스크롤 잠금.
  useEffect(() => {
    if (!isNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeNav();
        return;
      }
      if (e.key !== 'Tab' || !drawerRef.current) return;
      const focusable = getFocusableElements(drawerRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isNavOpen]);

  const renderNavLinks = (onNavigate: () => void) =>
    adminLinks.map((item) => {
      const Icon = item.icon;
      const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={`flex items-center gap-3 border-l px-3 py-2.5 text-xs ${
            active
              ? 'border-[#D8DED9] bg-white/10 text-white'
              : 'border-transparent text-[#B7C0B8] hover:border-[#89958B] hover:text-white'
          }`}
        >
          <Icon className="size-4" />
          {item.label}
        </Link>
      );
    });

  return (
    <div className="flex min-h-dvh flex-col bg-[#EAE8E1] md:flex-row">
      {/* 모바일 상단 슬림 바: 로고 + 햄버거 (md 이상에서는 숨김) */}
      <div className="flex items-center justify-between border-b border-[#465148] bg-[#29332C] px-5 py-4 text-white md:hidden">
        <Link href="/admin" aria-label="백조오브제 관리자 홈" className="text-white">
          <BrandMark inverse />
        </Link>
        <button
          ref={hamburgerButtonRef}
          type="button"
          onClick={() => setIsNavOpen(true)}
          aria-label="관리자 메뉴 열기"
          aria-expanded={isNavOpen}
          className="flex size-10 items-center justify-center border border-[#465148] text-white"
        >
          <Menu className="size-5" />
        </button>
      </div>

      {/* 모바일 드로어: 햄버거로 열림, 오버레이 클릭/링크 클릭/Esc로 닫힘 */}
      {isNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={closeNav} aria-hidden="true" />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="관리자 메뉴"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto border-r border-[#465148] bg-[#29332C] text-white"
          >
            <div className="flex items-center justify-between border-b border-[#465148] p-6 shrink-0">
              <Link href="/admin" aria-label="백조오브제 관리자 홈" className="text-white" onClick={closeNav}>
                <BrandMark inverse />
              </Link>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeNav}
                aria-label="관리자 메뉴 닫기"
                className="flex size-9 items-center justify-center text-[#B7C0B8] hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav aria-label="관리자 메뉴" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4 custom-scrollbar">
              {renderNavLinks(closeNav)}
            </nav>

            <div className="px-6 pb-6 pt-4 border-t border-[#465148] shrink-0">
              <Link href="/" onClick={closeNav} className="inline-flex items-center gap-2 text-xs text-[#9EA8A0] hover:text-white">
                <ArrowLeft className="size-3.5" />
                스토어로 돌아가기
              </Link>
            </div>
          </aside>
        </div>
      )}

      {/* 데스크톱 고정 사이드바 (md 미만에서는 숨김) */}
      <aside className="hidden shrink-0 border-r border-[#465148] bg-[#29332C] text-white md:flex md:w-64 md:h-screen md:sticky md:top-0 md:flex-col">
        <div className="border-b border-[#465148] p-6 shrink-0">
          <Link href="/admin" aria-label="백조오브제 관리자 홈" className="text-white">
            <BrandMark inverse />
          </Link>
          <p className="mt-4 text-[10px] uppercase text-[#89958B]">Administration</p>
        </div>

        <nav aria-label="관리자 메뉴" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4 custom-scrollbar">
          {renderNavLinks(() => {})}
        </nav>

        <div className="px-6 pb-6 pt-4 border-t border-[#465148] shrink-0 mt-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-xs text-[#9EA8A0] hover:text-white">
            <ArrowLeft className="size-3.5" />
            스토어로 돌아가기
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex min-h-16 items-center justify-between gap-5 border-b border-[#D1D0C8] bg-[#F6F4EE] px-5 sm:px-8">
          <div className="relative hidden w-full max-w-md md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B928C]" />
            <input aria-label="관리자 통합 검색" placeholder="회원, 주문, 상품 통합 검색" className="w-full border border-[#D1D0C8] bg-white py-2.5 pl-10 pr-4 text-sm" />
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-semibold text-[#303731]">관리자</p>
              <p className="text-[10px] text-[#8B928C]">Mock Console</p>
            </div>
            <button type="button" onClick={handleLogout} aria-label="로그아웃" className="flex size-10 items-center justify-center border border-[#D1D0C8] bg-white text-[#59615B]">
              <LogOut className="size-4" />
            </button>
          </div>
        </header>
        <main className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
