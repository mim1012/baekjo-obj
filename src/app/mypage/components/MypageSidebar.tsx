'use client';

import Link from 'next/link';
import { User } from '@/types';
import { LogOut, User as UserIcon, Package, Heart, Star, MessageCircle, Shield, Settings, ArchiveX } from 'lucide-react';
import { logout } from '@/lib/storage';

interface MypageSidebarProps {
  user: User | null;
  activeTab: string;
}

export default function MypageSidebar({ user, activeTab }: MypageSidebarProps) {
  if (!user) return null;

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const navGroups = [
    {
      title: '나의 쇼핑',
      items: [
        { id: 'orders', label: '주문내역', icon: Package },
        { id: 'wishlist', label: '관심 상품', icon: Heart },
      ],
    },
    {
      title: '나의 활동',
      items: [
        { id: 'reviews', label: '구매평 관리', icon: Star },
        { id: 'inquiries', label: '상품문의 관리', icon: MessageCircle },
      ],
    },
    {
      title: '케어 서비스',
      items: [
        { id: 'insurance', label: '보험 분석 내역', icon: Shield },
      ],
    },
    {
      title: '회원 관리',
      items: [
        { id: 'profile', label: '회원정보 수정', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="mypage-sidebar">
      {/* 프로필 카드 */}
      <div className="flex flex-col items-center rounded-2xl border border-[#DED8CC] bg-[#FFFDF9] p-6 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F2EEE5] text-[#18231F]">
          <UserIcon className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-[#18231F]">{user.name} 님</h2>
        <p className="mt-1 text-sm text-[#68716C]">{user.email}</p>
        
        <div className="mt-6 flex w-full flex-col gap-2">
          <Link href="/mypage?tab=profile" className="flex items-center justify-center rounded-lg border border-[#DED8CC] py-2.5 text-sm font-semibold text-[#18231F] transition-colors hover:bg-[#F8F6F0]">
            회원정보 수정
          </Link>
          <button onClick={handleLogout} className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-[#68716C] transition-colors hover:bg-gray-100 hover:text-[#18231F]">
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </div>

      {/* 네비게이션 메뉴 */}
      <nav className="flex flex-col gap-6">
        {navGroups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-2 px-4 text-xs font-bold tracking-wider text-[#68716C]">{group.title}</h3>
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <li key={item.id}>
                    <Link
                      href={`/mypage?tab=${item.id}`}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#18231F] text-white'
                          : 'text-[#18231F] hover:bg-[#F2EEE5]'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-[#68716C]'}`} />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
