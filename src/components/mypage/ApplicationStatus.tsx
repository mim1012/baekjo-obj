'use client';

import { FileCheck } from 'lucide-react';
import { formatDate } from '@/lib/format';
import type { User } from '@/types';

interface Props {
  user: User;
  applicationType: string;
}

export default function ApplicationStatus({ user, applicationType }: Props) {
  const statusLabels: Record<string, string> = {
    pending: '승인 대기',
    active: '승인 완료',
    rejected: '반려',
    inactive: '비활성'
  };

  const status = user.status || 'pending';

  return (
    <div className="bg-[#FFFEFB] rounded-sm shadow-sm border border-[#E2DACD] p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#17251F] flex items-center">
          <FileCheck className="mr-2 h-5 w-5 text-[#16382D]" />
          {applicationType} 상태
        </h3>
        <span className={`px-4 py-1.5 rounded-full text-sm font-bold
          ${status === 'active' ? 'bg-[#237A57]/10 text-[#237A57]' : 
            status === 'rejected' ? 'bg-[#B44A44]/10 text-[#B44A44]' : 
            'bg-[#F2EEE6] text-[#6F756F]'}`}
        >
          {statusLabels[status] || '상태 알 수 없음'}
        </span>
      </div>
      <div className="space-y-4 text-sm">
        <div className="flex justify-between py-2 border-b border-[#F8F6F0]">
          <span className="text-[#6F756F]">가입일 (신청일)</span>
          <span className="font-medium text-[#17251F]">{user.createdAt ? formatDate(user.createdAt) : '-'}</span>
        </div>
        <div className="flex justify-between py-2 border-b border-[#F8F6F0]">
          <span className="text-[#6F756F]">서류 제출 상태</span>
          <span className="font-medium text-[#17251F]">제출 완료</span>
        </div>
      </div>
    </div>
  );
}
