import Link from 'next/link';
import { Bell, Search, ChevronLeft, ChevronRight, Headset, ArrowRight } from 'lucide-react';
import { notices } from '@/data/notices';
import { formatDate } from '@/lib/format';

export const metadata = {
  title: '백조 소식 | 백조오브제',
  description: '백조오브제의 새로운 소식과 이벤트, 서비스 안내를 확인하세요.',
};

export default function NoticesPage() {
  const importantNotices = [
    { id: 'i1', title: '[배송 지연 안내] 설 연휴 기간 배송 일정 안내', date: '2024.06.01' },
    { id: 'i2', title: '개인정보처리방침 개정 안내', date: '2024.05.28' },
    { id: 'i3', title: '포인트 정책 변경 안내', date: '2024.05.20' },
  ];

  return (
    <div className="bg-[#FAF9F5] min-h-dvh pb-24 text-[#1A1D1B]" style={{ wordBreak: 'keep-all' }}>
      {/* 1. 인트로 (박스 없음) */}
      <section className="pt-16 pb-10">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12 flex flex-col md:flex-row items-start md:items-center justify-between">
          <div>
            <p className="font-editorial text-[12px] tracking-widest text-[#A8742E] font-semibold uppercase mb-4">
              Baekjo Notice
            </p>
            <h1 className="text-[34px] md:text-[42px] font-bold text-[#1A1D1B] leading-[1.25] tracking-[-0.035em] break-keep mb-4">
              공지사항
            </h1>
            <p className="text-[14px] md:text-[15px] text-[#5F6761] leading-[1.65]">
              백조오브제의 새로운 소식과 이벤트를 안내해 드립니다.
            </p>
          </div>
          <div className="mt-6 md:mt-0 flex items-center gap-3">
             <Bell className="size-6 text-[#1A1D1B]" strokeWidth={1.5} />
             <span className="text-[15px] font-bold text-[#1A1D1B]">전체 공지 {notices.length}건</span>
          </div>
        </div>
      </section>

      {/* 2. 중요 공지 섹션 */}
      <section className="mb-14">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="flex items-center justify-between mb-5">
             <h2 className="text-[18px] font-bold text-[#1A1D1B]">중요 공지</h2>
             <Link href="/notices?type=important" className="text-[14px] text-[#5F6761] font-semibold flex items-center hover:text-[#1A1D1B]">
                전체 더보기 <ChevronRight className="ml-1 size-4" />
             </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
             {importantNotices.map((notice) => (
                <div key={notice.id} className="bg-[#FAF9F5] rounded-[16px] border border-[#EBE8E1] p-6 flex flex-col hover:border-[#D8D6CE] transition-colors cursor-pointer bg-white">
                   <div className="flex items-center gap-2 mb-3">
                      <span className="inline-flex items-center justify-center h-[24px] px-3 rounded-full bg-[#E54D4D] text-[12px] font-bold text-white tracking-wide">중요</span>
                   </div>
                   <h3 className="text-[15px] font-bold text-[#1A1D1B] leading-[1.4] mb-8 break-keep flex-grow">
                      {notice.title}
                   </h3>
                   <span className="text-[13px] text-[#8C938F]">{notice.date}</span>
                </div>
             ))}
          </div>
        </div>
      </section>

      {/* 3. 필터 및 검색 */}
      <section className="mb-6">
         <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-hide">
               {['전체', '공지', '이벤트', '배송', '세일', '브랜드'].map((cat, idx) => (
                  <button 
                     key={idx} 
                     className={`shrink-0 h-[36px] px-5 rounded-full text-[14px] font-medium transition-colors ${idx === 0 ? 'bg-[#1A1D1B] text-white' : 'bg-white border border-[#EBE8E1] text-[#5F6761] hover:text-[#1A1D1B]'}`}
                  >
                     {cat}
                  </button>
               ))}
            </div>
            
            <div className="relative w-full lg:w-[320px]">
               <input 
                  type="text" 
                  placeholder="제목 또는 내용을 입력하세요." 
                  className="w-full h-[40px] pl-5 pr-10 rounded-full border border-[#EBE8E1] bg-white text-[14px] outline-none focus:border-[#1A1D1B] transition-colors placeholder:text-[#D8D6CE]"
               />
               <Search className="absolute right-4 top-1/2 -translate-y-1/2 size-4 text-[#8C938F]" />
            </div>
         </div>
      </section>

      {/* 4. 리스트 영역 (박스 없음, 선형 테이블) */}
      <section className="mb-16">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          {/* 데스크탑 헤더 */}
          <div className="hidden lg:grid grid-cols-[60px_100px_minmax(0,1fr)_100px_120px_80px] items-center border-t border-b border-[#EBE8E1] py-4 text-[14px] font-bold text-[#5F6761] text-center">
            <div>No</div>
            <div>분류</div>
            <div className="text-left pl-4">제목</div>
            <div>작성자</div>
            <div>작성일</div>
            <div>조회수</div>
          </div>
          
          <ul className="divide-y divide-[#EBE8E1] border-b border-[#EBE8E1]">
            {notices.map((notice, index) => (
              <li key={notice.id}>
                <Link href={`/notices/${notice.id}`} title={notice.title} className="group block py-5 md:py-6 transition-colors hover:bg-white/50">
                  {/* 모바일 뷰 */}
                  <div className="lg:hidden">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className={`inline-flex h-[24px] items-center justify-center rounded-full border px-3 text-[12px] font-bold ${notice.category === 'event' ? 'border-[#A8742E] text-[#A8742E] bg-[#FAF9F5]' : 'border-[#EBE8E1] bg-white text-[#5F6761]'}`}>
                        {notice.category === 'notice' ? '공지' : notice.category === 'event' ? '이벤트' : notice.category === 'brand' ? '브랜드' : '소식'}
                      </span>
                      <time className="text-[13px] text-[#8C938F]">{formatDate(notice.date)}</time>
                    </div>
                    <h2 className="text-[15px] font-bold leading-[1.5] text-[#1A1D1B] break-keep mb-3">
                      {notice.title}
                    </h2>
                    <div className="flex items-center gap-3 text-[13px] text-[#8C938F]">
                      <span>관리자</span>
                      <span className="w-1 h-1 rounded-full bg-[#D8D6CE]" />
                      <span>조회수 {notice.views}</span>
                    </div>
                  </div>

                  {/* 데스크탑 뷰 */}
                  <div className="hidden lg:grid grid-cols-[60px_100px_minmax(0,1fr)_100px_120px_80px] items-center text-center">
                    <div className="text-[14px] text-[#8C938F] font-editorial">{notices.length - index}</div>
                    <div className="flex justify-center">
                      <span className={`inline-flex h-[26px] items-center justify-center rounded-full border px-3 text-[12px] font-bold ${notice.category === 'event' ? 'border-[#A8742E] text-[#A8742E] bg-[#FAF9F5]' : 'border-[#EBE8E1] bg-white text-[#5F6761]'}`}>
                        {notice.category === 'notice' ? '공지' : notice.category === 'event' ? '이벤트' : notice.category === 'brand' ? '브랜드' : '소식'}
                      </span>
                    </div>
                    <div className="min-w-0 pl-4 pr-8 text-left">
                      <h2 className="truncate text-[15px] font-bold text-[#1A1D1B] group-hover:underline underline-offset-4">
                        {notice.title}
                      </h2>
                    </div>
                    <div className="text-[14px] text-[#5F6761]">관리자</div>
                    <time className="text-[14px] text-[#8C938F]">{formatDate(notice.date)}</time>
                    <div className="text-[14px] text-[#5F6761]">{notice.views}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* 페이지네이션 */}
          <div className="mt-12 flex justify-center items-center gap-1">
            <button className="flex size-8 items-center justify-center rounded border border-[#EBE8E1] text-[#8C938F] hover:text-[#1A1D1B]">
              <ChevronLeft className="size-4" />
            </button>
            {[1, 2, 3, 4, 5, 6, 7].map((page) => (
              <button key={page} className={`flex size-8 items-center justify-center rounded text-[14px] font-medium transition-colors ${page === 1 ? 'bg-[#1A1D1B] text-white' : 'text-[#5F6761] hover:text-[#1A1D1B]'}`}>
                {page}
              </button>
            ))}
            <button className="flex size-8 items-center justify-center rounded border border-[#EBE8E1] text-[#8C938F] hover:text-[#1A1D1B]">
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. Bottom CTA */}
      <section>
         <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
            <div className="bg-[#F4F2EC] rounded-[24px] border border-[#EBE8E1] p-10 md:p-14 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 relative overflow-hidden">
               <div className="flex flex-col items-center md:items-start text-center md:text-left relative z-10">
                  <div className="mb-4">
                     <Headset className="size-8 text-[#1A1D1B]" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-[20px] md:text-[24px] font-bold text-[#1A1D1B] mb-3 break-keep">찾으시는 안내가 없나요?</h2>
                  <p className="text-[14px] md:text-[15px] text-[#5F6761] break-keep">
                     자주 묻는 질문에서 원하시는 정보를 빠르게 확인하시거나<br className="hidden md:block" /> 1:1 문의를 남겨주세요.
                  </p>
               </div>
               
               <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto md:ml-10">
                  <Link href="/customer/faq" className="flex h-[48px] items-center justify-center rounded-full bg-[#1A1D1B] px-8 text-[14px] font-bold text-white transition-colors hover:bg-black">
                     자주 묻는 질문 보기
                     <ArrowRight className="ml-2 size-4" />
                  </Link>
                  <Link href="/customer/inquiry" className="flex h-[48px] items-center justify-center rounded-full bg-white border border-[#EBE8E1] px-8 text-[14px] font-bold text-[#1A1D1B] transition-colors hover:bg-[#FAF9F5]">
                     1:1 문의하기
                     <ArrowRight className="ml-2 size-4" />
                  </Link>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}
