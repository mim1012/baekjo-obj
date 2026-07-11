import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Brand } from '@/types';
import BrandLogo from '@/components/common/BrandLogo';

type BrandCardVariant = 'default' | 'brand-page';

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
    const displayCategory = concernMap[categoryLabel] || '브랜드';

    return (
      <article className="brand-card group flex min-h-[280px] flex-col p-5 md:p-[22px]">
        <Link href={`/brands/${brand.id}`} className="flex flex-1 flex-col outline-none">
          {/* Logo Stage */}
          <div className="brand-logo-stage mb-5">
            <BrandLogo 
              brand={brand} 
              size="md" 
              surface={false} 
              className="!h-full !w-[160px]"
            />
          </div>

          {/* Category / Name / Description */}
          <span className="mb-1 text-xs font-semibold text-[#B99562]">
            {displayCategory}
          </span>
          <h3 className="mb-2 text-[19px] font-bold leading-[1.35] tracking-tight text-[#17211D]">
            {brand.name}
          </h3>
          <p className="line-clamp-2 text-[14px] leading-[1.65] text-[#68716C]">
            {brand.description}
          </p>


          {/* Bottom CTA */}
          <span className="mt-auto pt-6 flex items-center gap-1.5 text-sm font-semibold text-[#17211D]">
            {linkedProductCount > 0 
              ? `등록 상품 ${linkedProductCount}개 · 둘러보기`
              : '브랜드 이야기 보기'}
            <ArrowRight className="size-3.5 text-[#A8742E] transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
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
