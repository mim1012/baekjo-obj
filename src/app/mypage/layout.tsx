'use client';

import { User } from 'lucide-react';
import MypageSidebar from '@/components/mypage/MypageSidebar';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function MypageLayout({ children }: { children: React.ReactNode }) {
  const { isAllowed, mounted, user } = useRoleGuard();

  if (!mounted || !isAllowed || !user) return null;

  const isPlaceholderEmail = user.email?.endsWith('@placeholder.baekjo') ?? false;
  const providerLabel = user.provider === 'kakao' ? '카카오' : user.provider === 'naver' ? '네이버' : null;

  return (
    <div className="bg-[#F8F6F0] min-h-dvh py-8 md:py-12">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <h1 className="text-2xl font-bold text-[#17251F] mb-6 md:mb-8">마이페이지</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          
          {/* Sidebar Area */}
          <div className="lg:col-span-1 space-y-4 md:space-y-6">
            <div className="bg-[#FFFEFB] p-5 md:p-6 rounded-sm shadow-sm border border-[#E2DACD] flex items-center gap-4">
              <div className="h-14 w-14 md:h-16 md:w-16 shrink-0 overflow-hidden rounded-full bg-[#F2EEE6] flex items-center justify-center text-[#16382D]">
                {user.profileImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profileImage} alt="프로필 사진" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-7 w-7 md:h-8 md:w-8" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-base md:text-lg font-bold text-[#17251F] flex items-center gap-2">
                  <span className="truncate">{user.companyName || user.name || '고객'}</span>
                </div>
                <div className="text-[11px] md:text-xs font-semibold text-[#B58A4C] mt-0.5">
                  {user.role === 'partner' ? '입점업체' : user.role === 'insurance' ? '보험사회원' : user.role === 'b2b' ? 'B2B회원' : '일반회원'}
                </div>
                <div className="text-xs text-[#6F756F] font-medium mt-1 truncate">
                  {isPlaceholderEmail ? '이메일 미등록' : user.email}
                </div>
                {providerLabel && (
                  <span className="mt-1.5 inline-block rounded-full bg-[#F2EEE6] px-2 py-0.5 text-[10px] font-semibold text-[#16382D]">
                    {providerLabel}
                  </span>
                )}
              </div>
            </div>

            <div className="lg:block">
              <MypageSidebar user={user} />
            </div>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6 md:space-y-8 pb-10">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
