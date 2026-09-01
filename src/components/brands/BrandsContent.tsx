'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Brand } from '@/types';
import BrandCard from '@/components/common/BrandCard';
import BrandLogo from '@/components/common/BrandLogo';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';
import { ArrowRight, Leaf, ShieldCheck, Box, ThumbsUp, Recycle } from 'lucide-react';
import Image from 'next/image';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatBrandDisplayName, getBrandPresentation } from '@/lib/brands/presentation';

interface Props {
  brands: Brand[];
  productCounts: Record<string, number>;
  initialSpotlightBrand?: Brand;
  content: BrandsPageContent;
}

export interface BrandsPageContent {
  hero: { eyebrow: string; title: string; description: string; image: string; imageAlt: string; countLabel: string; countSuffix: string };
  standards: { visible: boolean; title: string; items: Array<{ title: string; description: string; visible: boolean }> };
  spotlight: { visible: boolean; label: string; buttonLabel: string; fallbackText: string };
  catalog: { sortDefaultLabel: string; sortAzLabel: string; loadMoreLabel: string };
  empty: { title: string; description: string; buttonLabel: string };
  partnership: { visible: boolean; title: string; description: string; image: string; imageAlt: string; buttonLabel: string; buttonHref: string };
}

const PAGE_SIZE = 12;

const standardIcons = [Leaf, Box, ShieldCheck, ThumbsUp, Recycle];

// 현재 고객 홈페이지에 확정된 필터 표기. 관리자 연결 작업만으로 화면 문구가 바뀌지 않게 유지한다.
const filterLabels: Record<string, string> = {
  all: '전체',
  recommended: '백조오브제 추천',
  new: '새로 만난 브랜드',
};

function getCustomBrandDetails(brand: Brand) {
  const presentation = getBrandPresentation(brand);
  return {
    finalName: formatBrandDisplayName(brand.name),
    finalDescription: presentation.cardDescription,
  };
}

function BrandsInner({ brands, productCounts, initialSpotlightBrand, content }: Props) {
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter') || 'all';
  const sort = searchParams.get('sort') === 'az' ? 'az' : 'default';
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
  }).sort((a, b) => (sort === 'az' ? a.name.localeCompare(b.name, 'ko') : 0));

  const makeHref = (nextFilter: string, nextSort = sort) => {
    const next = new URLSearchParams();
    if (nextFilter !== 'all') next.set('filter', nextFilter);
    if (nextSort === 'az') next.set('sort', 'az');
    const query = next.toString();
    return query ? `/brands?${query}` : '/brands';
  };

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
  const spotlightCustomDetails = spotlightBrand ? getCustomBrandDetails(spotlightBrand) : null;

  const handleLoadMore = () => {
    setPagination({ filter, visibleCount: visibleCount + PAGE_SIZE });
  };


  return (
    <main className="brand-page bg-[#FFFEFB] pb-16 md:pb-24">
      {/* 1. 브랜드관 히어로 */}
      <section data-testid="brands-hero" className="relative h-[640px] w-full overflow-hidden bg-[#EDE5D8] sm:h-[620px] md:h-[480px] lg:h-[520px] xl:h-[560px]">
        {content.hero.image && <Image
          src={content.hero.image}
          alt={content.hero.imageAlt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-[72%_center] md:object-center"
          data-testid="brands-hero-image"
        />}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(249,246,239,0.82)_0%,rgba(249,246,239,0.64)_54%,rgba(249,246,239,0.08)_76%,rgba(249,246,239,0)_100%)] md:bg-[linear-gradient(90deg,rgba(249,246,239,0.68)_0%,rgba(249,246,239,0.34)_44%,rgba(249,246,239,0)_64%)]"
        />

        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1280px] items-start px-5 pb-8 pt-20 md:items-center md:px-8 md:py-10 lg:px-12 xl:px-14">
          <div className="flex w-full max-w-[540px] flex-col items-start md:w-[52%] md:min-w-[430px]">
            <span className="mb-3 block text-[11px] font-bold uppercase tracking-[0.12em] text-[#7A4E1D] md:mb-4 lg:text-[12px]">{content.hero.eyebrow}</span>
            <h1 className="break-keep text-[30px] font-bold leading-[1.2] tracking-[-0.035em] text-[#17231E] md:text-[34px] lg:text-[44px] lg:leading-[1.18]">
              {content.hero.title.split('\n').map((line, index) => <span key={`${line}-${index}`}>{index > 0 && <br className="hidden md:block" />}{line}</span>)}
            </h1>
            <p className="mt-4 max-w-[500px] break-keep text-[14px] leading-[1.7] text-[#59615B] md:mt-5 md:text-[15px] lg:mt-6 lg:text-[16px]">
              {content.hero.description}
            </p>
            <div className="mt-5 flex items-baseline gap-2 md:mt-6 lg:mt-7">
              <span className="text-[18px] font-bold text-[#17251F] lg:text-[20px]">{brands.length}{content.hero.countSuffix}</span>
              <span className="text-[12px] font-medium text-[#59615B]">{content.hero.countLabel}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 백조오브제의 5가지 브랜드 오디트 기준 */}
      {content.standards.visible && <section className="bg-[#F7F4ED] pb-16 md:pb-[72px]">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12 -mt-6 md:-mt-10 relative z-10">
          <div className="bg-[#FFFEFB] rounded-[20px] border border-[#E4DDD1] p-6 md:px-9 md:py-8 shadow-[0_4px_24px_rgba(23,37,31,0.04)]">
            <h2 className="text-[18px] md:text-[20px] font-bold text-[#17251F] mb-6 md:mb-8 tracking-[0.08em]">
              {content.standards.title}
            </h2>
            <div className="flex flex-row overflow-x-auto snap-x snap-mandatory hide-scrollbar gap-4 md:gap-0 pb-4 md:pb-0">
              {content.standards.items.filter((item) => item.visible).map((item, idx) => {
                const Icon = standardIcons[idx % standardIcons.length];
                return (
                <div key={item.title} className={`w-[70vw] sm:w-[280px] shrink-0 snap-start flex flex-col p-5 bg-[#F7F4ED] rounded-xl md:w-auto md:shrink md:flex-1 md:bg-transparent md:p-0 md:rounded-none md:px-5 first:md:pl-0 last:md:pr-0 ${idx !== content.standards.items.filter((standard) => standard.visible).length - 1 ? 'md:border-r md:border-[#E4DDD1]' : ''}`}>
                   <div className="flex items-center gap-3 mb-3 md:mb-4">
                      <span className="flex items-center justify-center text-[#B48A4A]">
                        <Icon className="w-5 h-5 stroke-[2]" />
                      </span>
                      <h3 className="text-[15px] md:text-[16px] font-bold text-[#17251F]">{item.title}</h3>
                   </div>
                   <p className="text-[12px] md:text-[13px] text-[#6F756F] leading-[1.6] break-keep">
                     {item.description}
                   </p>
                </div>
              )})}
            </div>
          </div>
        </div>
      </section>}

      {/* 3. 스포트라이트 브랜드 */}
      {content.spotlight.visible && spotlightBrand && (
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
                    <span className="text-[12px] font-semibold text-[#B48A4A] mb-4">{content.spotlight.label}</span>
                    <div className="flex flex-col gap-1 mb-5">
                      <h3 className="text-[24px] md:text-[28px] font-bold text-[#17251F] tracking-tight flex items-center gap-2">
                        {spotlightCustomDetails?.finalName || spotlightBrand.name} 
                      </h3>
                    </div>
                    <p className="text-[14px] md:text-[15px] leading-[1.7] text-[#6F756F] break-keep mb-8 max-w-[480px]">
                      {spotlightCustomDetails?.finalDescription || spotlightBrand.description}
                    </p>
                    <Link href={`/brands/${spotlightBrand.slug}`} className="mt-auto self-start inline-flex items-center justify-center h-[42px] md:h-[46px] px-6 bg-[#17382D] text-white text-[13px] md:text-[14px] font-semibold rounded-md transition-colors hover:bg-[#10291F]">
                      {content.spotlight.buttonLabel} <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                  </div>

                  {/* Right Products placeholder or logo block */}
                  <div className="flex-1 md:w-[52%] flex flex-col sm:flex-row gap-4 w-full h-[160px] md:h-[200px]">
                    <div className="w-full h-full flex justify-center items-center bg-[#FFFEFB] border border-[#E4DDD1] rounded-[16px]">
                       {spotlightBrand.logo ? (
                         <BrandLogo brand={spotlightBrand} size="md" surface={false} uniformScale />
                       ) : (
                         <span className="text-[#6F756F] text-sm">{content.spotlight.fallbackText}</span>
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
          <div className="overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <nav aria-label="브랜드 분류" className="flex flex-nowrap gap-2 min-w-max">
              {categorySettings.brandFilters.map((tab) => {
                const active = filter === tab.id || (filter === 'all' && tab.id === 'all');
                return (
                  <Link
                    key={tab.id}
                    href={makeHref(tab.id)}
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
          <Link
            href={makeHref(filter, sort === 'az' ? 'default' : 'az')}
            scroll={false}
            aria-pressed={sort === 'az'}
            className="hidden md:flex items-center rounded-full px-3 py-2 text-[13px] font-semibold text-[#17251F] transition-colors hover:bg-[#F7F4ED]"
          >
            {sort === 'az' ? content.catalog.sortDefaultLabel : content.catalog.sortAzLabel}
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </Link>
        </div>
      </section>

      {/* 5. 전체 브랜드 카드 그리드 */}
      <section className="mb-16 md:mb-[72px]">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          {displayedBrands.length > 0 ? (
            <div data-testid="brand-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {displayedBrands.map((brand) => (
                <BrandCard key={brand.id} brand={brand} productCount={productCounts[brand.id] ?? 0} variant="brand-page" />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-[16px] border border-dashed border-[#E4DDD1] bg-[#FFFEFB] px-6 py-16 text-center">
              <p className="break-keep text-[16px] font-semibold text-[#17251F]">{content.empty.title}</p>
              <p className="mt-2 break-keep text-[14px] leading-6 text-[#6F756F]">{content.empty.description}</p>
              <Link href="/brands" className="mt-6 inline-flex h-[44px] items-center rounded-full bg-[#F7F4ED] px-6 text-sm font-semibold text-[#17251F] transition-colors hover:bg-[#E4DDD1]">
                {content.empty.buttonLabel}
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
                {content.catalog.loadMoreLabel}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 6. 브랜드 입점 안내 CTA */}
      {content.partnership.visible && <section>
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="bg-[#F7F4ED] border border-[#E4DDD1] rounded-[20px] overflow-hidden flex flex-col md:flex-row items-center h-auto md:h-[180px] lg:h-[200px]">
             {/* Left Image */}
             <div className="w-full md:w-[28%] lg:w-[24%] h-[160px] md:h-full relative bg-[#E4DDD1]">
               {content.partnership.image && <Image src={content.partnership.image} alt={content.partnership.imageAlt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 30vw" />}
             </div>
             {/* Center Text */}
             <div className="w-full md:flex-1 flex flex-col justify-center px-6 md:px-10 py-8 md:py-0 text-center md:text-left">
               <h3 className="text-[20px] md:text-[22px] font-bold text-[#17251F] mb-2 tracking-tight">
                 {content.partnership.title}
               </h3>
               <p className="text-[14px] md:text-[15px] text-[#6F756F] leading-[1.6] break-keep">
                 {content.partnership.description.split('\n').map((line, index) => <span key={`${line}-${index}`} className="inline-block xl:whitespace-nowrap">{index > 0 && <br className="hidden lg:block" />}{line}</span>)}
               </p>
               <Link href={content.partnership.buttonHref} className="mt-5 inline-flex h-[46px] self-center items-center justify-center whitespace-nowrap rounded-md bg-[#17382D] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#10291F] md:self-start">
                 {content.partnership.buttonLabel} <ArrowRight className="ml-2 w-4 h-4" />
               </Link>
             </div>
          </div>
        </div>
      </section>}
    </main>
  );
}

export default function BrandsContent({ brands, productCounts, initialSpotlightBrand, content }: Props) {
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
      <BrandsInner brands={brands} productCounts={productCounts} initialSpotlightBrand={initialSpotlightBrand} content={content} />
    </Suspense>
  );
}
