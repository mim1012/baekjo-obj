'use client';

import { FileSignature, FileKey, HelpCircle } from 'lucide-react';
import Link from 'next/link';

export default function PartnerHome() {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/mypage/application" className="bg-[#FFFEFB] border border-[#E2DACD] rounded-sm p-4 md:p-6 text-center hover:border-[#16382D] transition-colors group">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#F2EEE6] flex items-center justify-center mb-3 group-hover:bg-[#16382D] group-hover:text-white transition-colors">
            <FileSignature className="h-5 w-5 text-[#16382D] group-hover:text-white" />
          </div>
          <div className="text-sm font-bold text-[#17251F] mb-1">입점 신청 현황</div>
          <div className="text-xs text-[#6F756F]">승인 상태 및 정보 확인</div>
        </Link>
        <Link href="/mypage/documents" className="bg-[#FFFEFB] border border-[#E2DACD] rounded-sm p-4 md:p-6 text-center hover:border-[#16382D] transition-colors group">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#F2EEE6] flex items-center justify-center mb-3 group-hover:bg-[#16382D] group-hover:text-white transition-colors">
            <FileKey className="h-5 w-5 text-[#16382D] group-hover:text-white" />
          </div>
          <div className="text-sm font-bold text-[#17251F] mb-1">제출 서류</div>
          <div className="text-xs text-[#6F756F]">서류 보완 및 추가 제출</div>
        </Link>
        <Link href="/mypage/inquiries" className="bg-[#FFFEFB] border border-[#E2DACD] rounded-sm p-4 md:p-6 text-center hover:border-[#16382D] transition-colors group">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#F2EEE6] flex items-center justify-center mb-3 group-hover:bg-[#16382D] group-hover:text-white transition-colors">
            <HelpCircle className="h-5 w-5 text-[#16382D] group-hover:text-white" />
          </div>
          <div className="text-sm font-bold text-[#17251F] mb-1">최고관리자 문의</div>
          <div className="text-xs text-[#6F756F]">입점 관련 문의하기</div>
        </Link>
      </div>

      <div className="bg-[#FFFEFB] p-6 rounded-sm border border-[#E2DACD]">
        <h3 className="font-bold text-[#17251F] mb-4">최근 보완 요청</h3>
        <div className="text-sm text-[#6F756F] py-8 text-center bg-[#F8F6F0] rounded-sm">
          보완 요청 내역이 없습니다.
        </div>
      </div>
    </div>
  );
}
