'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mypageMenuByRole } from '@/lib/mypage-permissions';
import type { User } from '@/types';

export default function MypageSidebar({ user }: { user: User }) {
  const pathname = usePathname();
  if (!user.role) return null;

  const menu = mypageMenuByRole[user.role] || [];

  return (
    <div className="bg-[#FFFEFB] rounded-sm shadow-sm border border-[#E2DACD] overflow-hidden">
      <div className="p-4 bg-[#F2EEE6] border-b border-[#E2DACD] font-bold text-[#17251F]">
        나의 메뉴
      </div>
      <ul className="divide-y divide-[#E2DACD]">
        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link 
                href={item.href} 
                className={`flex items-center gap-2 p-4 text-sm transition-colors
                  ${isActive ? 'bg-[#F8F6F0] text-[#16382D] font-bold border-l-2 border-l-[#16382D]' : 'text-[#6F756F] hover:bg-[#F8F6F0] hover:text-[#17251F] border-l-2 border-l-transparent'}`}
              >
                <Icon className={`size-4 ${isActive ? 'text-[#16382D]' : 'text-[#6F756F]'}`} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
