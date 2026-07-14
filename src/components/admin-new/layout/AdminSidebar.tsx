'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMounted } from '@/lib/useMounted';
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { signOut } from 'next-auth/react';
import {
  ADMIN_MAIN_NAV,
  ADMIN_CS_NAV,
  ADMIN_ETC_NAV,
  resolveActiveHref,
  type AdminNavItem,
} from './adminNav';

type SidebarItem = Required<Pick<AdminNavItem, 'name' | 'href' | 'icon'>>;

const mainNavItems = ADMIN_MAIN_NAV as SidebarItem[];
const csNavItems = ADMIN_CS_NAV as SidebarItem[];
const etcNavItems = ADMIN_ETC_NAV as SidebarItem[];

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
  items: SidebarItem[];
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
              className={`flex items-center group px-3 py-2.5 rounded-md transition-colors ${
                active
                  ? 'bg-[#2F3B34] text-white font-medium'
                  : 'text-[#4B5563] hover:bg-[#E4E8E3] hover:text-[#17201B]'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className={`shrink-0 ${collapsed ? 'mx-auto size-5' : 'mr-3 size-5'}`} />
              {!collapsed && <span className="text-[14px] truncate">{item.name}</span>}
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

  const allNavItems = [...mainNavItems, ...csNavItems, ...etcNavItems];
  const activeHref = resolveActiveHref(pathname, allNavItems);
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
          <Link href="/admin" className="font-bold text-[18px] text-[#17201B] truncate">
            백조오브제
          </Link>
        )}
        {collapsed && (
          <Link href="/admin" className="mx-auto font-bold text-[18px] text-[#17201B]">
            B
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-md text-gray-500 hover:bg-gray-200 transition-colors ${collapsed ? 'absolute -right-3 top-16 bg-white border border-gray-200 shadow-sm rounded-full' : ''}`}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-6 scrollbar-hide">
        <NavGroup items={mainNavItems} collapsed={collapsed} isActive={isActive} />
        <NavGroup items={csNavItems} title="고객지원" collapsed={collapsed} isActive={isActive} />
        <NavGroup items={etcNavItems} title="기타" collapsed={collapsed} isActive={isActive} />
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
            onClick={() => signOut({ callbackUrl: '/' })}
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
