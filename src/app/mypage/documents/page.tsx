'use client';

import { FileKey } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';

export default function MypageDocumentsPage() {
  return (
    <div className="bg-[#FFFEFB] p-6 md:p-8 rounded-sm shadow-sm border border-[#E2DACD]">
      <h2 className="text-lg font-bold text-[#17251F] flex items-center mb-6">
        <FileKey className="mr-2 h-5 w-5 text-[#16382D]" /> 제출 서류
      </h2>
      <EmptyState 
        title="제출한 서류가 없습니다."
        description="가입 및 인증에 필요한 서류를 업로드해 주세요."
        actionLabel="서류 업로드"
        actionHref="#upload"
        compact
      />
    </div>
  );
}
