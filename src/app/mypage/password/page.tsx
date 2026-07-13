'use client';

import { Lock } from 'lucide-react';
import PasswordChangeSection from '@/components/mypage/PasswordChangeSection';
import { useMounted } from '@/lib/useMounted';
import { getCurrentUser } from '@/lib/storage';

export default function MypagePasswordPage() {
  const mounted = useMounted();
  if (!mounted) return null;
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  if (currentUser.provider === 'kakao' || currentUser.provider === 'naver') {
    return (
      <div className="bg-[#FFFEFB] p-6 md:p-8 rounded-sm shadow-sm border border-[#E2DACD]">
        <h2 className="text-lg font-bold text-[#17251F] flex items-center mb-6">
          <Lock className="mr-2 h-5 w-5 text-[#16382D]" /> 비밀번호 변경
        </h2>
        <div className="py-10 text-center text-[#6F756F]">
          소셜 로그인으로 가입한 계정은 비밀번호를 변경할 수 없습니다.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFEFB] p-6 md:p-8 rounded-sm shadow-sm border border-[#E2DACD]">
      <h2 className="text-lg font-bold text-[#17251F] flex items-center mb-6">
        <Lock className="mr-2 h-5 w-5 text-[#16382D]" /> 비밀번호 변경
      </h2>
      <PasswordChangeSection />
    </div>
  );
}
