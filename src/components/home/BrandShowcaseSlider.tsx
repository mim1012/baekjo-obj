'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Brand, Product } from '@/types';

interface Props {
  brands: Brand[];
  productsByBrand: Record<string, Product[]>;
}

export default function BrandShowcaseSlider({ brands, productsByBrand }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % brands.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + brands.length) % brands.length);
  };

  if (!brands.length) return null;

  return (
    <div className="relative w-full">
      {/* Slider Container */}
      <div className="relative overflow-hidden rounded-[24px] bg-card border border-border shadow-sm group">
        <div 
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {brands.map((brand) => {
            const brandProducts = productsByBrand[brand.id] || [];
            
            return (
              <div key={brand.id} className="w-full shrink-0 flex flex-col lg:flex-row min-w-full">
                {/* Left: Info & CTA */}
                <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center">
                  <div className="flex items-start justify-between">
                    <span className="font-editorial text-5xl italic text-slate-300">
                      {brand.name.slice(0, 1)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-bg border border-border px-3 py-1.5 text-[11px] font-semibold text-text-main">
                      <Check className="size-3 text-navy" />
                      Audit {brand.auditGrade}
                    </span>
                  </div>
                  
                  <h3 className="mt-8 text-balance font-editorial text-3xl lg:text-4xl text-text-main tracking-tight">{brand.name}</h3>
                  <p className="mt-4 text-pretty text-sm leading-7 text-text-sub">
                    {brand.description}
                  </p>

                  <div className="mt-8 flex flex-wrap gap-2">
                    {['성분 안전성 검증', '제조 시설 점검', '오딧 등급 ' + brand.auditGrade].map((badge) => (
                      <span key={badge} className="inline-flex items-center gap-1 rounded-sm bg-sub px-2.5 py-1 text-[11px] font-medium text-text-sub">
                        <Check className="size-3 text-navy" />
                        {badge}
                      </span>
                    ))}
                  </div>

                  <div className="mt-10 flex flex-col sm:flex-row gap-3 w-full">
                    <Link href={`/brands/${brand.id}`} className="flex-1 flex justify-center items-center gap-1 py-3.5 bg-bg border border-border rounded-xl text-sm font-bold text-text-sub hover:bg-card hover:text-text-main transition-colors">
                      브랜드 보기
                    </Link>
                    <Link href={`/shop?brandId=${brand.id}`} className="flex-1 flex justify-center items-center gap-1 py-3.5 bg-navy text-white rounded-xl text-sm font-bold hover:bg-navy/90 transition-colors">
                      대표 상품 보기
                    </Link>
                  </div>
                </div>

                {/* Right: Products Preview Showcase */}
                <div className="flex-1 bg-bg border-t lg:border-t-0 lg:border-l border-border p-8 lg:p-12 flex flex-col justify-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <span className="font-editorial text-[200px] italic leading-none">{brand.name.slice(0, 1)}</span>
                  </div>
                  
                  <h4 className="text-sm font-bold text-text-main mb-6 relative z-10 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-navy inline-block"></span>
                    대표 상품 미리보기
                  </h4>
                  {brandProducts.length > 0 ? (
                    <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                      {brandProducts.slice(0, 2).map((product) => (
                        <div key={product.id} className="flex-1 bg-card rounded-2xl p-4 border border-border shadow-sm flex flex-col transition-transform hover:-translate-y-1">
                          <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-sub mb-4">
                            {product.image ? (
                              <Image src={product.image} alt={product.name} fill className="object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center font-editorial text-sm font-bold text-text-main/20">BAEKJO SELECTION</div>
                            )}
                          </div>
                          <h5 className="font-bold text-text-main text-xs mb-1 line-clamp-2 leading-relaxed">{product.name}</h5>
                          <p className="text-[11px] font-semibold text-text-sub mt-auto pt-2">{product.price ? `${product.price.toLocaleString()}원` : '상담 후 안내'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex-1 flex items-center justify-center bg-card rounded-2xl border border-border p-8 relative z-10">
                      <p className="text-sm text-text-sub">등록된 대표 상품이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Controls Overlay - Only show when there are multiple brands */}
        {brands.length > 1 && (
          <>
            <button 
              onClick={prevSlide}
              className="absolute left-2 lg:left-4 top-1/2 -translate-y-1/2 flex items-center justify-center size-10 rounded-full bg-card border border-border shadow-md text-text-main hover:bg-bg transition-colors z-20 opacity-0 group-hover:opacity-100 disabled:opacity-0"
              aria-label="이전 브랜드"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button 
              onClick={nextSlide}
              className="absolute right-2 lg:right-4 top-1/2 -translate-y-1/2 flex items-center justify-center size-10 rounded-full bg-card border border-border shadow-md text-text-main hover:bg-bg transition-colors z-20 opacity-0 group-hover:opacity-100 disabled:opacity-0"
              aria-label="다음 브랜드"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* Dots Indicator */}
      {brands.length > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {brands.map((brand, index) => (
            <button
              key={brand.id}
              onClick={() => setActiveIndex(index)}
              className={`transition-all duration-300 rounded-full h-1.5 ${activeIndex === index ? 'w-6 bg-text-main' : 'w-1.5 bg-slate-300 hover:bg-slate-400'}`}
              aria-label={`${brand.name} 슬라이드로 이동`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
