'use client';

import Link from 'next/link';

interface MypageMobileNavProps {
  activeTab: string;
}

export default function MypageMobileNav({ activeTab }: MypageMobileNavProps) {
  const tabs = [
    { id: 'overview', label: '마이페이지' },
    { id: 'orders', label: '주문내역' },
    { id: 'wishlist', label: '관심 상품' },
    { id: 'reviews', label: '구매평 관리' },
    { id: 'inquiries', label: '상품문의 관리' },
    { id: 'insurance', label: '보험 분석 내역' },
    { id: 'profile', label: '회원정보 수정' },
  ];

  return (
    <div className="sticky top-14 z-20 -mx-5 mb-6 border-b border-[#DED8CC] bg-[#F8F6F0]/95 backdrop-blur-xl px-5 lg:hidden">
      <nav aria-label="모바일 마이페이지 메뉴" className="hide-scrollbar -mb-px flex gap-6 overflow-x-auto">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={`/mypage?tab=${tab.id}`}
            className={`shrink-0 border-b-2 py-4 text-sm font-semibold transition-colors duration-500 ${
              activeTab === tab.id
                ? 'border-[#18231F] text-[#18231F]'
                : 'border-transparent text-[#68716C] hover:text-[#18231F]'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
