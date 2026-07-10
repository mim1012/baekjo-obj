'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Brand } from '@/types';
import BrandCard from '@/components/common/BrandCard';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';

interface Props {
  brands: Brand[];
}

function BrandsInner({ brands }: Props) {
  const searchParams = useSearchParams();
  const filter = searchParams.get('filter') || 'all';
  const { categorySettings } = useCategorySettings();

  const filteredBrands = brands.filter(b => {
    if (filter === 'audit') return b.auditGrade.includes('A');
    if (filter === 'recommended') return b.isRecommended;
    if (filter === 'new') return b.isNew;
    return true;
  });

  return (
    <div className="bg-[#FBFAF7] min-h-dvh">
      {/* Hero Section */}
      <section className="bg-[#17211D] aspect-[4/3] sm:aspect-[2/1] lg:aspect-[2.5/1] min-h-[360px] flex flex-col justify-center text-center text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/brands-hero-bg.png')] bg-cover bg-center opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#17211D] via-[#17211D]/70 to-[#17211D]/20"></div>
        <div className="site-container relative z-10 w-full px-4 sm:px-6">
          <p className="text-sm font-semibold tracking-widest text-slate-400 mb-4 uppercase">Baekjo Audit Brand</p>
          <h1 className="text-4xl sm:text-5xl font-editorial tracking-tight text-white mb-6 leading-[1.2]">백조오브제가 고른 검증 브랜드</h1>
          <p className="text-slate-200 leading-[1.8] max-w-4xl mx-auto text-[14px] sm:text-[16px] break-keep">
            자극적인 마케팅보다 실제 기준을 먼저 봅니다. 성분, 제조, 철학, 사용성, 후기, 반려가족의 생활 흐름을 기준으로 믿고 선택할 수 있는 브랜드만 소개합니다.
          </p>
        </div>
      </section>

      {/* The Audit Checkpoints Section (Compact Premium Layout) */}
      <section className="py-24 bg-[#FBFAF7] border-b border-[#E7E0D5]">
        <div className="site-container-wide">
          <div className="mb-16 md:mb-24 text-center md:text-left flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="text-[36px] sm:text-[48px] font-editorial font-bold text-[#17211D] mb-4 tracking-tight leading-[1.1]">
                The Audit Checkpoints
              </h2>
              <div className="w-12 h-[2px] bg-[#A8742E] mx-auto md:mx-0"></div>
            </div>
            <p className="text-[#6F766F] text-[15px] max-w-[400px] text-center md:text-right leading-[1.7]">
              백조오브제는 판매 가능성보다 반려가족이 믿고 선택할 수 있는 기준을 먼저 확인합니다.<br className="hidden md:block" />
              깐깐한 5단계 검증을 통해 오직 최상의 제품만을 큐레이션합니다.
            </p>
          </div>

          {/* 5-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-y-12 gap-x-6 lg:gap-x-10">
            {/* Item 1 */}
            <div className="group border-t border-[#E7E0D5] pt-6 hover:border-[#17211D] transition-colors duration-500">
              <div className="font-editorial text-[60px] leading-none text-[#E7E0D5] group-hover:text-[#17211D] transition-colors duration-500 mb-6">01</div>
              <h3 className="text-[20px] font-editorial font-bold text-[#17211D] mb-1 group-hover:-translate-y-1 transition-transform duration-500">Expert Formulation</h3>
              <p className="text-[13px] font-bold text-[#A8742E] mb-4 group-hover:-translate-y-1 transition-transform duration-500 delay-75">전문 설계</p>
              <p className="text-[#6F766F] text-[14px] leading-[1.6] break-keep group-hover:-translate-y-1 transition-transform duration-500 delay-150">
                단순한 트렌드가 아닌, 수의학적 지식과 연구개발 데이터를 기반으로 설계된 제품인지 꼼꼼하게 따져봅니다.
              </p>
            </div>

            {/* Item 2 */}
            <div className="group border-t border-[#E7E0D5] pt-6 hover:border-[#17211D] transition-colors duration-500">
              <div className="font-editorial text-[60px] leading-none text-[#E7E0D5] group-hover:text-[#17211D] transition-colors duration-500 mb-6">02</div>
              <h3 className="text-[20px] font-editorial font-bold text-[#17211D] mb-1 group-hover:-translate-y-1 transition-transform duration-500">Reliable Production</h3>
              <p className="text-[13px] font-bold text-[#A8742E] mb-4 group-hover:-translate-y-1 transition-transform duration-500 delay-75">신뢰 가능한 생산</p>
              <p className="text-[#6F766F] text-[14px] leading-[1.6] break-keep group-hover:-translate-y-1 transition-transform duration-500 delay-150">
                안전하고 깨끗한 제조 시설, 투명한 유통 과정, 엄격한 품질 관리 시스템을 갖춘 브랜드인지 검증합니다.
              </p>
            </div>

            {/* Item 3 */}
            <div className="group border-t border-[#E7E0D5] pt-6 hover:border-[#17211D] transition-colors duration-500">
              <div className="font-editorial text-[60px] leading-none text-[#E7E0D5] group-hover:text-[#17211D] transition-colors duration-500 mb-6">03</div>
              <h3 className="text-[20px] font-editorial font-bold text-[#17211D] mb-1 group-hover:-translate-y-1 transition-transform duration-500">Balanced Gourmet</h3>
              <p className="text-[13px] font-bold text-[#A8742E] mb-4 group-hover:-translate-y-1 transition-transform duration-500 delay-75">균형 잡힌 기호성</p>
              <p className="text-[#6F766F] text-[14px] leading-[1.6] break-keep group-hover:-translate-y-1 transition-transform duration-500 delay-150">
                아이들이 즐겁게 먹을 수 있는 기호성은 물론, 장기적인 영양 밸런스까지 함께 고려된 제품인지 확인합니다.
              </p>
            </div>

            {/* Item 4 */}
            <div className="group border-t border-[#E7E0D5] pt-6 hover:border-[#17211D] transition-colors duration-500">
              <div className="font-editorial text-[60px] leading-none text-[#E7E0D5] group-hover:text-[#17211D] transition-colors duration-500 mb-6">04</div>
              <h3 className="text-[20px] font-editorial font-bold text-[#17211D] mb-1 group-hover:-translate-y-1 transition-transform duration-500">Sustained Vitality</h3>
              <p className="text-[13px] font-bold text-[#A8742E] mb-4 group-hover:-translate-y-1 transition-transform duration-500 delay-75">지속 가능한 건강</p>
              <p className="text-[#6F766F] text-[14px] leading-[1.6] break-keep group-hover:-translate-y-1 transition-transform duration-500 delay-150">
                반려견의 생애주기 전반에 걸쳐 지속적으로 도움을 주는 건강한 제품을 찾습니다.
              </p>
            </div>

            {/* Item 5 */}
            <div className="group border-t border-[#E7E0D5] pt-6 hover:border-[#17211D] transition-colors duration-500">
              <div className="font-editorial text-[60px] leading-none text-[#E7E0D5] group-hover:text-[#17211D] transition-colors duration-500 mb-6">05</div>
              <h3 className="text-[20px] font-editorial font-bold text-[#17211D] mb-1 group-hover:-translate-y-1 transition-transform duration-500">Mindful Record</h3>
              <p className="text-[13px] font-bold text-[#A8742E] mb-4 group-hover:-translate-y-1 transition-transform duration-500 delay-75">기록과 관리</p>
              <p className="text-[#6F766F] text-[14px] leading-[1.6] break-keep group-hover:-translate-y-1 transition-transform duration-500 delay-150">
                아이의 신체 변화를 쉽게 관찰하고, 일상을 체계적으로 기록하며 관리할 수 있는 편의성을 고려합니다.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Brand List Section */}
      <section className="py-24">
        <div className="site-container">
          {/* 필터 탭 */}
          <div className="mb-16 flex flex-wrap justify-center gap-3">
            {categorySettings.brandFilters.map(tab => (
              <Link
                key={tab.id}
                href={`/brands?filter=${tab.id}`}
                className={`rounded-full px-6 py-3 text-sm font-semibold transition-all ${
                  filter === tab.id
                    ? 'bg-[#17211D] text-white shadow-md'
                    : 'bg-white text-slate-500 border border-[rgba(15,23,42,0.08)] hover:bg-slate-50 hover:text-[#17211D]'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filteredBrands.map(brand => (
              <BrandCard key={brand.id} brand={brand} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function BrandsContent({ brands }: Props) {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <BrandsInner brands={brands} />
    </Suspense>
  );
}
