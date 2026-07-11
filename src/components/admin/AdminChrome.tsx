'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  Star,
  Users,
  ClipboardCheck,
  Activity,
  Gift,
  HeartHandshake,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import BrandMark from '@/components/common/BrandMark';
import { logout } from '@/lib/storage';

const adminLinks = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/members', label: '회원 관리', icon: Users },
  { href: '/admin/products', label: '상품 관리', icon: Package },
  { href: '/admin/brands', label: '브랜드 관리', icon: BadgeCheck },
  { href: '/admin/concerns', label: '고민 관리', icon: HeartPulse },
  { href: '/admin/orders', label: '주문 관리', icon: ShoppingCart },
  { href: '/admin/insurance', label: '보험 분석 관리', icon: ShieldCheck },
  { href: '/admin/reviews', label: '후기 관리', icon: Star },
  { href: '/admin/qna', label: 'Q&A 관리(단순안내)', icon: MessageCircle },
  { href: '/admin/inquiries', label: '상품문의 관리', icon: MessageCircle },
  { href: '/admin/notices', label: '공지사항 관리', icon: Megaphone },
  { href: '/admin/survey', label: '맞춤 진단 관리', icon: ClipboardCheck },
  { href: '/admin/survey-results', label: '진단 참여 내역', icon: Activity },
  { href: '/admin/kits', label: '케어 키트 관리', icon: Gift },
  { href: '/admin/partners', label: 'B2B 제휴 관리', icon: HeartHandshake },
  { href: '/admin/settings', label: '환경설정', icon: Settings },
];

export default function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[#EAE8E1] md:flex-row">
      <aside className="w-full shrink-0 border-r border-[#465148] bg-[#29332C] text-white md:w-64 md:h-screen md:sticky md:top-0 flex flex-col">
        <div className="border-b border-[#465148] p-6 shrink-0">
          <Link href="/admin" aria-label="백조오브제 관리자 홈" className="text-white">
            <BrandMark inverse />
          </Link>
          <p className="mt-4 text-[10px] uppercase text-[#89958B]">Administration</p>
        </div>

        <nav aria-label="관리자 메뉴" className="grid grid-cols-2 gap-1 px-3 py-4 md:grid-cols-1 flex-1 overflow-y-auto custom-scrollbar">
          {adminLinks.map((item) => {
            const Icon = item.icon;
            const active = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 border-l px-3 py-2.5 text-xs ${
                  active
                    ? 'border-[#D8DED9] bg-white/10 text-white'
                    : 'border-transparent text-[#B7C0B8] hover:border-[#89958B] hover:text-white'
                }`}
              >
                <Icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-6 pb-6 pt-4 border-t border-[#465148] shrink-0 mt-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-xs text-[#9EA8A0] hover:text-white">
            <ArrowLeft className="size-3.5" />
            스토어로 돌아가기
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex min-h-16 items-center justify-between gap-5 border-b border-[#D1D0C8] bg-[#F6F4EE] px-5 sm:px-8">
          <div className="relative hidden w-full max-w-md md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B928C]" />
            <input aria-label="관리자 통합 검색" placeholder="회원, 주문, 상품 통합 검색" className="w-full border border-[#D1D0C8] bg-white py-2.5 pl-10 pr-4 text-sm" />
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs font-semibold text-[#303731]">관리자</p>
              <p className="text-[10px] text-[#8B928C]">Mock Console</p>
            </div>
            <button type="button" onClick={handleLogout} aria-label="로그아웃" className="flex size-10 items-center justify-center border border-[#D1D0C8] bg-white text-[#59615B]">
              <LogOut className="size-4" />
            </button>
          </div>
        </header>
        <main className="p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
