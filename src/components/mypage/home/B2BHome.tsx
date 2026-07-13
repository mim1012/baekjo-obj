'use client';

import { Building2, Receipt, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function B2BHome() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/mypage/application" className="bg-[#FFFEFB] border border-[#E2DACD] rounded-sm p-4 md:p-6 text-center hover:border-[#16382D] transition-colors group">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#F2EEE6] flex items-center justify-center mb-3 group-hover:bg-[#16382D] group-hover:text-white transition-colors">
            <Building2 className="h-5 w-5 text-[#16382D] group-hover:text-white" />
          </div>
          <div className="text-sm font-bold text-[#17251F] mb-1">사업자 인증 현황</div>
          <div className="text-xs text-[#6F756F]">인증 상태 확인</div>
        </Link>
        <Link href="/mypage/requests" className="bg-[#FFFEFB] border border-[#E2DACD] rounded-sm p-4 md:p-6 text-center hover:border-[#16382D] transition-colors group">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#F2EEE6] flex items-center justify-center mb-3 group-hover:bg-[#16382D] group-hover:text-white transition-colors">
            <Receipt className="h-5 w-5 text-[#16382D] group-hover:text-white" />
          </div>
          <div className="text-sm font-bold text-[#17251F] mb-1">견적·주문 요청</div>
          <div className="text-xs text-[#6F756F]">요청 진행 상태 확인</div>
        </Link>
        <Link href="/mypage/inquiries" className="bg-[#FFFEFB] border border-[#E2DACD] rounded-sm p-4 md:p-6 text-center hover:border-[#16382D] transition-colors group">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#F2EEE6] flex items-center justify-center mb-3 group-hover:bg-[#16382D] group-hover:text-white transition-colors">
            <HelpCircle className="h-5 w-5 text-[#16382D] group-hover:text-white" />
          </div>
          <div className="text-sm font-bold text-[#17251F] mb-1">문의 내역</div>
          <div className="text-xs text-[#6F756F]">B2B 제휴 문의하기</div>
        </Link>
      </div>

      <div className="bg-[#FFFEFB] p-6 rounded-sm border border-[#E2DACD]">
        <h3 className="font-bold text-[#17251F] mb-4">최근 진행 중인 요청</h3>
        <div className="text-sm text-[#6F756F] py-8 text-center bg-[#F8F6F0] rounded-sm">
          진행 중인 견적·주문 요청이 없습니다.
        </div>
      </div>
    </div>
  );
}
