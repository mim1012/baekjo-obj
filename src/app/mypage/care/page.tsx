'use client';

import { Briefcase } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

export default function MypageCarePage() {
  return (
    <div className="bg-[#FFFEFB] p-6 md:p-8 rounded-sm shadow-sm border border-[#E2DACD]">
      <h2 className="text-lg font-bold text-[#17251F] flex items-center mb-6">
        <Briefcase className="mr-2 h-5 w-5 text-[#16382D]" /> 맞춤 케어
      </h2>
      <EmptyState 
        title="맞춤 케어 정보가 아직 없습니다."
        description="맞춤 진단 설문을 완료하시면 AI 기반 케어 가이드를 제공해 드립니다."
        actionLabel="맞춤 진단 시작하기"
        actionHref="/diagnosis"
        compact
      />
    </div>
  );
}
