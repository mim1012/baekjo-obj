'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, ChevronRight } from 'lucide-react';
import {
  ADMIN_MAIN_NAV,
  ADMIN_CS_NAV,
  ADMIN_ETC_NAV,
  ADMIN_BREADCRUMB_ONLY,
} from './adminNav';

interface AdminHeaderProps {
  onMenuClick: () => void;
  user: { name?: string | null; role?: string | null };
}

// 사이드바(adminNav.ts, SSOT)에서 파생 — 누락이 구조적으로 불가능하다.
const routeNames: Record<string, string> = Object.fromEntries(
  [...ADMIN_MAIN_NAV, ...ADMIN_CS_NAV, ...ADMIN_ETC_NAV, ...ADMIN_BREADCRUMB_ONLY].map((item) => [
    item.href,
    item.name,
  ]),
);

export default function AdminHeader({ onMenuClick, user }: AdminHeaderProps) {
  const pathname = usePathname();
  
  // 간단한 브레드크럼 로직
  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(Boolean);
    let currentPath = '';
    const breadcrumbs = [];
    
    for (const p of paths) {
      currentPath += `/${p}`;
      if (routeNames[currentPath]) {
        breadcrumbs.push({ name: routeNames[currentPath], path: currentPath });
      } else if (p !== 'admin' && p !== 'products' && p !== 'orders' && p !== 'members') {
        // ID 등 동적 라우트 처리 단순화
        breadcrumbs.push({ name: '상세', path: currentPath });
      }
    }
    
    // '/admin' 자체일 경우
    if (breadcrumbs.length === 0 && pathname === '/admin') {
      breadcrumbs.push({ name: '대시보드', path: '/admin' });
    }
    
    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();
  const title = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : '관리자';

  return (
    <header className="h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-4 sticky top-0 z-10 w-full">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="메뉴 열기"
          className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md"
        >
          <Menu size={20} />
        </button>
        
        <div className="flex items-center">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.path}>
              {idx > 0 && <ChevronRight size={14} className="mx-2 text-gray-400 shrink-0" />}
              <Link 
                href={crumb.path}
                className={`text-[14px] ${idx === breadcrumbs.length - 1 ? 'font-semibold text-[#17201B]' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {crumb.name}
              </Link>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* 필요한 알림이나 기타 헤더 아이템 위치 */}
        <div className="hidden md:block text-right">
          <p className="text-[13px] font-medium text-[#17201B]">{user.name || '관리자'} 님</p>
        </div>
      </div>
    </header>
  );
}
