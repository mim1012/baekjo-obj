'use client';

import Link from 'next/link';
import { Package, Truck, Star, MessageCircle, Shield, Coins } from 'lucide-react';
import type { PointsTransaction } from '@/types';
import { formatDate, formatPrice } from '@/lib/format';

interface OverviewSectionProps {
  stats: {
    processingOrders: number;
    shippingOrders: number;
    writableReviews: number;
    waitingInquiries: number;
    insuranceCount: number;
    pointsBalance: number;
    pointsTransactionCount: number;
  };
  pointsTransactions: PointsTransaction[];
}

export default function OverviewSection({ stats, pointsTransactions }: OverviewSectionProps) {
  const pointSummary = stats.pointsTransactionCount > 0
    ? `거래 ${stats.pointsTransactionCount}건`
    : '사용 가능';
  const cards = [
    {
      id: 'points',
      label: '보유 적립금',
      value: stats.pointsBalance,
      suffix: '원',
      href: '/mypage?tab=orders',
      icon: Coins,
      description: pointSummary,
    },
    {
      id: 'orders',
      label: '진행 중 주문',
      value: stats.processingOrders,
      suffix: '건',
      href: '/mypage?tab=orders',
      icon: Package,
    },
    {
      id: 'shipping',
      label: '배송 중',
      value: stats.shippingOrders,
      suffix: '건',
      href: '/mypage?tab=orders',
      icon: Truck,
    },
    {
      id: 'reviews',
      label: '작성 가능 구매평',
      value: stats.writableReviews,
      suffix: '건',
      href: '/mypage?tab=reviews',
      icon: Star,
    },
    {
      id: 'inquiries',
      label: '답변 대기 문의',
      value: stats.waitingInquiries,
      suffix: '건',
      href: '/mypage?tab=inquiries',
      icon: MessageCircle,
    },
    {
      id: 'insurance',
      label: '보험 분석 진행',
      value: stats.insuranceCount,
      suffix: '건',
      href: '/mypage?tab=insurance',
      icon: Shield,
    },
  ];
  const recentTransactions = pointsTransactions.slice(0, 5);

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
              <p className="mt-1 font-editorial text-2xl font-bold text-[#18231F]">
                {card.value.toLocaleString()}{'suffix' in card ? card.suffix : ''}
              </p>
              {'description' in card && card.description && (
                <p className="mt-1 text-xs text-[#9AA19B]">{card.description}</p>
              )}
            </Link>
          );
        })}
      </div>
      <div className="mypage-card mt-6 p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#18231F]">최근 적립금 내역</h3>
            <p className="mt-1 text-sm text-[#68716C]">
              사용·복원·적립 흐름과 사용 후 잔액을 확인할 수 있습니다.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#B99562]">
            POINTS LEDGER
          </span>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="mt-5 divide-y divide-[#ECE7DC]">
            {recentTransactions.map((transaction) => {
              const isDebit = transaction.amount < 0;
              return (
                <div key={transaction.id} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#18231F]">{transaction.reason}</p>
                    <p className="mt-1 text-xs text-[#8A918C]">
                      {formatDate(transaction.createdAt)}
                      {transaction.orderId ? ` · 주문 ${transaction.orderId}` : ''}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className={`font-editorial text-lg font-bold ${isDebit ? 'text-[#9B4A3D]' : 'text-[#2F5D45]'}`}>
                      {isDebit ? '-' : '+'}{formatPrice(Math.abs(transaction.amount))}
                    </p>
                    <p className="mt-1 text-xs text-[#8A918C]">잔액 {formatPrice(transaction.balanceAfter)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-[#F8F6F0] px-5 py-6 text-sm text-[#68716C]">
            아직 적립금 사용 또는 적립 내역이 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}
