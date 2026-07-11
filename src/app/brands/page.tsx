'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import BrandCard from '@/components/common/BrandCard';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';
import { brands } from '@/data/brands';

const PAGE_SIZE = 12;

const selectionStandards = [
  { number: '01', title: '브랜드 철학', description: '아이와 보호자를 바라보는 마음' },
  { number: '02', title: '원료와 소재', description: '무엇으로 만들었는지' },
  { number: '03', title: '제조와 유통', description: '어떻게 만들고 전하는지' },
  { number: '04', title: '생활 속 사용성', description: '매일 편안하게 쓸 수 있는지' },
  { number: '05', title: '확인 기록', description: '새로운 정보도 꾸준히 반영하는지' },
];

const filterLabels: Record<string, string> = {
  all: '모든 브랜드',
  recommended: '백조 추천',
  new: '새로 만난 브랜드',
};

function BrandsContent() {
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

  const handleLoadMore = () => {
    setPagination({ filter, visibleCount: visibleCount + PAGE_SIZE });
  };

  return (
    <main className="brand-page pb-14 md:pb-20">
      {/* 1. 컴팩트한 브랜드관 인트로 */}
      <section className="brand-intro pt-16 pb-10 md:pt-[72px] md:pb-11">
        <div className="brand-container">
          <p className="font-editorial text-sm italic tracking-wide text-[#B99562] mb-3">BRAND CURATION</p>
          <h1 className="max-w-[720px] break-keep text-[32px] font-bold leading-[1.25] tracking-[-0.035em] text-[#18231F] sm:text-[40px] md:text-[44px]">
            좋은 선택은<br />브랜드를 이해하는 것부터 시작됩니다.
          </h1>
          <p className="mt-5 max-w-[620px] break-keep text-[15px] leading-7 text-[#68716C] md:text-[16px]">
            백조오브제는 브랜드 철학과 제품 기준을 살펴보고<br className="hidden sm:block" />
            우리 아이의 일상에 오래 함께할 브랜드를 소개합니다.
          </p>
        </div>
      </section>

      {/* 2. 브랜드 선정 기준 가로 인덱스 */}
      <section className="mb-16 md:mb-[72px]">
        <div className="brand-container">
          <ol className="audit-index">
            {selectionStandards.map((item) => (
              <li key={item.number} className="audit-index-item flex flex-col justify-between">
                <span className="font-editorial text-sm italic text-[#B99562]">{item.number}</span>
                <div className="mt-4">
                  <h3 className="break-keep text-[15px] font-bold tracking-tight text-[#18231F]">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 break-keep text-[13px] leading-5 text-[#68716C]">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 3. 브랜드 목록 및 필터 */}
      <section>
        <div className="brand-container">
          <div className="mb-7 md:mb-9">
            <h2 className="text-[24px] font-bold text-[#18231F] mb-2 tracking-tight">
              마음이 가는 브랜드부터 만나보세요.
            </h2>
            <p className="text-[15px] text-[#68716C] mb-6">
              브랜드가 중요하게 생각하는 가치와 제품의 기준을 확인해보세요.
            </p>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <nav aria-label="브랜드 분류" className="flex flex-wrap gap-2">
                {categorySettings.brandFilters.map((tab) => {
                  const active = filter === tab.id || (filter === 'all' && tab.id === 'all');
                  return (
                    <Link
                      key={tab.id}
                      href={tab.id === 'all' ? '/brands' : `/brands?filter=${tab.id}`}
                      scroll={false}
                      aria-current={active ? 'page' : undefined}
                      className={`flex h-[40px] items-center rounded-full px-5 text-sm font-semibold transition-colors duration-300 ${
                        active
                          ? 'bg-[#18231F] text-[#FFFDF9]'
                          : 'bg-[#F2EEE5] text-[#68716C] hover:bg-[#DED8CC] hover:text-[#18231F]'
                      }`}
                    >
                      {filterLabels[tab.id] ?? tab.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="text-sm font-semibold text-[#B99562]">
                {filterLabels[filter] || '전체 브랜드'} <span className="text-[#18231F]">{filteredBrands.length}개</span>
              </div>
            </div>
          </div>

          {/* 4. 브랜드 카드 그리드 */}
          {displayedBrands.length > 0 ? (
            <div className="grid grid-cols-1 gap-[14px] md:grid-cols-2 md:gap-[18px] lg:grid-cols-3 lg:gap-[24px]">
              {displayedBrands.map((brand) => (
                <BrandCard key={brand.id} brand={brand} variant="brand-page" />
              ))}
            </div>
          ) : (
            <div className="mt-10 rounded-2xl border border-dashed border-[#DED8CC] bg-[#FFFDF9] px-6 py-16 text-center">
              <p className="break-keep text-[16px] font-semibold text-[#18231F]">조건에 맞는 브랜드가 없어요.</p>
              <p className="mt-2 break-keep text-[14px] leading-6 text-[#68716C]">다른 브랜드 이야기도 천천히 둘러보세요.</p>
              <Link href="/brands" className="mt-6 inline-flex h-[44px] items-center rounded-full bg-[#F2EEE5] px-6 text-sm font-semibold text-[#18231F] transition-colors hover:bg-[#DED8CC]">
                전체 브랜드 보기
              </Link>
            </div>
          )}

          {/* 더 보기 버튼 */}
          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button 
                type="button" 
                onClick={handleLoadMore} 
                className="inline-flex h-[48px] items-center rounded-full border border-[#DED8CC] bg-[#FFFDF9] px-8 text-[15px] font-semibold text-[#18231F] transition-colors hover:bg-[#F2EEE5]"
              >
                브랜드 더 보기
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function BrandsPage() {
  return (
    <Suspense
      fallback={(
        <main className="brand-page min-h-[60dvh] pt-16 pb-20" aria-label="브랜드 목록을 불러오는 중">
          <div className="brand-container animate-pulse">
            <div className="h-10 w-64 rounded-xl bg-[#DED8CC]/50 mb-4" />
            <div className="h-6 w-96 rounded-lg bg-[#DED8CC]/30 mb-12" />
            <div className="h-[120px] w-full rounded-2xl bg-[#DED8CC]/40 mb-[72px]" />
            <div className="grid gap-[24px] md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-[280px] rounded-2xl bg-[#DED8CC]/30" />
              ))}
            </div>
          </div>
        </main>
      )}
    >
      <BrandsContent />
    </Suspense>
  );
}
