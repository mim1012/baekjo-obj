import React from 'react';
import { funnelBadgeLabel, type FunnelStage } from './orderFunnel';

/**
 * 주문 목록의 복합 상태 배지 — 3축(주문·결제·배송)을 접은 단일 진행 단계를 어스톤 칩으로 표기한다.
 * §6 도메인 규칙: 어스톤/모노톤만, 쨍한 원색 금지(취소반품도 red-600 대신 muted clay).
 */
const STAGE_CHIP_CLASS: Record<FunnelStage, string> = {
  입금대기: 'bg-[#F3E7D3] text-[#8A6A3A]',
  결제진행중: 'bg-gray-100 text-gray-600',
  발송대기: 'bg-[#EFEBE1] text-[#7A6A48]',
  배송중: 'bg-[#E4EAE4] text-[#3B5140]',
  배송완료: 'bg-[#2F3B34] text-white',
  취소반품: 'bg-[#E7DDDA] text-[#6B4A44]',
  기타: 'bg-gray-100 text-gray-500',
};

export default function OrderFunnelBadge({ stage }: { stage: FunnelStage }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium ${STAGE_CHIP_CLASS[stage]}`}
    >
      {funnelBadgeLabel(stage)}
    </span>
  );
}
