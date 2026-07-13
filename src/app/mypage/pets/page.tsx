'use client';

import { Heart } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

export default function MypagePetsPage() {
  return (
    <div className="bg-[#FFFEFB] p-6 md:p-8 rounded-sm shadow-sm border border-[#E2DACD]">
      <h2 className="text-lg font-bold text-[#17251F] flex items-center mb-6">
        <Heart className="mr-2 h-5 w-5 text-[#16382D]" /> 반려동물 관리
      </h2>
      <EmptyState 
        title="등록된 반려동물이 없습니다."
        description="사랑하는 반려동물 정보를 등록하고 맞춤 추천을 받아보세요."
        actionLabel="반려동물 등록하기"
        actionHref="#register"
        compact
      />
    </div>
  );
}
