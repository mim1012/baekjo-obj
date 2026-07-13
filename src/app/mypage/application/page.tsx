'use client';

import { FileSignature } from 'lucide-react';
import { useMounted } from '@/lib/useMounted';
import { getCurrentUser } from '@/lib/storage';
import ApplicationStatus from '@/components/mypage/ApplicationStatus';

export default function MypageApplicationPage() {
  const mounted = useMounted();
  if (!mounted) return null;
  const user = getCurrentUser();
  if (!user) return null;

  const appType = 
    user.role === 'partner' ? '입점 신청' : 
    user.role === 'insurance' ? '제휴 신청' : 
    '사업자 인증';

  return (
    <div className="space-y-8">
      <ApplicationStatus user={user} applicationType={appType} />
      
      <div className="bg-[#FFFEFB] p-6 md:p-8 rounded-sm shadow-sm border border-[#E2DACD]">
        <h2 className="text-lg font-bold text-[#17251F] flex items-center mb-6">
          <FileSignature className="mr-2 h-5 w-5 text-[#16382D]" /> 제출한 신청 정보
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div className="border border-[#E2DACD] p-4 bg-[#F8F6F0]">
            <p className="text-xs text-[#6F756F] mb-1">회사명</p>
            <p className="font-medium text-[#17251F]">{user.companyName || '-'}</p>
          </div>
          <div className="border border-[#E2DACD] p-4 bg-[#F8F6F0]">
            <p className="text-xs text-[#6F756F] mb-1">사업자등록번호</p>
            <p className="font-medium text-[#17251F]">{user.businessNumber || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
