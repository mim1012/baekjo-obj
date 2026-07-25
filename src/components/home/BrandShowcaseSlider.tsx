'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Brand } from '@/types';
import BrandLogo from '@/components/common/BrandLogo';

interface Props {
  brands: Brand[];
}

export default function BrandShowcaseSlider({ brands }: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(brands.length > 1);

  const updateRailState = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);
    setCanScrollLeft(rail.scrollLeft > 4);
    setCanScrollRight(rail.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    updateRailState();
    window.addEventListener('resize', updateRailState);
    return () => window.removeEventListener('resize', updateRailState);
  }, [brands.length, updateRailState]);

  const scrollBrands = (direction: 'left' | 'right') => {
    const rail = railRef.current;
    if (!rail) return;
    const firstCard = rail.firstElementChild as HTMLElement | null;
    const cardWidth = firstCard?.getBoundingClientRect().width ?? rail.clientWidth;
    rail.scrollBy({
      left: direction === 'right' ? cardWidth + 24 : -(cardWidth + 24),
      behavior: 'smooth',
    });
  };

  if (brands.length === 0) return null;

  return (
    <div role="region" aria-label="백조오브제 셀렉티드 브랜드">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="break-keep text-[24px] font-bold leading-[1.35] tracking-tight text-[#17211D] md:text-[28px]">
            브랜드의 기준까지 고른 셀렉션
          </h2>
          <p className="mt-2 break-keep text-[14px] leading-[1.6] text-[#72766F]">
            검증을 통과한 브랜드만 소개합니다.
          </p>
        </div>
        <Link
          href="/brands"
          className="group hidden items-center text-[13px] font-bold text-[#68706B] transition-colors hover:text-[#173C32] sm:flex"
        >
          브랜드관 보기
          <ArrowRight className="ml-1 size-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scrollBrands('left')}
          disabled={!canScrollLeft}
          aria-label="이전 브랜드"
          className="absolute left-2 top-1/2 z-[3] hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#EAE7E1] bg-white text-[#17231E] shadow-sm transition-colors hover:bg-[#F9F8F5] disabled:pointer-events-none disabled:opacity-0 md:flex xl:-left-5"
        >
          <ArrowLeft className="size-5" strokeWidth={1.2} aria-hidden="true" />
        </button>

        <div className="overflow-hidden border-t border-[#DED8CE]">
          <div
            ref={railRef}
            onScroll={updateRailState}
            className="grid auto-cols-[100%] auto-rows-fr grid-flow-col snap-x snap-mandatory divide-x divide-[#E7E2D9] overflow-x-auto scroll-smooth scrollbar-hide md:auto-cols-[50%] lg:auto-cols-[33.333333%]"
          >
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brands/${brand.id}`}
                className="group flex min-h-[210px] min-w-0 snap-start flex-col bg-transparent px-6 py-7 transition-colors hover:bg-[#F9F8F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B68B4E] focus-visible:ring-inset md:px-8 md:py-8"
              >
                <div className="mb-3 flex h-[60px] w-full items-center">
                  <BrandLogo
                    brand={brand}
                    size="lg"
                    surface={false}
                    fluid
                    uniformScale
                    className="max-h-11 max-w-[150px] object-contain"
                  />
                </div>
                <span className="break-keep text-[16px] font-semibold leading-[1.55] text-[#26332D] md:text-[17px]">
                  {brand.name}
                </span>
                <p className="mt-2 line-clamp-2 break-keep text-[13px] leading-[1.6] text-[#6F766F]">
                  {brand.description}
                </p>
                <span className="mt-auto inline-flex pt-3 text-[12px] font-bold text-[#173C32] md:text-[13px]">
                  브랜드 자세히 보기
                  <ArrowRight className="ml-1 size-[14px] transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => scrollBrands('right')}
          disabled={!canScrollRight}
          aria-label="다음 브랜드"
          className="absolute right-2 top-1/2 z-[3] hidden size-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#EAE7E1] bg-white text-[#17231E] shadow-sm transition-colors hover:bg-[#F9F8F5] disabled:pointer-events-none disabled:opacity-0 md:flex xl:-right-5"
        >
          <ArrowRight className="size-5" strokeWidth={1.2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
