'use client';

import { Receipt } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

export default function MypageRequestsPage() {
  return (
    <div className="bg-[#FFFEFB] p-6 md:p-8 rounded-sm shadow-sm border border-[#E2DACD]">
      <h2 className="text-lg font-bold text-[#17251F] flex items-center mb-6">
        <Receipt className="mr-2 h-5 w-5 text-[#16382D]" /> 견적·주문 요청
      </h2>
      <EmptyState 
        title="요청 내역이 없습니다."
        description="대량 구매 및 B2B 케어키트 견적을 요청해 보세요."
        actionLabel="견적 요청하기"
        actionHref="/landing/care-kit"
        compact
      />
    </div>
  );
}
