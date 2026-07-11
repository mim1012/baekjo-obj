'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HeartPulse, Home, ShoppingBag, ShieldCheck, User } from 'lucide-react';

const NAV_ITEMS = [
  { label: '홈', href: '/', icon: Home },
  { label: '케어', href: '/concerns', icon: HeartPulse },
  { label: '쇼핑', href: '/shop', icon: ShoppingBag },
  { label: '보험', href: '/insurance', icon: ShieldCheck },
  { label: '마이', href: '/mypage', icon: User },
];

export default function MobileBottomNav() {
  const pathname = usePathname();

  const hiddenOnFocusedFlow = [
    '/admin',
    '/checkout',
    '/order-complete',
    '/diagnosis',
    '/insurance/apply',
    '/insurance/recommend',
    '/insurance/complete',
    '/login',
    '/signup',
  ].some((path) => pathname.startsWith(path));

  if (hiddenOnFocusedFlow) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E7E0D5] bg-[#FBFAF7]/95 pb-safe backdrop-blur-xl md:hidden">
      <nav aria-label="하단 메뉴" className="flex h-16 items-center justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex h-full w-full flex-col items-center justify-center gap-1 ${
                active ? 'text-[#17211D]' : 'text-[#8A918B]'
              }`}
            >
              <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
