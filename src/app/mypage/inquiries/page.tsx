'use client';

import { HelpCircle } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

export default function MypageInquiriesPage() {
  return (
    <div className="bg-[#FFFEFB] p-6 md:p-8 rounded-sm shadow-sm border border-[#E2DACD]">
      <h2 className="text-lg font-bold text-[#17251F] flex items-center mb-6">
        <HelpCircle className="mr-2 h-5 w-5 text-[#16382D]" /> 문의 내역
      </h2>
      <EmptyState 
        title="문의 내역이 없습니다."
        description="궁금하신 점이나 제휴 관련 문의를 남겨주세요."
        actionLabel="새 문의 작성하기"
        actionHref="#new-inquiry"
        compact
      />
    </div>
  );
}
