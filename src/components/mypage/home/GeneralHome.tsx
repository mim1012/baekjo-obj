'use client';

import { Package, Heart, Star, FileText } from 'lucide-react';
import Link from 'next/link';

export default function GeneralHome() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* 주문/배송 현황 등 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/mypage/orders" className="bg-[#FFFEFB] border border-[#E2DACD] rounded-sm p-4 md:p-6 text-center hover:border-[#16382D] transition-colors group">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#F2EEE6] flex items-center justify-center mb-3 group-hover:bg-[#16382D] group-hover:text-white transition-colors">
            <Package className="h-5 w-5 text-[#16382D] group-hover:text-white" />
          </div>
          <div className="text-xs md:text-sm text-[#6F756F]">진행 중 주문</div>
          <div className="text-xl md:text-2xl font-bold text-[#17251F] mt-1">0</div>
        </Link>
        <Link href="/mypage/wishlist" className="bg-[#FFFEFB] border border-[#E2DACD] rounded-sm p-4 md:p-6 text-center hover:border-[#16382D] transition-colors group">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#F2EEE6] flex items-center justify-center mb-3 group-hover:bg-[#16382D] group-hover:text-white transition-colors">
            <Heart className="h-5 w-5 text-[#16382D] group-hover:text-white" />
          </div>
          <div className="text-xs md:text-sm text-[#6F756F]">관심 상품</div>
          <div className="text-xl md:text-2xl font-bold text-[#17251F] mt-1">0</div>
        </Link>
        <Link href="/mypage/insurance" className="bg-[#FFFEFB] border border-[#E2DACD] rounded-sm p-4 md:p-6 text-center hover:border-[#16382D] transition-colors group">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#F2EEE6] flex items-center justify-center mb-3 group-hover:bg-[#16382D] group-hover:text-white transition-colors">
            <FileText className="h-5 w-5 text-[#16382D] group-hover:text-white" />
          </div>
          <div className="text-xs md:text-sm text-[#6F756F]">진행 중 보험분석</div>
          <div className="text-xl md:text-2xl font-bold text-[#17251F] mt-1">0</div>
        </Link>
        <Link href="/mypage/reviews" className="bg-[#FFFEFB] border border-[#E2DACD] rounded-sm p-4 md:p-6 text-center hover:border-[#16382D] transition-colors group">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#F2EEE6] flex items-center justify-center mb-3 group-hover:bg-[#16382D] group-hover:text-white transition-colors">
            <Star className="h-5 w-5 text-[#16382D] group-hover:text-white" />
          </div>
          <div className="text-xs md:text-sm text-[#6F756F]">작성 가능 후기</div>
          <div className="text-xl md:text-2xl font-bold text-[#17251F] mt-1">0</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/mypage/pets" className="bg-[#FFFEFB] p-6 rounded-sm border border-[#E2DACD] hover:bg-[#F8F6F0] transition-colors flex flex-col justify-center">
          <div className="font-bold text-[#17251F] mb-2 text-lg">반려동물 관리</div>
          <div className="text-sm text-[#6F756F]">우리 아이 정보를 업데이트하고 맞춤 추천을 받으세요.</div>
        </Link>
        <Link href="/mypage/care" className="bg-[#FFFEFB] p-6 rounded-sm border border-[#E2DACD] hover:bg-[#F8F6F0] transition-colors flex flex-col justify-center">
          <div className="font-bold text-[#17251F] mb-2 text-lg">맞춤 케어 바로가기</div>
          <div className="text-sm text-[#6F756F]">AI 기반의 1분 맞춤 진단을 시작해 보세요.</div>
        </Link>
      </div>
    </div>
  );
}
