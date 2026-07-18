'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  LogIn,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { shopCategoryFilters } from '@/data/shopFilters';
import { getCartCount } from '@/lib/cart';
import { getCurrentUser, getPublicBrands, logout } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import BrandMark from './BrandMark';

const MAIN_LINKS = [
  { label: '케어 가이드', href: '/concerns' },
  { label: '브랜드', href: '/brands' },
  { label: '보험 분석', href: '/insurance' },
  { label: 'B2B', href: '/b2b' },
];

const DESKTOP_NAV_TEXT_CLASS =
  'flex h-full items-center border-b-2 text-[15px] font-semibold leading-none text-[#6F766F] transition-colors duration-500 hover:text-[#17211D]';

const STORY_LINKS = [
  { label: '검증 기준', description: '백조 Audit의 네 가지 확인 기준', href: '/audit' },
  { label: '전문가의 기준', description: '건강과 생활을 살피는 기준', href: '/experts' },
  { label: '반려가족 이야기', description: '먼저 경험한 보호자들의 기록', href: '/reviews' },
  { label: '백조 소식', description: '새로운 서비스와 안내', href: '/notices' },
];

const SHOP_LINKS = {
  categories: shopCategoryFilters.map((category) => ({
    label: category.label,
    href: `/shop?category=${category.slug}`,
  })),
};

const subscribeToCart = (callback: () => void) => {
  window.addEventListener('cart-updated', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('cart-updated', callback);
    window.removeEventListener('storage', callback);
  };
};

type MobilePanel = 'shop' | 'story' | null;

export default function Header() {
  const pathname = usePathname();
  const mounted = useMounted();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [brandLinks, setBrandLinks] = useState<Array<{ label: string; href: string }>>([]);
  const cartCount = useSyncExternalStore(subscribeToCart, getCartCount, () => 0);
  const currentUser = mounted ? getCurrentUser() : null;

  useEffect(() => {
    getPublicBrands()
      .then((list) =>
        setBrandLinks(
          list
            .filter((brand) => brand.isVisible !== false)
            .map((brand) => ({
              label: brand.name.split(' (')[0],
              href: `/brands/${brand.id}`,
            })),
        ),
      )
      .catch(() => {});
  }, []);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const storyActive = STORY_LINKS.some((link) => isActive(link.href));

  const closeMenu = () => {
    setMenuOpen(false);
    setMobilePanel(null);
  };

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#E7E0D5]/80 bg-[#FBFAF7]/95 backdrop-blur-xl">
      <div className="site-container-wide flex h-16 items-center justify-between lg:h-[72px]">
        <Link href="/" aria-label="백조오브제 홈" className="text-[#17211D]" onClick={closeMenu}>
          <BrandMark />
        </Link>

        <nav aria-label="주요 메뉴" className="hidden h-full items-center gap-6 lg:flex">
          {MAIN_LINKS.slice(0, 2).map((link) => (
            <NavLink key={link.href} {...link} active={isActive(link.href)} />
          ))}

          <div className="group relative flex h-full items-center">
            <Link
              href="/shop"
              aria-current={isActive('/shop') ? 'page' : undefined}
              className={`${DESKTOP_NAV_TEXT_CLASS} gap-1 ${
                isActive('/shop')
                  ? 'border-[#A8742E]'
                  : 'border-transparent'
              }`}
            >
              셀렉션
              <ChevronDown className="size-3.5 transition-transform duration-500 group-hover:rotate-180 group-focus-within:rotate-180" />
            </Link>
            <div className="absolute left-1/2 top-full z-40 hidden w-[520px] -translate-x-1/2 overflow-hidden rounded-b-3xl border border-[#E7E0D5] bg-white shadow-[0_24px_60px_-24px_rgba(23,33,29,0.18)] group-hover:block group-focus-within:block">
              <div className="grid grid-cols-2 gap-8 p-8">
                <DropdownColumn title="브랜드로 둘러보기" links={brandLinks} />
                <DropdownColumn title="필요한 것으로 찾기" links={SHOP_LINKS.categories} />
              </div>
              <Link
                href="/shop"
                className="flex items-center justify-between border-t border-[#E7E0D5] bg-[#FAF8F3] px-8 py-4 text-sm font-semibold text-[#17211D] transition-colors duration-500 hover:bg-[#F3EEE6]"
              >
                백조오브제 셀렉션 모두 보기
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {MAIN_LINKS.slice(2).map((link) => (
            <NavLink key={link.href} {...link} active={isActive(link.href)} />
          ))}

          <div className="group relative flex h-full items-center">
            <button
              type="button"
              aria-label="백조 이야기 메뉴"
              className={`${DESKTOP_NAV_TEXT_CLASS} gap-1 ${
                storyActive
                  ? 'border-[#A8742E]'
                  : 'border-transparent'
              }`}
            >
              백조 이야기
              <ChevronDown className="size-3.5 transition-transform duration-500 group-hover:rotate-180 group-focus-within:rotate-180" />
            </button>
            <div className="absolute right-0 top-full z-40 hidden w-80 overflow-hidden rounded-b-3xl border border-[#E7E0D5] bg-white p-3 shadow-[0_24px_60px_-24px_rgba(23,33,29,0.18)] group-hover:block group-focus-within:block">
              {STORY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-2xl px-4 py-3 transition-colors duration-500 hover:bg-[#FAF8F3]"
                >
                  <span className="block text-sm font-semibold text-[#17211D]">{link.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#6F766F]">{link.description}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/shop?focus=search"
            aria-label="상품 검색"
            className="hidden rounded-full p-2.5 text-[#6F766F] transition-colors duration-500 hover:bg-[#F3EEE6] hover:text-[#17211D] md:block"
          >
            <Search className="size-5" />
          </Link>
          {currentUser ? (
            <>
              {currentUser.role === 'admin' && (
                <Link
                  href="/admin"
                  aria-label="관리자"
                  className="hidden rounded-full px-3 py-2.5 text-xs font-semibold text-[#6F766F] transition-colors duration-500 hover:bg-[#F3EEE6] hover:text-[#17211D] md:block"
                >
                  관리자
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  logout();
                  window.location.reload();
                }}
                aria-label="로그아웃"
                className="hidden rounded-full px-3 py-2.5 text-xs font-semibold text-[#6F766F] transition-colors duration-500 hover:bg-[#F3EEE6] hover:text-[#17211D] md:block"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              href="/login"
              aria-label="로그인"
              className="hidden rounded-full p-2.5 text-[#6F766F] transition-colors duration-500 hover:bg-[#F3EEE6] hover:text-[#17211D] md:block"
            >
              <LogIn className="size-5" />
            </Link>
          )}
          <Link
            href="/mypage"
            aria-label="마이페이지"
            className="hidden rounded-full p-2.5 text-[#6F766F] transition-colors duration-500 hover:bg-[#F3EEE6] hover:text-[#17211D] md:block"
          >
            <User className="size-5" />
          </Link>
          <Link
            href="/cart"
            aria-label={`장바구니, 상품 ${cartCount}개`}
            className="relative rounded-full p-2.5 text-[#6F766F] transition-colors duration-500 hover:bg-[#F3EEE6] hover:text-[#17211D]"
          >
            <ShoppingBag className="size-5" />
            {cartCount > 0 && (
              <span className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-[#17211D] text-[9px] font-bold text-[#FBFAF7]">
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-full p-2.5 text-[#6F766F] transition-colors duration-500 hover:bg-[#F3EEE6] hover:text-[#17211D] lg:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="전체 메뉴"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-[#E7E0D5] bg-[#FBFAF7] px-4 pb-8 pt-4 lg:hidden"
        >
          <div className="mx-auto flex max-w-lg flex-col">
            {MAIN_LINKS.slice(0, 2).map((link) => (
              <MobileLink key={link.href} {...link} active={isActive(link.href)} onClick={closeMenu} />
            ))}

            <MobileAccordion
              title="셀렉션"
              open={mobilePanel === 'shop'}
              active={isActive('/shop')}
              onToggle={() => setMobilePanel((panel) => (panel === 'shop' ? null : 'shop'))}
            >
              <Link href="/shop" onClick={closeMenu} className="text-sm font-semibold text-[#17211D]">
                셀렉션 모두 보기
              </Link>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
                {SHOP_LINKS.categories.map((link) => (
                  <Link key={link.href} href={link.href} onClick={closeMenu} className="text-sm text-[#6F766F]">
                    {link.label}
                  </Link>
                ))}
              </div>
            </MobileAccordion>

            {MAIN_LINKS.slice(2).map((link) => (
              <MobileLink key={link.href} {...link} active={isActive(link.href)} onClick={closeMenu} />
            ))}

            <MobileAccordion
              title="백조 이야기"
              open={mobilePanel === 'story'}
              active={storyActive}
              onToggle={() => setMobilePanel((panel) => (panel === 'story' ? null : 'story'))}
            >
              <div className="space-y-3">
                {STORY_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} onClick={closeMenu} className="block">
                    <span className="block text-sm font-semibold text-[#17211D]">{link.label}</span>
                    <span className="mt-0.5 block text-xs text-[#6F766F]">{link.description}</span>
                  </Link>
                ))}
              </div>
            </MobileAccordion>

            <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#E7E0D5] pt-5">
              <Link href={currentUser ? '/mypage' : '/login'} onClick={closeMenu} className="btn-secondary min-h-11 px-4">
                {currentUser ? '내 정보 보기' : '로그인'}
              </Link>
              <Link href="/cart" onClick={closeMenu} className="btn-secondary min-h-11 px-4">
                장바구니 {cartCount > 0 ? `${cartCount}` : ''}
              </Link>
              {currentUser?.role === 'admin' && (
                <Link href="/admin" onClick={closeMenu} className="btn-secondary min-h-11 px-4 col-span-2">
                  관리자 페이지
                </Link>
              )}
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}

interface NavLinkProps {
  label: string;
  href: string;
  active: boolean;
}

function NavLink({ label, href, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`${DESKTOP_NAV_TEXT_CLASS} ${
        active
          ? 'border-[#A8742E]'
          : 'border-transparent'
      }`}
    >
      {label}
    </Link>
  );
}

interface DropdownColumnProps {
  title: string;
  links: Array<{ label: string; href: string }>;
}

function DropdownColumn({ title, links }: DropdownColumnProps) {
  return (
    <div>
      <p className="mb-4 text-xs font-bold tracking-wider text-[#A8742E]">{title}</p>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-sm text-[#6F766F] transition-colors duration-500 hover:text-[#17211D]">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface MobileLinkProps {
  label: string;
  href: string;
  active: boolean;
  onClick: () => void;
}

function MobileLink({ label, href, active, onClick }: MobileLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`rounded-2xl px-4 py-3.5 text-base font-semibold transition-colors duration-500 ${
        active ? 'bg-[#F3EEE6] text-[#17211D]' : 'text-[#6F766F] hover:bg-[#FAF8F3] hover:text-[#17211D]'
      }`}
    >
      {label}
    </Link>
  );
}

interface MobileAccordionProps {
  title: string;
  open: boolean;
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function MobileAccordion({ title, open, active, onToggle, children }: MobileAccordionProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left text-base font-semibold transition-colors duration-500 ${
          active || open ? 'bg-[#F3EEE6] text-[#17211D]' : 'text-[#6F766F] hover:bg-[#FAF8F3]'
        }`}
      >
        {title}
        <ChevronDown className={`size-4 transition-transform duration-500 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mx-4 mb-3 mt-2 rounded-2xl bg-white p-5">{children}</div>}
    </div>
  );
}
