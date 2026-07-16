'use client';

import Link from 'next/link';
import { Package, Truck, Star, MessageCircle, Shield } from 'lucide-react';

interface OverviewSectionProps {
  stats: {
    processingOrders: number;
    shippingOrders: number;
    writableReviews: number;
    waitingInquiries: number;
    insuranceCount: number;
  };
}

export default function OverviewSection({ stats }: OverviewSectionProps) {
  const cards = [
    {
      id: 'orders',
      label: '진행 중 주문',
      value: stats.processingOrders,
      href: '/mypage?tab=orders',
      icon: Package,
    },
    {
      id: 'shipping',
      label: '배송 중',
      value: stats.shippingOrders,
      href: '/mypage?tab=orders',
      icon: Truck,
    },
    {
      id: 'reviews',
      label: '작성 가능 구매평',
      value: stats.writableReviews,
      href: '/mypage?tab=reviews',
      icon: Star,
    },
    {
      id: 'inquiries',
      label: '답변 대기 문의',
      value: stats.waitingInquiries,
      href: '/mypage?tab=inquiries',
      icon: MessageCircle,
    },
    {
      id: 'insurance',
      label: '보험 분석 진행',
      value: stats.insuranceCount,
      href: '/mypage?tab=insurance',
      icon: Shield,
    },
  ];

  return (
    <section>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-[#18231F]">마이페이지 요약</h2>
        <p className="mt-2 text-sm text-[#68716C]">현재 진행 중인 쇼핑 및 활동 내역을 확인하세요.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-6">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.id}
              href={card.href}
              className="mypage-card group flex flex-col items-center justify-center p-6 text-center transition-colors duration-300 hover:border-[#18231F]"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#F2EEE5] text-[#18231F] transition-transform duration-300 group-hover:scale-110">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-[#68716C]">{card.label}</p>
              <p className="mt-1 font-editorial text-2xl font-bold text-[#18231F]">{card.value}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
