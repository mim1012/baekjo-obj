'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Brand } from '@/types';
import BrandCard from '@/components/common/BrandCard';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';
import { ArrowRight, Leaf, ShieldCheck, Box, ThumbsUp, Recycle } from 'lucide-react';
import Image from 'next/image';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  brands: Brand[];
  initialSpotlightBrand?: Brand;
}

const PAGE_SIZE = 12;

const selectionStandards = [
  { icon: Leaf, title: '브랜드 철학', description: '아이의 행복을 최우선으로 하는가' },
  { icon: Box, title: '원료와 소재', description: '안전하고 신뢰할 수 있는가' },
  { icon: ShieldCheck, title: '제조와 유통', description: '투명하고 위생적인 과정을 거치는가' },
  { icon: ThumbsUp, title: '상품 & 사용자 경험', description: '사용 만족도와 경험이 우수한가' },
  { icon: Recycle, title: '지속 가능성', description: '환경과 사회에 긍정적인 영향을 주는가' },
];

const filterLabels: Record<string, string> = {
  all: '전체',
  recommended: '백조 추천',
  new: '새로 만난 브랜드',
};

function BrandsInner({ brands, initialSpotlightBrand }: Props) {
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter') || 'all';
  const { categorySettings } = useCategorySettings();
  const [pagination, setPagination] = useState({ filter: 'all', visibleCount: PAGE_SIZE });

  // Reset pagination if filter changes
  const visibleCount = pagination.filter === filter ? pagination.visibleCount : PAGE_SIZE;

  const visibleBrands = brands
    .filter((brand) => brand.isVisible !== false)
    .sort((a, b) => (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER));

  const filteredBrands = visibleBrands.filter((brand) => {
    if (filter === 'recommended') return brand.isRecommended;
    if (filter === 'new') return brand.isNew;
    return true;
  });

  const displayedBrands = filteredBrands.slice(0, visibleCount);
  const hasMore = visibleCount < filteredBrands.length;
  
  const recommendedSpotlightBrands = visibleBrands.filter((brand) => brand.isRecommended);
  const spotlightBrandsList = recommendedSpotlightBrands.length > 0 ? recommendedSpotlightBrands : visibleBrands.slice(0, 5);

  const [spotlightIndex, setSpotlightIndex] = useState(() => {
    if (initialSpotlightBrand && spotlightBrandsList.length > 0) {
      const idx = spotlightBrandsList.findIndex(b => b.id === initialSpotlightBrand.id);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const [isSpotlightHovered, setIsSpotlightHovered] = useState(false);

  useEffect(() => {
    if (spotlightBrandsList.length <= 1 || isSpotlightHovered) return;
    const timer = setInterval(() => {
      setSpotlightIndex(prev => (prev + 1) % spotlightBrandsList.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [spotlightBrandsList.length, isSpotlightHovered]);

  const spotlightBrand = spotlightBrandsList[spotlightIndex];

  const handleLoadMore = () => {
    setPagination({ filter, visibleCount: visibleCount + PAGE_SIZE });
  };

  const totalProducts = brands.reduce((acc, b) => acc + (b.representativeProductIds?.length || 0), 0);
  const categoryCount = new Set(brands.flatMap((b) => b.relatedConcernSlugs || [])).size;

  return (
    <main className="brand-page bg-[#FFFEFB] pb-16 md:pb-24">
      {/* 1. 브랜드관 히어로 */}
      <section className="bg-[#F7F4ED] pt-12 pb-14 md:pt-[64px] md:pb-[56px]">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12 flex flex-col md:flex-row items-center gap-12 md:gap-16">
          {/* Left Text */}
          <div className="flex-1 w-full md:w-[44%] max-w-[540px]">
            <span className="block text-[11px] lg:text-[12px] font-bold tracking-[0.12em] text-[#B68B4E] uppercase mb-3 md:mb-4">BRAND CURATION</span>
            <h1 className="text-[30px] sm:text-[34px] lg:text-[44px] font-bold leading-[1.18] tracking-[-0.035em] text-[#17231E] break-keep">
              좋은 선택은<br />
              브랜드를 이해하는<br />
              것부터<br />
              시작됩니다.
            </h1>
            <p className="mt-5 md:mt-[20px] lg:mt-[24px] max-w-[500px] text-[15px] lg:text-[16px] leading-[1.7] text-[#72766F] break-keep">
              백조오브제는 브랜드 철학과 제품 가치를 살피고<br className="hidden sm:block" />
              우리 아이의 일상에 오래 함께할 브랜드를 소개합니다.
            </p>

            {/* Stats */}
            <div className="mt-8 lg:mt-10 flex items-center gap-6 md:gap-8">
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[18px] lg:text-[20px] font-bold text-[#17251F]">{brands.length}곳</span>
                </div>
                <span className="text-[12px] font-medium text-[#6F756F]">검증 브랜드 수</span>
              </div>
              <div className="w-px h-8 lg:h-10 bg-[#D8C9B4]" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[18px] lg:text-[20px] font-bold text-[#17251F]">{totalProducts > 0 ? totalProducts : 18}개</span>
                </div>
                <span className="text-[12px] font-medium text-[#6F756F]">등록 상품 수</span>
              </div>
              <div className="w-px h-8 lg:h-10 bg-[#D8C9B4]" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[18px] lg:text-[20px] font-bold text-[#17251F]">{categoryCount > 0 ? categoryCount : 7}개</span>
                </div>
                <span className="text-[12px] font-medium text-[#6F756F]">케어 카테고리</span>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="flex-1 w-full md:w-[56%] relative">
             <div className="relative w-full aspect-[4/3] max-h-[410px] rounded-[24px] overflow-hidden bg-[#F2EDE4]">
                <Image src="/images/brand-curation-hero.webp" alt="Premium Pet Lifestyle" fill className="object-cover object-right" sizes="(max-width: 768px) 100vw, 56vw" priority />
             </div>
          </div>
        </div>
      </section>

      {/* 2. 백조오브제의 5가지 브랜드 오디트 기준 */}
      <section className="bg-[#F7F4ED] pb-16 md:pb-[72px]">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12 -mt-6 md:-mt-10 relative z-10">
          <div className="bg-[#FFFEFB] rounded-[20px] border border-[#E4DDD1] p-6 md:px-9 md:py-8 shadow-[0_4px_24px_rgba(23,37,31,0.04)]">
            <h2 className="text-[18px] md:text-[20px] font-bold text-[#17251F] mb-6 md:mb-8">
              백조오브제의 5가지 브랜드 오디트 기준
            </h2>
            <div className="flex flex-col md:flex-row gap-5 md:gap-0">
              {selectionStandards.map((item, idx) => (
                <div key={item.title} className={`flex-1 flex flex-col md:px-5 first:md:pl-0 last:md:pr-0 ${idx !== selectionStandards.length - 1 ? 'md:border-r md:border-[#E4DDD1] border-b pb-5 md:pb-0 md:border-b-0 border-[#E4DDD1]/60' : ''}`}>
                   <div className="flex items-center gap-3 mb-3 md:mb-4">
                      <span className="flex items-center justify-center text-[#B48A4A]">
                        <item.icon className="w-5 h-5 stroke-[2]" />
                      </span>
                      <h3 className="text-[15px] md:text-[16px] font-bold text-[#17251F]">{item.title}</h3>
                   </div>
                   <p className="text-[12px] md:text-[13px] text-[#6F756F] leading-[1.6] break-keep">
                     {item.description}
                   </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. 스포트라이트 브랜드 */}
      {spotlightBrand && (
        <section className="mb-16 md:mb-[72px]">
          <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
            <div 
              className="bg-[#FFFEFB] border border-[#D8C9B4] rounded-[20px] p-6 md:p-8 lg:p-10 flex min-h-[300px]"
              onMouseEnter={() => setIsSpotlightHovered(true)}
              onMouseLeave={() => setIsSpotlightHovered(false)}
            >
              <AnimatePresence mode="wait">
                <motion.div 
                  key={spotlightBrand.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col md:flex-row gap-8 lg:gap-12 items-center w-full"
                >
                  {/* Left Info */}
                  <div className="flex-1 md:w-[48%] flex flex-col justify-center h-full">
                    <span className="text-[12px] font-semibold text-[#B48A4A] mb-4">스포트라이트 브랜드</span>
                    <div className="flex flex-col gap-1 mb-5">
                      <h3 className="text-[24px] md:text-[28px] font-bold text-[#17251F] tracking-tight flex items-center gap-2">
                        {spotlightBrand.name} 
                      </h3>
                    </div>
                    <p className="text-[14px] md:text-[15px] leading-[1.7] text-[#6F756F] break-keep mb-8 max-w-[480px]">
                      {spotlightBrand.description}
                    </p>
                    <Link href={`/brands/${spotlightBrand.id}`} className="mt-auto self-start inline-flex items-center justify-center h-[42px] md:h-[46px] px-6 bg-[#17382D] text-white text-[13px] md:text-[14px] font-semibold rounded-md transition-colors hover:bg-[#10291F]">
                      브랜드 자세히 보기 <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </div>

                  {/* Right Products placeholder or logo block */}
                  <div className="flex-1 md:w-[52%] flex flex-col sm:flex-row gap-4 w-full h-[160px] md:h-[200px]">
                    <div className="w-full h-full flex justify-center items-center bg-[#FFFEFB] border border-[#E4DDD1] rounded-[16px]">
                       {spotlightBrand.logo ? (
                         <img src={spotlightBrand.logo} alt={spotlightBrand.name} className="h-16 md:h-20 object-contain" />
                       ) : (
                         <span className="text-[#6F756F] text-sm">브랜드 스토리 확인하기</span>
                       )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>
      )}

      {/* 4. 필터 및 정렬 */}
      <section className="mb-8 md:mb-10">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="overflow-x-auto pb-2 md:pb-0 -mx-5 px-5 md:mx-0 md:px-0 hide-scrollbar">
            <nav aria-label="브랜드 분류" className="flex flex-nowrap gap-2 min-w-max">
              {categorySettings.brandFilters.map((tab) => {
                const active = filter === tab.id || (filter === 'all' && tab.id === 'all');
                return (
                  <Link
                    key={tab.id}
                    href={tab.id === 'all' ? '/brands' : `/brands?filter=${tab.id}`}
                    scroll={false}
                    aria-current={active ? 'page' : undefined}
                    className={`flex h-[38px] md:h-[42px] items-center rounded-full px-[18px] text-[13px] md:text-[14px] font-semibold transition-colors duration-300 ${
                      active
                        ? 'bg-[#17382D] text-white border border-[#17382D]'
                        : 'bg-[#FFFEFB] text-[#6F756F] border border-[#E4DDD1] hover:bg-[#F7F4ED]'
                    }`}
                  >
                    {filterLabels[tab.id] ?? tab.label}
                    {tab.id === 'all' && ` (${filteredBrands.length})`}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="hidden md:flex items-center text-[13px] font-semibold text-[#17251F] cursor-pointer">
            브랜드 A-Z <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </section>

      {/* 5. 전체 브랜드 카드 그리드 */}
      <section className="mb-16 md:mb-[72px]">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          {displayedBrands.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {displayedBrands.map((brand) => (
                <BrandCard key={brand.id} brand={brand} variant="brand-page" />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-[16px] border border-dashed border-[#E4DDD1] bg-[#FFFEFB] px-6 py-16 text-center">
              <p className="break-keep text-[16px] font-semibold text-[#17251F]">조건에 맞는 브랜드가 없어요.</p>
              <p className="mt-2 break-keep text-[14px] leading-6 text-[#6F756F]">다른 브랜드 이야기도 천천히 둘러보세요.</p>
              <Link href="/brands" className="mt-6 inline-flex h-[44px] items-center rounded-full bg-[#F7F4ED] px-6 text-sm font-semibold text-[#17251F] transition-colors hover:bg-[#E4DDD1]">
                전체 브랜드 보기
              </Link>
            </div>
          )}
          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                className="inline-flex h-[48px] items-center rounded-full border border-[#E4DDD1] bg-[#FFFEFB] px-8 text-[15px] font-semibold text-[#17251F] transition-colors hover:bg-[#F7F4ED]"
              >
                더 보기
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 6. 브랜드 입점 안내 CTA */}
      <section>
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="bg-[#F7F4ED] border border-[#E4DDD1] rounded-[20px] overflow-hidden flex flex-col md:flex-row items-center h-auto md:h-[180px] lg:h-[200px]">
             {/* Left Image */}
             <div className="w-full md:w-[30%] h-[160px] md:h-full relative bg-[#E4DDD1]">
               <Image src="/images/poodle-pet-food.png" alt="프리미엄 펫푸드 제안" fill className="object-cover" sizes="(max-width: 768px) 100vw, 30vw" />
             </div>
             {/* Center Text */}
             <div className="w-full md:w-[45%] flex flex-col justify-center px-6 md:px-10 py-8 md:py-0 text-center md:text-left">
               <h3 className="text-[20px] md:text-[22px] font-bold text-[#17251F] mb-2 tracking-tight">
                 가치 있는 브랜드를 찾고 계신가요?
               </h3>
               <p className="text-[14px] md:text-[15px] text-[#6F756F] leading-[1.6]">
                 백조오브제의 기준에 함께할 브랜드를 기다립니다.<br className="hidden md:block" />
                 진정성 있는 브랜드라면 언제든 제안해주세요.
               </p>
             </div>
             {/* Right CTA */}
             <div className="w-full md:w-[25%] flex justify-center md:justify-end px-6 md:pr-10 pb-8 md:pb-0">
               <Link href="/landing/care-kit" className="inline-flex items-center justify-center h-[46px] px-6 bg-[#17382D] text-white text-[14px] font-semibold rounded-md transition-colors hover:bg-[#10291F] whitespace-nowrap">
                 브랜드 입점 제안하기 <ArrowRight className="ml-2 w-4 h-4" />
               </Link>
             </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function BrandsContent({ brands, initialSpotlightBrand }: Props) {
  return (
    <Suspense
      fallback={(
        <main className="brand-page bg-[#FFFEFB] min-h-[60dvh] pt-16 pb-20" aria-label="브랜드 목록을 불러오는 중">
          <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12 animate-pulse">
            <div className="h-[400px] w-full rounded-2xl bg-[#F7F4ED] mb-16" />
            <div className="h-[180px] w-full rounded-2xl bg-[#F7F4ED] mb-[72px]" />
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-[280px] rounded-2xl bg-[#F7F4ED]" />
              ))}
            </div>
          </div>
        </main>
      )}
    >
      <BrandsInner brands={brands} initialSpotlightBrand={initialSpotlightBrand} />
    </Suspense>
  );
}
