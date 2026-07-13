import { Stethoscope, Utensils, Activity, Search, ShieldCheck, ListChecks, FileText, Info, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { listProducts } from '@/lib/products/repo';
import ProductCard from '@/components/common/ProductCard';

export const metadata = {
  title: '전문가 추천 | 백조오브제',
  description: '전문가 관점으로 살펴보는 상품 선택 기준을 확인하세요.',
};

export const dynamic = 'force-dynamic';

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = 'all' } = await searchParams;
  const products = await listProducts();
  
  const filteredProducts = products.filter(p => {
    if (!p.isRecommended) return false;
    if (filter === 'all') return true;
    if (filter === '수의 관점') return p.recommendedFor?.includes('veterinary') || p.category === '영양제' || p.category === '간식';
    if (filter === '영양 관점') return p.category === '사료' || p.category === '간식';
    if (filter === '행동·생활 관점') return p.category === '장난감' || p.category === '용품';
    return true;
  }).slice(0, 12);

  return (
    <div className="bg-[#FAF9F5] min-h-dvh pb-24 text-[#1A1D1B]" style={{ wordBreak: 'keep-all' }}>
      {/* 1. 전문가 추천 인트로 (박스 없음) */}
      <section className="pt-16 pb-12 overflow-hidden">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
           <div className="flex flex-col md:flex-row items-center relative">
              <div className="relative z-10 w-full md:w-[58%] pt-4 pb-6 md:py-0">
                 <p className="font-editorial text-[12px] tracking-widest text-[#A8742E] font-semibold uppercase mb-4">
                    Expert&apos;s View
                 </p>
                 <h1 className="text-[38px] md:text-[46px] font-bold text-[#1A1D1B] leading-[1.25] tracking-[-0.035em] break-keep mb-5">
                    전문가 관점으로 살펴보는<br />
                    상품 선택 기준
                 </h1>
                 <p className="text-[14px] md:text-[15px] text-[#5F6761] leading-[1.65] break-keep">
                    백조오브제가 수의·영양·행동 전문가의 관점을 바탕으로<br />
                    우리 아이에게 맞는 상품 선택 기준을 정리했습니다.
                 </p>
              </div>
              <div className="relative z-0 w-full md:w-[42%] flex justify-center md:justify-end mt-6 md:mt-0 h-[260px] md:h-[340px]">
                 {/* 우측 이미지 - 시안의 강아지 이미지 */}
                 <div className="relative w-full h-full max-w-[400px]">
                    {/* 이미지가 없을 경우를 대비한 구조. 실제 프로젝트에 전문가 이미지 에셋이 있다면 교체. 
                        현재 에셋이 확실치 않아 투명 배경의 강아지 이미지라고 가정합니다. */}
                    <Image src="/images/experts-dog.png" alt="전문가 추천 강아지" fill className="object-contain object-bottom" />
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* 2. 전문가 관점 카드 3개 */}
      <section className="mt-4">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 수의 관점 */}
            <div className="bg-white border border-[#EBE8E1] rounded-[24px] p-8 lg:p-10 flex flex-col items-center text-center shadow-sm">
              <div className="flex size-[64px] items-center justify-center rounded-full bg-[#FAF9F5] text-[#1A221E] mb-6 border border-[#F4F2EC]">
                <Stethoscope className="size-8" strokeWidth={1.5} />
              </div>
              <h2 className="text-[18px] font-bold text-[#1A1D1B] mb-3">수의 관점</h2>
              <p className="text-[14px] leading-[1.65] text-[#5F6761] mb-6 break-keep">
                건강 상태와 안전성을<br />
                중심으로 확인합니다.
              </p>
              <ul className="text-left text-[13px] leading-[2.2] text-[#5F6761] mb-10 w-full">
                <li className="flex gap-2"><span className="text-[#A8742E]">•</span> 대상 연령과 건강 상태</li>
                <li className="flex gap-2"><span className="text-[#A8742E]">•</span> 성분과 사용상 주의사항</li>
                <li className="flex gap-2"><span className="text-[#A8742E]">•</span> 질환·복용약과의 관계</li>
              </ul>
              <Link href="/experts?filter=수의+관점" scroll={false} className="mt-auto flex h-[46px] w-[80%] mx-auto items-center justify-center rounded-full bg-[#1A221E] text-[14px] font-bold text-white transition-colors hover:bg-black">
                수의 관점 상품 보기
              </Link>
            </div>

            {/* 영양 관점 */}
            <div className="bg-white border border-[#EBE8E1] rounded-[24px] p-8 lg:p-10 flex flex-col items-center text-center shadow-sm">
              <div className="flex size-[64px] items-center justify-center rounded-full bg-[#FAF9F5] text-[#1A221E] mb-6 border border-[#F4F2EC]">
                <Utensils className="size-8" strokeWidth={1.5} />
              </div>
              <h2 className="text-[18px] font-bold text-[#1A1D1B] mb-3">영양 관점</h2>
              <p className="text-[14px] leading-[1.65] text-[#5F6761] mb-6 break-keep">
                원료와 영양 균형을<br />
                꼼꼼하게 확인합니다.
              </p>
              <ul className="text-left text-[13px] leading-[2.2] text-[#5F6761] mb-10 w-full">
                <li className="flex gap-2"><span className="text-[#A8742E]">•</span> 주요 원료, 영양 성분</li>
                <li className="flex gap-2"><span className="text-[#A8742E]">•</span> 알레르기 유발 가능성</li>
                <li className="flex gap-2"><span className="text-[#A8742E]">•</span> 급여 목적과 영양 균형</li>
              </ul>
              <Link href="/experts?filter=영양+관점" scroll={false} className="mt-auto flex h-[46px] w-[80%] mx-auto items-center justify-center rounded-full bg-[#1A221E] text-[14px] font-bold text-white transition-colors hover:bg-black">
                영양 관점 상품 보기
              </Link>
            </div>

            {/* 행동·생활 관점 */}
            <div className="bg-white border border-[#EBE8E1] rounded-[24px] p-8 lg:p-10 flex flex-col items-center text-center shadow-sm">
              <div className="flex size-[64px] items-center justify-center rounded-full bg-[#FAF9F5] text-[#1A221E] mb-6 border border-[#F4F2EC]">
                <Activity className="size-8" strokeWidth={1.5} />
              </div>
              <h2 className="text-[18px] font-bold text-[#1A1D1B] mb-3">행동·생활 관점</h2>
              <p className="text-[14px] leading-[1.65] text-[#5F6761] mb-6 break-keep">
                생활 환경과 습관을<br />
                함께 고려합니다.
              </p>
              <ul className="text-left text-[13px] leading-[2.2] text-[#5F6761] mb-10 w-full">
                <li className="flex gap-2"><span className="text-[#A8742E]">•</span> 스트레스 완화에 도움</li>
                <li className="flex gap-2"><span className="text-[#A8742E]">•</span> 활동량과 생활 패턴</li>
                <li className="flex gap-2"><span className="text-[#A8742E]">•</span> 관리의 편의성과 지속성</li>
              </ul>
              <Link href="/experts?filter=행동·생활+관점" scroll={false} className="mt-auto flex h-[46px] w-[80%] mx-auto items-center justify-center rounded-full bg-[#1A221E] text-[14px] font-bold text-white transition-colors hover:bg-black">
                행동·생활 관점 상품 보기
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 상품 선정 과정 4단계 (시안처럼 투명/화이트 배경에 둥근 아이콘, 화살표) */}
      <section className="mt-20">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <h2 className="text-[20px] font-bold text-[#1A1D1B] mb-8">상품은 이렇게 살펴봅니다.</h2>
          <div className="flex flex-col md:flex-row items-center justify-between relative px-2">
            
            {[
              { icon: Search, title: '반려동물 상태 확인', num: '01' },
              { icon: ShieldCheck, title: '성분·원료 확인', num: '02' },
              { icon: ListChecks, title: '제조·사용 기준 확인', num: '03' },
              { icon: FileText, title: '실제 사용 목적과 적합성 정리', num: '04' }
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center gap-4 z-10 w-full md:w-[22%] py-4 md:py-0 relative">
                <div className="font-editorial text-[14px] font-semibold text-[#1A1D1B]">{step.num}</div>
                <div className="flex size-[64px] md:size-[72px] shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-[#EBE8E1] text-[#1A221E]">
                  <step.icon className="size-6 md:size-7 text-[#5F6761]" strokeWidth={1.5} />
                </div>
                <h3 className="text-[14px] md:text-[15px] font-bold text-[#1A1D1B] break-keep text-center leading-snug w-[70%]">{step.title}</h3>
                
                {/* 화살표 */}
                {idx < 3 && (
                   <div className="hidden md:block absolute right-[-15%] top-[50%] -translate-y-1/2 text-[#D8D6CE]">
                      <ArrowRight className="size-5" />
                   </div>
                )}
                {/* 모바일 화살표 */}
                {idx < 3 && (
                   <div className="md:hidden mt-2 text-[#D8D6CE]">
                      <ArrowRight className="size-5 rotate-90" />
                   </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. 추천 상품 섹션 */}
      <section className="mt-20 border-t border-[#EBE8E1] pt-16">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <h2 className="text-[20px] font-bold text-[#1A1D1B] mb-8">전문가 기준으로 엄선한 추천 상품</h2>
          
          {/* 필터 - 윤곽선 있는 알약 형태, 활성화시 짙은 녹색 */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
            {['all', '수의 관점', '영양 관점', '행동·생활 관점'].map((f) => {
              const isSelected = filter === f || (filter === 'all' && f === 'all');
              return (
                <Link
                  key={f}
                  href={f === 'all' ? '/experts' : `/experts?filter=${f}`}
                  scroll={false}
                  className={`flex h-[40px] shrink-0 items-center rounded-full border px-6 text-[14px] font-semibold whitespace-nowrap transition-colors ${
                    isSelected 
                      ? 'border-[#1A221E] bg-[#1A221E] text-white' 
                      : 'border-[#EBE8E1] bg-white text-[#5F6761] hover:border-[#D8D6CE] hover:text-[#1A1D1B]'
                  }`}
                >
                  {f === 'all' ? '전체' : f}
                </Link>
              )
            })}
          </div>

          {/* 상품 그리드 */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4 xl:gap-6">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#EBE8E1] bg-white h-[180px]">
              <Search className="size-8 text-[#D8D6CE] mb-3" />
              <p className="text-[#5F6761] text-[15px] font-medium">선택한 관점의 추천 상품이 없습니다.</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. 추천 기준 안내 CTA */}
      <section className="mt-16">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="bg-[#F4F2EC] rounded-[16px] p-6 md:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[#EBE8E1]">
            <div className="flex items-start gap-4">
              <div className="mt-0.5">
                 <ShieldCheck className="size-6 text-[#A8742E]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[14px] md:text-[15px] font-bold text-[#1A1D1B] mb-1 break-keep">
                  추천 결과는 반려동물의 상태와 사용 목적에 따라 달라질 수 있습니다.
                </p>
                <p className="text-[13px] text-[#5F6761] break-keep">
                  질환·복용 약·알레르기 등이 있는 경우 전문가 상담이 필요합니다.
                </p>
              </div>
            </div>
            <Link href="/concerns" className="shrink-0 w-full md:w-auto flex h-[44px] items-center justify-center rounded-full bg-white border border-[#EBE8E1] px-5 text-[13px] font-bold text-[#1A1D1B] transition-colors hover:bg-[#FAF9F5]">
              케어 가이드 더 보기
              <ArrowRight className="ml-2 size-4 text-[#5F6761]" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
