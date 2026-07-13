'use client';

import { Star } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

export default function MypageReviewsPage() {
  return (
    <div className="bg-[#FFFEFB] p-6 md:p-8 rounded-sm shadow-sm border border-[#E2DACD]">
      <h2 className="text-lg font-bold text-[#17251F] flex items-center mb-6">
        <Star className="mr-2 h-5 w-5 text-[#16382D]" /> 구매평 관리
      </h2>
      <EmptyState 
        title="작성한 구매평이 없습니다."
        description="상품을 구매하고 솔직한 후기를 남겨주세요."
        actionLabel="구매 가능한 상품 보기"
        actionHref="/shop"
        compact
      />
    </div>
  );
}
