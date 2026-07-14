'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

// AdminSidebar와 동일한 메뉴 구조 공유 (실제 구현시 분리된 상수 파일 사용 권장)
import { LayoutDashboard, Package, FolderTree, Tag, ShoppingCart, Users, HeartHandshake, Stethoscope, MessageSquare, Handshake, Gift, Bell, Settings } from 'lucide-react';

const mainNavItems: SidebarItem[] = [
  { name: '대시보드', href: '/admin', icon: LayoutDashboard },
  { name: '상품 관리', href: '/admin/products', icon: Package },
  { name: '카테고리 관리', href: '/admin/categories', icon: FolderTree },
  { name: '브랜드 관리', href: '/admin/brands', icon: Tag },
  { name: '주문 관리', href: '/admin/orders', icon: ShoppingCart },
  { name: '회원 관리', href: '/admin/members', icon: Users },
];

const csNavItems: SidebarItem[] = [
  { name: '보험 상담', href: '/admin/insurance', icon: HeartHandshake },
  { name: '맞춤 진단', href: '/admin/survey', icon: Stethoscope },
  { name: '문의 관리', href: '/admin/qna', icon: MessageSquare },
];

const etcNavItems: SidebarItem[] = [
  { name: '제휴 관리', href: '/admin/partners', icon: Handshake },
  { name: '케어키트 관리', href: '/admin/kits', icon: Gift },
  { name: '공지사항', href: '/admin/notices', icon: Bell },
  { name: '환경 설정', href: '/admin/settings', icon: Settings },
];

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
  items: SidebarItem[];
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
              className={`flex items-center group px-3 py-3 rounded-md transition-colors ${
                active
                  ? 'bg-[#2F3B34] text-white font-medium'
                  : 'text-[#4B5563] hover:bg-[#E4E8E3] hover:text-[#17201B]'
              }`}
            >
              <item.icon className="mr-3 size-5 shrink-0" />
              <span className="text-[15px]">{item.name}</span>
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

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href) && href !== '/admin';
  };

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
          <Link href="/admin" className="font-bold text-[18px] text-[#17201B]" onClick={onClose}>
            백조오브제
          </Link>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-gray-500 hover:bg-gray-100 rounded-md"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6">
          <NavGroup items={mainNavItems} isActive={isActive} onNavigate={onClose} />
          <NavGroup items={csNavItems} title="고객지원" isActive={isActive} onNavigate={onClose} />
          <NavGroup items={etcNavItems} title="기타" isActive={isActive} onNavigate={onClose} />
        </div>

        <div className="p-4 border-t border-gray-200 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="truncate pr-2">
              <p className="text-[14px] font-semibold text-[#17201B] truncate">{user.name || '관리자'}</p>
              <p className="text-[12px] text-gray-500 truncate">{user.role}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
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
