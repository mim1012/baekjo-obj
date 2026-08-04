import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Brand } from '@/types';
import BrandLogo from '@/components/common/BrandLogo';

type BrandCardVariant = 'default' | 'brand-page' | 'care-related';

interface Props {
  brand: Brand;
  variant?: BrandCardVariant;
}

export default function BrandCard({ brand, variant = 'default' }: Props) {
  if (variant === 'brand-page') {
    const linkedProductCount = brand.representativeProductIds ? brand.representativeProductIds.length : 0;
    
    // Convert related concern slugs to readable labels (just using the slug as placeholder for now, or use a generic "브랜드" label if empty)
    const categoryLabel = brand.relatedConcernSlugs && brand.relatedConcernSlugs.length > 0
      ? brand.relatedConcernSlugs[0]
      : '브랜드';

    // To properly map concern slugs to readable labels (picky -> 입맛/편식, nutrition -> 영양/보양, oral -> 구강/위생, grooming -> 그루밍, stress -> 스트레스/행동, digestion -> 소화/장, skin -> 피부/모질, living -> 생활환경)
    const concernMap: Record<string, string> = {
      picky: '입맛/편식',
      nutrition: '영양/보양',
      oral: '구강/위생',
      grooming: '그루밍',
      stress: '스트레스/행동',
      digestion: '소화/장',
      skin: '피부/모질',
      living: '생활환경'
    };
    const defaultCategory = concernMap[categoryLabel] || '프리미엄 펫 브랜드';

    let finalName = brand.name;
    let finalDescription = brand.description;
    let finalCategory = defaultCategory;

    // Custom overrides based on name match
    if (brand.name.includes('노블독') || brand.name.includes('노볼독')) {
      finalName = '노볼독 (NobleDog)';
      finalDescription = '꾸준한 구강 관리를 고민하는 브랜드';
    } else if (brand.name.includes('알로밍')) {
      finalName = '알로밍 (ALLOMING)';
      finalDescription = '교감의 시간을 제품으로 설계하는 브랜드';
      finalCategory = '그루밍 · 케어';
    } else if (brand.name.includes('오미프로')) {
      finalName = '오미프로 (OMIPRO)';
      finalDescription = '몸속의 작은 변화까지 고민하는 영양 브랜드';
    } else if (brand.name.includes('페네핏')) {
      finalName = '페네핏 (PENEFIT)';
      finalDescription = '더 많은 아이들이 함께할 수 있는 식탁을 고민하는 브랜드';
    } else if (brand.name.includes('써니사이드업') || brand.name.includes('써니 사이드업') || brand.name.includes('써니 사이어드')) {
      finalName = '써니사이드업';
      finalDescription = '연구의 시작부터 생명을 먼저 생각하는 브랜드';
    } else if (brand.name.includes('차콜스토리') || brand.name.includes('챠콜스토리')) {
      finalName = '차콜스토리 (Charcoal Story)';
      finalDescription = '숯의 가치를 반려동물에게 전하는 브랜드';
    } else if (brand.name.includes('RE:펫') || brand.name.includes('리펫')) {
      finalName = 'RE:펫';
      finalDescription = '펫로스를 가장 가까이에서 경험한 작가가 만드는 브랜드';
    } else if (brand.name.includes('메종슈슈')) {
      finalName = '메종슈슈 (Maison Chouchou)';
      finalDescription = '입히는 대상이 아닌, 함께 살아가는 존재로 대하는 브랜드';
    }

    return (
      <article className="group flex flex-col min-h-[250px] md:min-h-[270px] bg-[#FFFEFB] border border-[#E4DDD1] rounded-[16px] p-5 md:p-6 transition-all duration-300 hover:-translate-y-[2px] hover:border-[#D8C9B4] hover:shadow-[0_8px_24px_rgba(23,37,31,0.04)]">
        <Link href={`/brands/${brand.id}`} className="flex flex-1 flex-col outline-none w-full h-full">
          {/* Logo Stage */}
          <div className="mb-4 flex h-[72px] items-center justify-center md:h-[84px]">
            <div className="relative flex h-10 w-full max-w-[150px] items-center justify-center">
              {brand.logo ? (
                <BrandLogo brand={brand} size="md" surface fluid uniformScale />
              ) : (
                <span className="text-[16px] font-bold text-[#17251F]">{finalName}</span>
              )}
            </div>
          </div>

          {/* Category / Name / Description */}
          <span className="mb-1.5 text-[10px] md:text-[11px] font-semibold text-[#B48A4A]">
            {finalCategory}
          </span>
          <h3 className="mb-2 text-[16px] md:text-[18px] font-bold leading-[1.3] tracking-tight text-[#17251F] line-clamp-2 min-h-[42px] md:min-h-[47px] flex items-start">
            {finalName}
          </h3>
          <p className="break-keep text-[12px] leading-[1.6] text-[#6F756F] md:text-[13px]">
            {finalDescription}
          </p>

          {/* Bottom CTA */}
          <span className="mt-auto pt-6 flex items-center justify-between text-[12px] md:text-[13px] font-semibold text-[#17251F]">
            {linkedProductCount > 0 
              ? `상품 ${linkedProductCount}개 · 둘러보기`
              : '브랜드 이야기 보기'}
            <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-[#B48A4A] transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </Link>
      </article>
    );
  }

  if (variant === 'care-related') {
    return (
      <article className="group flex flex-col rounded-2xl border border-[#DED8CC] bg-[#FFFDF9] p-5 md:p-6 transition-all duration-300 hover:border-[#B99562] hover:shadow-sm">
        <Link href={`/brands/${brand.id}`} className="flex flex-1 flex-col outline-none">
          {/* Logo Stage */}
          <div className="mb-5 flex h-[62px] w-full items-center justify-start rounded-xl border border-[#E7E1D7] bg-white p-3 md:h-[68px]">
            <BrandLogo 
              brand={brand} 
              size="md" 
              surface={false} 
              className="!h-auto !w-auto !max-h-[38px] !max-w-[150px] object-contain md:!max-h-[42px] md:!max-w-[160px]"
            />
          </div>

          <h3 className="mb-2 break-keep text-[18px] font-bold leading-[1.35] tracking-tight text-[#18231F] md:text-[20px]">
            {brand.name}
          </h3>
          <p className="line-clamp-2 text-[14px] leading-[1.65] text-[#68716C]">
            {brand.description}
          </p>

          {/* Bottom CTA */}
          <span className="mt-auto pt-6 flex items-center gap-1.5 text-[14px] font-semibold text-[#18231F]">
            브랜드 이야기 보기
            <ArrowRight className="size-4 text-[#B99562] transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </Link>
      </article>
    );
  }

  return (
    <Link
      href={`/brands/${brand.id}`}
      className="premium-card group flex min-h-72 flex-col p-6 sm:min-h-80 sm:p-7"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#A8742E]/40 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100"
      />

      <div className="relative z-10">
        <BrandLogo brand={brand} size="md" />
        <h3 className="mt-6 break-keep text-xl font-bold tracking-tight text-[#17211D] transition-colors duration-500 group-hover:text-[#8A6230]">
          {brand.name}
        </h3>
        <p className="mt-3 break-keep text-sm leading-6 text-[#6F766F]">{brand.description}</p>
      </div>

      <div className="relative z-10 mt-auto pt-8">
        <span className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#17211D]">
          브랜드 이야기 보기
          <ArrowRight className="size-4 text-[#A8742E] transition-transform duration-500 group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}
