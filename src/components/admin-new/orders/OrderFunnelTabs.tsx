'use client';

import React from 'react';
import {
  FUNNEL_STAGE_ORDER,
  funnelBadgeLabel,
  type FunnelStage,
} from './orderFunnel';

export type FunnelTab = FunnelStage | '전체';

interface OrderFunnelTabsProps {
  active: FunnelTab;
  counts: Record<FunnelStage, number>;
  totalCount: number;
  onChange: (tab: FunnelTab) => void;
}

/**
 * 스마트스토어식 상태 탭 바 — 전체 + 단계별 건수. 이 탭이 목록의 1차 필터다(검색과 조합).
 * '기타'는 건수가 있을 때만 노출해 정상 주문이 전체 외 탭에서 사라지지 않게 한다.
 */
export default function OrderFunnelTabs({ active, counts, totalCount, onChange }: OrderFunnelTabsProps) {
  // FUNNEL_STAGE_ORDER 는 '기타'를 포함하지 않는다 — 기타는 건수가 있을 때만 뒤에 붙인다.
  const showEtc = counts['기타'] > 0;

  const tabs: { key: FunnelTab; label: string; count: number }[] = [
    { key: '전체', label: '전체', count: totalCount },
    ...FUNNEL_STAGE_ORDER.map((stage) => ({
      key: stage as FunnelTab,
      label: funnelBadgeLabel(stage),
      count: counts[stage],
    })),
    ...(showEtc ? [{ key: '기타' as FunnelTab, label: '기타', count: counts['기타'] }] : []),
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3" role="tablist" aria-label="주문 진행 단계">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
              isActive
                ? 'bg-[#2F3B34] text-white'
                : 'bg-[#F4F2EC] text-gray-600 hover:bg-[#EDEAE1]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`inline-flex items-center justify-center min-w-[18px] px-1 rounded-full text-[11px] font-semibold ${
                isActive ? 'bg-white/20 text-white' : 'bg-white text-gray-500'
              }`}
            >
              {tab.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
