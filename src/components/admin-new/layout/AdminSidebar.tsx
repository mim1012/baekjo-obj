'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMounted } from '@/lib/useMounted';
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
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

const mainNavItems = ADMIN_MAIN_NAV;
const siteNavItems = ADMIN_SITE_NAV;
const operationsNavItems = ADMIN_OPERATIONS_NAV;
const insuranceNavItems = ADMIN_INSURANCE_NAV;

interface AdminSidebarProps {
  user: { name?: string | null; role?: string | null };
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

function NavGroup({
  items,
  title,
  collapsed,
  isActive,
}: {
  items: AdminSidebarItem[];
  title?: string;
  collapsed: boolean;
  isActive: (href: string) => boolean;
}) {
  return (
    <div className="mb-6">
      {!collapsed && title && (
        <h3 className="px-4 text-xs font-semibold text-[#8B928C] uppercase tracking-wider mb-2">
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
              aria-current={active ? 'page' : undefined}
              className={`flex items-center group px-3 py-2.5 rounded-md transition-colors ${
                active
                  ? 'bg-[#2F3B34] text-white font-medium'
                  : 'text-[#4B5563] hover:bg-[#E4E8E3] hover:text-[#17201B]'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={`shrink-0 ${collapsed ? 'mx-auto size-5' : 'mr-3 size-5'}`} />
              {!collapsed && (
                <span className="min-w-0">
                  <span className="block truncate text-[14px]">{item.name}</span>
                  <span className={`mt-0.5 block truncate text-[10px] font-normal ${active ? 'text-white/70' : 'text-[#8B928C]'}`}>
                    {item.description}
                  </span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default function AdminSidebar({ user, collapsed, setCollapsed }: AdminSidebarProps) {
  const pathname = usePathname();
  const mounted = useMounted();

  const activeHref = resolveActiveHref(pathname, ADMIN_ALL_NAV);
  const isActive = (href: string) => href === activeHref;

  if (!mounted) return null; // Avoid hydration mismatch on server render

  return (
    <aside 
      className={`hidden md:flex flex-col fixed inset-y-0 left-0 z-20 bg-[#F7F8F6] border-r border-gray-200 transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[68px]' : 'w-[236px]'
      }`}
    >
      <div className="h-[60px] flex items-center justify-between px-4 border-b border-gray-200">
        {!collapsed && (
          <Link href="/" className="block shrink-0" aria-label="백조오브제 홈">
            <BrandMark className="h-10 w-[146px]" />
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="mx-auto block shrink-0" aria-label="백조오브제 홈">
            <BrandMark compact />
          </Link>
        )}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
          aria-expanded={!collapsed}
          className={`p-1.5 rounded-md text-gray-500 hover:bg-gray-200 transition-colors ${collapsed ? 'absolute -right-3 top-16 bg-white border border-gray-200 shadow-sm rounded-full' : ''}`}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-6 scrollbar-hide">
        <NavGroup items={mainNavItems} collapsed={collapsed} isActive={isActive} />
        <NavGroup items={siteNavItems} title="홈페이지 내용" collapsed={collapsed} isActive={isActive} />
        <NavGroup items={operationsNavItems} title="주문·고객 처리" collapsed={collapsed} isActive={isActive} />
        <NavGroup items={insuranceNavItems} title="보험(별도)" collapsed={collapsed} isActive={isActive} />
      </div>

      <div className="p-4 border-t border-gray-200 bg-[#F7F8F6]">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          {!collapsed && (
            <div className="truncate pr-2">
              <p className="text-[13px] font-semibold text-[#17201B] truncate">{user.name || '관리자'}</p>
              <p className="text-[12px] text-gray-500 truncate">{user.role}</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: '/' })}
            aria-label="관리자 로그아웃"
            className={`p-2 rounded-md text-gray-500 hover:bg-gray-200 hover:text-red-600 transition-colors`}
            title={collapsed ? '로그아웃' : undefined}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
