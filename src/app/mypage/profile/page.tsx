'use client';

import { Settings } from 'lucide-react';
import { useMounted } from '@/lib/useMounted';
import { getCurrentUser } from '@/lib/storage';

export default function MypageProfilePage() {
  const mounted = useMounted();
  if (!mounted) return null;
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  return (
    <div className="bg-[#FFFEFB] p-6 md:p-8 rounded-sm shadow-sm border border-[#E2DACD]">
      <h2 className="text-lg font-bold text-[#17251F] flex items-center mb-6">
        <Settings className="mr-2 h-5 w-5 text-[#16382D]" /> 개인정보 수정
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs text-[#6F756F]">
          이름 (또는 담당자명)
          <input defaultValue={currentUser?.name ?? ''} className="mt-2 w-full border border-[#E2DACD] bg-[#FFFEFB] px-4 py-3 text-sm focus:border-[#16382D] focus:outline-none" />
        </label>
        <label className="text-xs text-[#6F756F]">
          연락처
          <input defaultValue={currentUser?.phone ?? ''} className="mt-2 w-full border border-[#E2DACD] bg-[#FFFEFB] px-4 py-3 text-sm focus:border-[#16382D] focus:outline-none" />
        </label>
        {currentUser.role === 'user' && (
          <>
            <label className="text-xs text-[#6F756F]">
              반려동물 품종
              <input defaultValue={currentUser?.breed ?? ''} className="mt-2 w-full border border-[#E2DACD] bg-[#FFFEFB] px-4 py-3 text-sm focus:border-[#16382D] focus:outline-none" />
            </label>
            <label className="text-xs text-[#6F756F]">
              주요 고민
              <input defaultValue={currentUser?.mainConcern ?? ''} className="mt-2 w-full border border-[#E2DACD] bg-[#FFFEFB] px-4 py-3 text-sm focus:border-[#16382D] focus:outline-none" />
            </label>
          </>
        )}
      </div>
      <button type="button" className="mt-8 min-h-11 bg-[#16382D] px-6 text-sm font-bold text-white transition-colors hover:bg-[#20493C]">
        변경사항 저장
      </button>
    </div>
  );
}
