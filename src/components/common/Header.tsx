'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, Menu, Search, ShoppingBag, User, X, ChevronDown } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import BrandMark from './BrandMark';
import { getCartCount } from '@/lib/cart';

const NAV_LINKS = [
  { label: '고민 해결', href: '/concerns' },
  { label: '브랜드', href: '/brands' },
  { label: '쇼핑', href: '/shop', hasDropdown: true },
  { label: '보험 분석', href: '/insurance' },
  { label: '전문가', href: '/experts' },
  { label: '리뷰', href: '/reviews' },
  { label: '공지사항', href: '/notices' },
];

const SHOP_DROPDOWN = {
  brands: [
    { label: '페네핏', href: '/brands/b1' },
    { label: '오미프로', href: '/brands/b2' },
    { label: '노블독', href: '/brands/b3' },
    { label: '캣코드', href: '/brands/b4' },
    { label: '알로밍', href: '/brands/b5' },
  ],
  categories: [
    { label: '식사와 영양', href: '/shop?category=dining-and-nourish' },
    { label: '건강과 케어', href: '/shop?category=wellness-and-care' },
    { label: '구강과 위생', href: '/shop?category=fragrance-and-hygiene' },
    { label: '그루밍과 브러싱', href: '/shop?category=grooming-and-brushing' },
    { label: '생활과 오브제', href: '/shop?category=living-and-objet' },
    { label: '놀이와 활동', href: '/shop?category=play-and-activity' },
    { label: '기록과 소품', href: '/shop?category=desk-and-stationery' },
  ]
};

const subscribeToCart = (callback: () => void) => {
  window.addEventListener('cart-updated', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('cart-updated', callback);
    window.removeEventListener('storage', callback);
  };
};

export default function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopAccordionOpen, setShopAccordionOpen] = useState(false);
  const cartCount = useSyncExternalStore(subscribeToCart, getCartCount, () => 0);

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-[rgba(15,23,42,0.06)] bg-[#FBFAF7]/90 backdrop-blur-md">
      <div className="site-container flex h-[72px] items-center justify-between">
        <Link href="/" aria-label="백조오브제 홈" className="text-[#17211D]">
          <BrandMark />
        </Link>

        <nav aria-label="주요 메뉴" className="hidden items-center gap-4 lg:flex xl:gap-6">
          {NAV_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            
            if (link.hasDropdown) {
              return (
                <div key={link.href} className="group relative">
                  <Link
                    href={link.href}
                    className={`flex items-center gap-1 border-b-2 py-6 text-xs transition-colors duration-150 xl:text-sm ${
                      active
                        ? 'border-[#17211D] font-semibold text-[#17211D]'
                        : 'border-transparent text-[#64748B] hover:text-[#17211D]'
                    }`}
                  >
                    {link.label}
                    <ChevronDown className="size-3 text-slate-400 transition-transform duration-200 group-hover:rotate-180" />
                  </Link>
                  
                  {/* Dropdown Menu */}
                  <div className="absolute left-1/2 top-[72px] hidden -translate-x-1/2 w-[480px] bg-white rounded-b-[18px] border border-[rgba(15,23,42,0.08)] shadow-lg group-hover:flex">
                    <div className="flex w-full p-6">
                      <div className="flex-1 border-r border-slate-100 pr-6">
                        <h3 className="mb-4 text-xs font-bold text-[#17211D] tracking-wider">브랜드 전용관</h3>
                        <ul className="space-y-3">
                          {SHOP_DROPDOWN.brands.map((item) => (
                            <li key={item.href}>
                              <Link href={item.href} className="text-sm text-[#64748B] hover:text-[#17211D] hover:font-medium transition-colors">
                                {item.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex-1 pl-6">
                        <h3 className="mb-4 text-xs font-bold text-[#17211D] tracking-wider">카테고리 전용관</h3>
                        <ul className="space-y-3">
                          {SHOP_DROPDOWN.categories.map((item) => (
                            <li key={item.href}>
                              <Link href={item.href} className="text-sm text-[#64748B] hover:text-[#17211D] hover:font-medium transition-colors">
                                {item.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`border-b-2 py-6 text-xs transition-colors duration-150 xl:text-sm ${
                  active
                    ? 'border-[#17211D] font-semibold text-[#17211D]'
                    : 'border-transparent text-[#64748B] hover:text-[#17211D]'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/shop"
            aria-label="상품 검색"
            className="hidden rounded-full p-2.5 text-[#334155] transition-colors duration-150 hover:bg-[#FBFAF7] hover:text-[#17211D] md:block"
          >
            <Search className="size-5" />
          </Link>
          <Link
            href="/login"
            aria-label="로그인"
            className="hidden rounded-full p-2.5 text-[#334155] transition-colors duration-150 hover:bg-[#FBFAF7] hover:text-[#17211D] md:block"
          >
            <LogIn className="size-5" />
          </Link>
          <Link
            href="/mypage"
            aria-label="마이페이지"
            className="hidden rounded-full p-2.5 text-[#334155] transition-colors duration-150 hover:bg-[#FBFAF7] hover:text-[#17211D] md:block"
          >
            <User className="size-5" />
          </Link>
          <Link
            href="/cart"
            aria-label="장바구니"
            className="relative rounded-full p-2.5 text-[#334155] transition-colors duration-150 hover:bg-[#FBFAF7] hover:text-[#17211D]"
          >
            <ShoppingBag className="size-5" />
            <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-[#17211D] text-[9px] font-bold text-white">
              {cartCount > 9 ? '9+' : cartCount}
            </span>
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-full p-2.5 text-[#334155] transition-colors duration-150 hover:bg-[#FBFAF7] lg:hidden"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="모바일 메뉴"
          className="border-t border-[rgba(15,23,42,0.06)] bg-white px-5 py-5 lg:hidden overflow-y-auto max-h-[calc(100vh-72px)]"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {NAV_LINKS.map((link) => {
              if (link.hasDropdown) {
                return (
                  <div key={link.href} className="flex flex-col">
                    <button
                      onClick={() => setShopAccordionOpen(!shopAccordionOpen)}
                      className={`flex items-center justify-between rounded-[12px] px-4 py-3 text-sm transition-colors ${
                        pathname.startsWith(link.href) || shopAccordionOpen
                          ? 'bg-[#FBFAF7] font-semibold text-[#17211D]'
                          : 'text-[#64748B] hover:bg-slate-50'
                      }`}
                    >
                      {link.label}
                      <ChevronDown className={`size-4 transition-transform duration-200 ${shopAccordionOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {shopAccordionOpen && (
                      <div className="mt-2 flex flex-col gap-4 rounded-[12px] bg-[#FBFAF7] p-4 ml-4 border-l-2 border-[rgba(15,23,42,0.06)]">
                        <div>
                          <div className="mb-2 text-xs font-bold text-slate-400">브랜드 전용관</div>
                          <div className="grid grid-cols-2 gap-2">
                            {SHOP_DROPDOWN.brands.map(item => (
                              <Link 
                                key={item.href} 
                                href={item.href}
                                onClick={() => setMenuOpen(false)}
                                className="text-sm text-[#334155] py-1"
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="mb-2 text-xs font-bold text-slate-400">카테고리 전용관</div>
                          <div className="grid grid-cols-2 gap-2">
                            {SHOP_DROPDOWN.categories.map(item => (
                              <Link 
                                key={item.href} 
                                href={item.href}
                                onClick={() => setMenuOpen(false)}
                                className="text-sm text-[#334155] py-1"
                              >
                                {item.label}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-[12px] px-4 py-3 text-sm ${
                    pathname.startsWith(link.href)
                      ? 'bg-[#FBFAF7] font-semibold text-[#17211D]'
                      : 'text-[#64748B] hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
