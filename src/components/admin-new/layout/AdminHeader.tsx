'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, ChevronRight } from 'lucide-react';

interface AdminHeaderProps {
  onMenuClick: () => void;
  user: { name?: string | null; role?: string | null };
}

const routeNames: Record<string, string> = {
  '/admin': '대시보드',
  '/admin/products': '상품 관리',
  '/admin/products/new': '상품 등록',
  '/admin/products/display': '상품 진열 관리',
  '/admin/categories': '카테고리 관리',
  '/admin/brands': '브랜드 관리',
  '/admin/orders': '주문 관리',
  '/admin/members': '회원 관리',
  '/admin/insurance': '보험 상담',
  '/admin/survey': '맞춤 진단',
  '/admin/qna': '문의 관리',
  '/admin/partners': '제휴 관리',
  '/admin/kits': '케어키트 관리',
  '/admin/notices': '공지사항',
  '/admin/settings': '환경 설정',
};

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
          onClick={onMenuClick}
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
