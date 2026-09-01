'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import BrandMark from '@/components/common/BrandMark';
import {
  ADMIN_MAIN_NAV,
  ADMIN_SITE_NAV,
  ADMIN_OPERATIONS_NAV,
  ADMIN_INSURANCE_NAV,
  ADMIN_ALL_NAV,
  resolveActiveHref,
  type AdminSidebarItem,
} from './adminNav';

// AdminSidebar와 메뉴 구조를 adminNav.ts(SSOT)로 공유한다.
const mainNavItems = ADMIN_MAIN_NAV;
const siteNavItems = ADMIN_SITE_NAV;
const operationsNavItems = ADMIN_OPERATIONS_NAV;
const insuranceNavItems = ADMIN_INSURANCE_NAV;

interface AdminMobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  user: { name?: string | null; role?: string | null };
}

function NavGroup({
  items,
  title,
  isActive,
  onNavigate,
}: {
  items: AdminSidebarItem[];
  title?: string;
  isActive: (href: string) => boolean;
  onNavigate: () => void;
}) {
  return (
    <div className="mb-6">
      {title && (
        <h3 className="px-4 text-[11px] font-semibold text-[#8B928C] uppercase tracking-wider mb-2">
          {title}
        </h3>
      )}
      <nav className="space-y-1 px-2">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={`flex items-center group px-3 py-3 rounded-md transition-colors ${
                active
                  ? 'bg-[#2F3B34] text-white font-medium'
                  : 'text-[#4B5563] hover:bg-[#E4E8E3] hover:text-[#17201B]'
              }`}
            >
              <item.icon className="mr-3 size-5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-[15px]">{item.name}</span>
                <span className={`mt-0.5 block text-[11px] font-normal ${active ? 'text-white/70' : 'text-[#8B928C]'}`}>
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AdminMobileNav({ isOpen, onClose, user }: AdminMobileNavProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const activeHref = resolveActiveHref(pathname, ADMIN_ALL_NAV);
  const isActive = (href: string) => href === activeHref;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 left-0 w-[280px] bg-[#F7F8F6] shadow-xl z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-[60px] flex items-center justify-between px-4 border-b border-gray-200 shrink-0 bg-white">
          <Link href="/" className="block shrink-0" onClick={onClose} aria-label="백조오브제 홈">
            <BrandMark className="h-10 w-[146px]" />
          </Link>
          <button 
            type="button"
            onClick={onClose}
            aria-label="관리자 메뉴 닫기"
            className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6">
          <NavGroup items={mainNavItems} isActive={isActive} onNavigate={onClose} />
          <NavGroup items={siteNavItems} title="홈페이지 내용" isActive={isActive} onNavigate={onClose} />
          <NavGroup items={operationsNavItems} title="주문·고객 처리" isActive={isActive} onNavigate={onClose} />
          <NavGroup items={insuranceNavItems} title="보험(별도)" isActive={isActive} onNavigate={onClose} />
        </div>

        <div className="p-4 border-t border-gray-200 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-[14px] font-semibold text-[#17201B] truncate">{user.name || '관리자'}</p>
              <p className="text-[12px] text-gray-500 truncate">{user.role}</p>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              aria-label="관리자 로그아웃"
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-red-600 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
