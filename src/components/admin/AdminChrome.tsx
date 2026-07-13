'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  BadgeCheck,
  ChevronRight,
  ClipboardCheck,
  Command,
  Gift,
  HeartHandshake,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  Package,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Users,
  X,
} from 'lucide-react';
import BrandMark from '@/components/common/BrandMark';
import { logout } from '@/lib/storage';

interface AdminNavItem {
  href: string;
  label: string;
  description: string;
  icon: typeof LayoutDashboard;
  keywords?: string;
}

interface AdminNavGroup {
  label: string;
  number: string;
  items: AdminNavItem[];
}

const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: '개요',
    number: '01',
    items: [
      { href: '/admin', label: '운영 대시보드', description: '오늘의 핵심 현황과 처리할 일', icon: LayoutDashboard, keywords: '홈 현황 요약' },
    ],
  },
  {
    label: '커머스',
    number: '02',
    items: [
      { href: '/admin/orders', label: '주문', description: '결제·배송·취소 처리', icon: ShoppingCart },
      { href: '/admin/products', label: '상품', description: '상품 정보와 판매 상태', icon: Package },
      { href: '/admin/brands', label: '브랜드', description: '입점 브랜드와 소속 상품', icon: BadgeCheck },
    ],
  },
  {
    label: '고객 케어',
    number: '03',
    items: [
      { href: '/admin/members', label: '회원·승인', description: '회원과 업체 가입 승인', icon: Users, keywords: '고객 파트너 보험사 b2b' },
      { href: '/admin/insurance', label: '보험 분석', description: '펫보험 분석 신청 검토', icon: ShieldCheck },
      { href: '/admin/qna', label: '문의', description: '고객 질문과 답변', icon: MessageCircle, keywords: 'qna 상담' },
      { href: '/admin/reviews', label: '후기', description: '구매 후기와 노출 관리', icon: Star },
    ],
  },
  {
    label: '큐레이션',
    number: '04',
    items: [
      { href: '/admin/concerns', label: '고민 카테고리', description: '반려생활 고민 분류', icon: HeartPulse },
      { href: '/admin/survey', label: '맞춤 진단', description: '질문과 추천 규칙', icon: ClipboardCheck },
      { href: '/admin/survey-results', label: '진단 참여 내역', description: '고객 진단 결과 확인', icon: Activity },
    ],
  },
  {
    label: '파트너십·콘텐츠',
    number: '05',
    items: [
      { href: '/admin/kits', label: '케어 키트', description: 'B2B 키트 구성과 신청', icon: Gift },
      { href: '/admin/partners', label: '제휴', description: '파트너 제안과 진행 상태', icon: HeartHandshake },
      { href: '/admin/notices', label: '공지사항', description: '고객 공지와 노출 관리', icon: Megaphone },
    ],
  },
  {
    label: '시스템',
    number: '06',
    items: [
      { href: '/admin/settings', label: '사이트 설정', description: '메인 콘텐츠와 운영 설정', icon: Settings, keywords: 'cms 환경설정' },
    ],
  },
];

const ADMIN_NAV_ITEMS = ADMIN_NAV_GROUPS.flatMap((group) =>
  group.items.map((item) => ({ ...item, group: group.label })),
);

function isActivePath(pathname: string, href: string) {
  return href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export default function AdminChrome({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: { name?: string | null; role?: string };
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const currentItem = ADMIN_NAV_ITEMS.find((item) => isActivePath(pathname, item.href)) ?? ADMIN_NAV_ITEMS[0];
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('ko-KR');
    if (!query) return ADMIN_NAV_ITEMS.slice(0, 6);
    return ADMIN_NAV_ITEMS.filter((item) =>
      `${item.label} ${item.description} ${item.group} ${item.keywords ?? ''}`.toLocaleLowerCase('ko-KR').includes(query),
    );
  }, [searchQuery]);

  const closeNav = () => setIsNavOpen(false);
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const moveTo = (href: string) => {
    setSearchQuery('');
    setIsSearchOpen(false);
    router.push(href);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        searchInputRef.current?.focus();
        setIsSearchOpen(true);
      }
      if (event.key === 'Escape') setIsSearchOpen(false);
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) setIsSearchOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    if (!isNavOpen) return;
    closeButtonRef.current?.focus();
    const hamburgerButton = hamburgerButtonRef.current;
    return () => hamburgerButton?.focus();
  }, [isNavOpen]);

  useEffect(() => {
    if (!isNavOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeNav();
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = getFocusableElements(drawerRef.current);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isNavOpen]);

  const renderNavigation = (onNavigate: () => void) => (
    <nav aria-label="관리자 메뉴" className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6">
      {ADMIN_NAV_GROUPS.map((group) => (
        <section key={group.label} aria-labelledby={`admin-nav-${group.number}`}>
          <div className="mb-2 flex items-center gap-2 px-3 text-[10px] font-semibold tracking-[0.16em] text-[#879189]">
            <span className="font-editorial text-[#D8C4A3]">{group.number}</span>
            <h2 id={`admin-nav-${group.number}`}>{group.label}</h2>
          </div>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-300 ${
                    active ? 'bg-white/10 text-white' : 'text-[#B7C0B8] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className={`absolute inset-y-2 left-0 w-0.5 ${active ? 'bg-[#D8C4A3]' : 'bg-transparent'}`} />
                  <Icon className={`size-4 ${active ? 'text-[#D8C4A3]' : 'text-[#89958B] group-hover:text-[#D8C4A3]'}`} strokeWidth={1.7} />
                  <span>{item.label}</span>
                  {active && <ChevronRight className="ml-auto size-3.5 text-[#D8C4A3]" />}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );

  const sidebarFooter = (onNavigate: () => void) => (
    <div className="border-t border-white/10 p-4">
      <div className="mb-3 flex items-center gap-3 px-2 py-2">
        <span className="flex size-9 items-center justify-center border border-white/10 bg-white/5 font-editorial text-sm text-[#D8C4A3]">
          {(user?.name || '관').slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">{user?.name || '최고관리자'}</p>
          <p className="mt-0.5 text-[10px] text-[#89958B]">SUPER ADMIN</p>
        </div>
        <button type="button" onClick={handleLogout} aria-label="로그아웃" className="flex size-9 items-center justify-center text-[#89958B] transition-colors hover:bg-white/5 hover:text-white">
          <LogOut className="size-4" />
        </button>
      </div>
      <Link href="/" onClick={onNavigate} className="flex items-center gap-2 px-2 py-2 text-xs text-[#9EA8A0] transition-colors hover:text-white">
        <ArrowLeft className="size-3.5" />
        스토어 보기
      </Link>
    </div>
  );

  return (
    <div className="admin-console flex min-h-dvh bg-[#F4F2EC] text-[#17211D]">
      {isNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" onClick={closeNav} className="absolute inset-0 cursor-default bg-[#17211D]/50 backdrop-blur-sm" aria-label="관리자 메뉴 닫기" />
          <aside ref={drawerRef} role="dialog" aria-modal="true" aria-label="관리자 메뉴" className="absolute inset-y-0 left-0 flex w-80 max-w-[88vw] flex-col bg-[#202521] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <Link href="/admin" aria-label="백조오브제 관리자 홈" onClick={closeNav}><BrandMark inverse /></Link>
              <button ref={closeButtonRef} type="button" onClick={closeNav} aria-label="관리자 메뉴 닫기" className="flex size-10 items-center justify-center text-[#B7C0B8] hover:bg-white/5 hover:text-white"><X className="size-5" /></button>
            </div>
            {renderNavigation(closeNav)}
            {sidebarFooter(closeNav)}
          </aside>
        </div>
      )}

      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col bg-[#202521] text-white lg:flex">
        <div className="border-b border-white/10 px-7 py-7">
          <Link href="/admin" aria-label="백조오브제 관리자 홈"><BrandMark inverse /></Link>
          <div className="mt-5 flex items-center gap-2 text-[10px] tracking-[0.14em] text-[#89958B]">
            <span className="size-1.5 rounded-full bg-[#D8C4A3]" />
            OPERATIONS DESK
          </div>
        </div>
        {renderNavigation(() => {})}
        {sidebarFooter(() => {})}
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[#E7E0D5] bg-[#FBFAF7]/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <button ref={hamburgerButtonRef} type="button" onClick={() => setIsNavOpen(true)} aria-label="관리자 메뉴 열기" aria-expanded={isNavOpen} className="flex size-10 items-center justify-center border border-[#E7E0D5] bg-white text-[#17211D] lg:hidden"><Menu className="size-5" /></button>
          <div className="hidden min-w-44 md:block">
            <p className="text-[10px] font-semibold tracking-[0.14em] text-[#A8742E]">{currentItem.group}</p>
            <p className="mt-0.5 text-sm font-semibold text-[#17211D]">{currentItem.label}</p>
          </div>

          <div ref={searchBoxRef} className="relative ml-auto w-full max-w-xl md:ml-4">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8B928C]" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={(event) => { setSearchQuery(event.target.value); setIsSearchOpen(true); }}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && searchResults[0]) moveTo(searchResults[0].href);
              }}
              aria-label="관리 메뉴 검색"
              role="combobox"
              aria-expanded={isSearchOpen}
              aria-controls="admin-menu-search-results"
              placeholder="관리 메뉴 검색"
              className="h-10 w-full border border-[#E7E0D5] bg-white pl-10 pr-12 text-sm text-[#17211D] placeholder:text-[#9AA09A] focus:border-[#A8742E] focus:outline-none"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 border border-[#E7E0D5] bg-[#FAF8F3] px-1.5 py-0.5 text-[10px] text-[#7B827C] sm:flex"><Command className="size-3" />/</span>
            {isSearchOpen && (
              <div className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden border border-[#E7E0D5] bg-white shadow-[0_24px_60px_-20px_rgba(23,33,29,0.28)]">
                <div className="border-b border-[#E7E0D5] px-4 py-3 text-[10px] font-semibold tracking-[0.14em] text-[#8B928C]">빠른 이동</div>
                <div id="admin-menu-search-results" role="listbox" className="max-h-80 overflow-y-auto p-2">
                  {searchResults.length > 0 ? searchResults.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.href} type="button" role="option" aria-selected={isActivePath(pathname, item.href)} onClick={() => moveTo(item.href)} className="group flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-[#F3EEE6]">
                        <span className="flex size-9 items-center justify-center border border-[#E7E0D5] bg-[#FAF8F3] text-[#A8742E]"><Icon className="size-4" /></span>
                        <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-[#17211D]">{item.label}</span><span className="mt-0.5 block truncate text-xs text-[#6F766F]">{item.description}</span></span>
                        <span className="text-[10px] text-[#9AA09A]">{item.group}</span>
                      </button>
                    );
                  }) : <p className="px-4 py-10 text-center text-sm text-[#6F766F]">일치하는 관리 메뉴가 없습니다.</p>}
                </div>
              </div>
            )}
          </div>

          <div className="hidden items-center gap-2 border-l border-[#E7E0D5] pl-4 xl:flex">
            <span className="size-1.5 rounded-full bg-[#6F8A75]" />
            <span className="whitespace-nowrap text-xs text-[#6F766F]">운영 정상</span>
          </div>
        </header>

        <main className="bg-noise relative min-h-[calc(100dvh-4rem)] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="relative z-10 mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
