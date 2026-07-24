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
  const displayList = brands;
  const brandRailRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(displayList.length > 1);


  const updateRailState = useCallback(() => {
    const rail = brandRailRef.current;
    if (!rail) return;

    const maxScroll = Math.max(0, rail.scrollWidth - rail.clientWidth);

    setCanScrollLeft(rail.scrollLeft > 4);
    setCanScrollRight(rail.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    updateRailState();
    window.addEventListener('resize', updateRailState);
    return () => window.removeEventListener('resize', updateRailState);
  }, [displayList.length, updateRailState]);

  const scrollBrands = (direction: 'left' | 'right') => {
    const rail = brandRailRef.current;
    if (!rail) return;

    const firstCard = rail.firstElementChild as HTMLElement | null;
    // item width + gap
    const cardWidth = firstCard?.getBoundingClientRect().width ?? rail.clientWidth;
    rail.scrollBy({
      left: direction === 'right' ? cardWidth + 24 : -(cardWidth + 24),
      behavior: 'smooth',
    });
  };

  if (displayList.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="백조오브제 셀렉티드 브랜드"
    >
      <div className="flex items-end justify-between mb-[24px]">
        <div>
          <h2 className="text-[24px] md:text-[26px] lg:text-[28px] xl:text-[30px] font-bold tracking-tight text-[#17211D] leading-[1.35] break-keep min-w-0">
            브랜드의 기준까지 고른 셀렉션
          </h2>
          <p className="mt-2 break-keep text-[14px] leading-[1.6] text-[#72766F]">
            검증을 통과한 브랜드만 소개합니다.
          </p>
        </div>

        <Link
          href="/brands"
          className="group hidden sm:flex items-center text-[13px] font-bold text-[#68706B] transition-colors hover:text-[#173C32] focus-visible:outline-none focus-visible:underline"
        >
          전체 보기
          <ArrowRight className="ml-1 size-4 transition-transform duration-300 group-hover:translate-x-[4px]" aria-hidden="true" />
        </Link>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => scrollBrands('left')}
          disabled={!canScrollLeft}
          aria-label="이전 브랜드"
          className="absolute left-[-20px] max-[1240px]:left-[8px] top-1/2 z-[3] hidden size-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-[#EAE7E1] bg-white text-[#17231E] shadow-sm transition-all duration-300 hover:bg-[#F9F8F5] disabled:pointer-events-none disabled:opacity-0 md:flex"
        >
          <ArrowLeft className="size-5" strokeWidth={1.2} aria-hidden="true" />
        </button>

        <div className="relative w-full min-w-0 overflow-hidden bg-transparent border-t border-[#DED8CE] rounded-none shadow-none">
          <div
            ref={brandRailRef}
            onScroll={updateRailState}
            className="grid grid-flow-col auto-cols-[100%] md:auto-cols-[50%] lg:auto-cols-[33.333333%] auto-rows-fr gap-0 snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide divide-x divide-[#E7E2D9]"
          >
            {displayList.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.id}`}
              className="group flex w-full shrink-0 snap-start flex-col bg-transparent px-[24px] py-[28px] md:px-[30px] md:py-[32px] min-h-[210px] h-full min-w-0 transition-colors hover:bg-[#F9F8F5] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B68B4E] focus-visible:ring-inset"
            >
              <div className="mb-[12px] flex h-[60px] w-full items-center">
                <BrandLogo
                  brand={brand}
                  size="lg"
                  surface={false}
                  fluid
                  uniformScale
                  className="max-h-[44px] max-w-[150px] w-auto object-contain"
                />
              </div>

              <div className="flex flex-1 flex-col min-h-0">
                <span className="text-[16px] md:text-[17px] font-semibold leading-[1.55] text-[#26332D]">
                  {brand.name}
                </span>

                <p className="mt-[8px] line-clamp-2 break-keep text-[13px] leading-[1.6] text-[#6F766F]">
                  {brand.description}
                </p>

                <div className="mt-auto pt-3 w-full">
                  <span className="inline-flex items-center text-[12px] font-bold text-[#173C32] transition-colors duration-300 md:text-[13px]">
                    브랜드 자세히 보기
                    <ArrowRight className="ml-1 size-[14px] transition-transform duration-300 group-hover:translate-x-[4px]" aria-hidden="true" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
        </div>

        <button
          type="button"
          onClick={() => scrollBrands('right')}
          disabled={!canScrollRight}
          aria-label="다음 브랜드"
          className="absolute right-[-20px] max-[1240px]:right-[8px] top-1/2 z-[3] hidden size-[44px] -translate-y-1/2 items-center justify-center rounded-full border border-[#EAE7E1] bg-white text-[#17231E] shadow-sm transition-all duration-300 hover:bg-[#F9F8F5] disabled:pointer-events-none disabled:opacity-0 md:flex"
        >
          <ArrowRight className="size-5" strokeWidth={1.2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}