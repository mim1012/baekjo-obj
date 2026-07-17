'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, ShieldCheck, Activity, Leaf, Monitor, Heart,
  Droplet, Sparkles, Bone, Scale, Grid, Dog, Cat, Utensils, Bath, HeartPulse, Stethoscope, Store
} from 'lucide-react';
import { notices } from '@/data/notices';
import { reviews } from '@/data/reviews';
import BrandShowcaseSlider from '@/components/home/BrandShowcaseSlider';
import ProductCard from '@/components/common/ProductCard';
import ReviewCard from '@/components/common/ReviewCard';
import { sortProducts } from '@/lib/filters';
import { formatDate } from '@/lib/format';
import type { Brand, Product } from '@/types';

export default function HomeClient({ products, brands }: { products: Product[]; brands: Brand[] }) {
  const bestProducts = sortProducts(products.filter((product) => product.isBest || product.isRecommended), 'popular').slice(0, 4);
  const recentNotices = notices.slice(0, 4);
  const displayBrands = brands.filter(b => b.isVisible !== false);

  const quickLinks = [
    { name: '전체 상품', icon: Grid, href: '/shop' },
    { name: '강아지', icon: Dog, href: '/shop?petType=dog' },
    { name: '고양이', icon: Cat, href: '/shop?petType=cat' },
    { name: '사료·간식', icon: Utensils, href: '/shop?category=dining-and-nourish' },
    { name: '위생·배변', icon: Bath, href: '/shop?category=fragrance-and-hygiene' },
    { name: '건강관리', icon: HeartPulse, href: '/shop?category=wellness-and-care' },
    { name: '고민별 케어', icon: Stethoscope, href: '/concerns' },
    { name: '브랜드관', icon: Store, href: '/brands' },
  ];

  const curationCards = [
    { title: '눈물', desc: '눈물 자국이 걱정될 때', icon: Droplet, href: '/concerns/tear', img: '/images/hero-curation-visual.png' },
    { title: '피부', desc: '자주 긁거나 피부가 예민할 때', icon: Sparkles, href: '/concerns/skin', img: '/images/hero-bg.jpg' },
    { title: '관절', desc: '걷거나 움직임이 불편해 보일 때', icon: Bone, href: '/concerns/joint', img: '/images/hero-curation-visual-natural.png' },
    { title: '체중', desc: '체중 관리가 필요할 때', icon: Scale, href: '/concerns/obesity', img: '/images/care_guide_hero.png' },
  ];

  return (
    <main className="flex flex-col bg-[#FCFBF8] min-h-screen pb-20">
      {/* 1. 메인 히어로 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 pt-10 pb-14 lg:pt-14 lg:pb-16">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:h-[500px] gap-10 lg:gap-14">
          <div className="flex w-full flex-col items-start lg:w-[47%]">
            <span className="block text-[11px] lg:text-[12px] font-bold tracking-[0.12em] text-[#B68B4E] uppercase mb-3 md:mb-4">PREMIUM PET CURATION</span>
            <h1 className="text-[30px] sm:text-[34px] lg:text-[44px] font-bold leading-[1.18] tracking-[-0.035em] text-[#17231E] break-keep">
              검증된 브랜드를<br />
              우리 아이 고민에<br />
              맞게.
            </h1>
            <p className="mt-5 md:mt-[20px] lg:mt-[24px] max-w-[500px] text-[15px] lg:text-[16px] leading-[1.7] text-[#72766F] break-keep">
              성분과 제조 기준, 보호자의 사용 가치를 확인한 반려동물 브랜드와<br className="hidden sm:block" />
              상품을 소개합니다.
            </p>
            <div className="mt-7 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link href="/shop" className="flex h-[48px] lg:h-[50px] items-center justify-center rounded-xl bg-[#18231F] px-8 text-[15px] font-bold text-white transition-colors hover:bg-[#2F3B34]">
                검증 상품 보기
              </Link>
              <Link href="/concerns" className="flex h-[48px] lg:h-[50px] items-center justify-center rounded-xl border border-[#DED8CC] bg-white px-8 text-[15px] font-bold text-[#18231F] transition-colors hover:border-[#B99562]">
                고민별 찾아보기
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-2 text-[13px] font-medium text-[#68716C]">
              <ShieldCheck className="size-4 text-[#B99562]" strokeWidth={2} />
              백조오브제 Audit 검증을 통과한 브랜드만 소개합니다.
            </div>
          </div>
          <div className="w-full lg:w-[53%] h-[300px] sm:h-[400px] lg:h-full relative overflow-hidden rounded-[24px]">
            <img src="/images/poodle-pet-food.png" alt="백조오브제 펫 푸드와 푸들" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
              <ShieldCheck className="size-4 text-[#2E7D32]" strokeWidth={2} />
              <div className="flex flex-col">
                <span className="text-[12px] font-bold leading-none text-[#18231F]">Audit Passed</span>
                <span className="mt-0.5 text-[10px] text-[#68716C]">검증 기준 통과</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 빠른 쇼핑 카테고리 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-20 lg:mb-24">
        <div className="rounded-[20px] bg-white border border-[#F2EFE9] p-6 lg:p-8 flex flex-col xl:flex-row xl:items-center gap-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <h3 className="text-[16px] font-bold text-[#18231F] shrink-0">빠른 쇼핑</h3>
          <div className="grid grid-cols-4 gap-y-6 md:flex md:flex-wrap md:gap-x-8 xl:flex-1 xl:justify-between">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link key={link.name} href={link.href} className="group flex flex-col items-center gap-3">
                  <div className="flex size-[48px] items-center justify-center rounded-full bg-[#F9F8F5] text-[#18231F] transition-colors group-hover:bg-[#F2EFE9]">
                    <Icon className="size-[20px]" strokeWidth={1.5} />
                  </div>
                  <span className="text-[13px] font-medium text-[#68716C] group-hover:text-[#18231F] whitespace-nowrap">{link.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Audit 추천 상품 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-20 lg:mb-28">
        <div className="flex items-end justify-between mb-8">
          <h2 className="text-[24px] font-bold tracking-tight text-[#18231F] sm:text-[28px]">Audit를 통과한 오늘의 추천</h2>
          <Link href="/shop" className="hidden sm:flex items-center text-[14px] font-semibold text-[#68716C] hover:text-[#B99562] transition-colors">
            전체 셀렉션 보기 <ArrowRight className="ml-1 size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4 xl:gap-6">
          {bestProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <Link href="/shop" className="mt-8 flex w-full h-[48px] items-center justify-center rounded-xl border border-[#DED8CC] text-[14px] font-bold text-[#18231F] sm:hidden">
          전체 셀렉션 보기
        </Link>
      </section>

      {/* 4. 고민별 맞춤 큐레이션 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-20 lg:mb-28">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-[24px] font-bold tracking-tight text-[#18231F] sm:text-[28px]">반려동물 고민에 맞춘 큐레이션</h2>
            <p className="mt-2 text-[15px] text-[#68716C]">우리 아이의 일상적인 고민부터 차근차근 확인해 보세요.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/diagnosis" className="text-[14px] font-bold text-[#B99562] hover:text-[#A8742E] transition-colors">
              1분 맞춤 진단 시작
            </Link>
            <Link href="/concerns" className="flex items-center text-[14px] font-semibold text-[#68716C] hover:text-[#18231F] transition-colors">
              모든 고민 살펴보기 <ArrowRight className="ml-1 size-4" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {curationCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link key={card.title} href={card.href} className="group relative h-[200px] overflow-hidden rounded-[20px] bg-black">
                <img src={card.img} alt={card.title} className="absolute inset-0 h-full w-full object-cover opacity-80 transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 w-full p-5 flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="size-[18px] text-white" strokeWidth={2} />
                    <span className="text-[18px] font-bold text-white">{card.title}</span>
                  </div>
                  <span className="text-[13px] text-white/80">{card.desc}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. 백조오브제 Audit 검증 기준 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-20 lg:mb-28">
        <div className="flex flex-col lg:flex-row overflow-hidden rounded-[24px] bg-white border border-[#F2EFE9] lg:h-[340px] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col justify-center bg-[#FAF9F5] p-8 md:p-10 lg:w-[34%]">
            <span className="text-[12px] font-bold tracking-widest text-[#B99562] uppercase mb-3">백조오브제 Audit</span>
            <h2 className="break-keep text-[28px] md:text-[32px] font-bold leading-[1.25] tracking-tight text-[#18231F]">
              100개 중<br />5개만 선택합니다.
            </h2>
            <p className="mt-4 break-keep text-[14px] leading-[1.65] text-[#68716C]">
              성분, 원료, 제조·유통, 브랜드 운영 방향을 철저히 확인한 상품만 소개합니다.
            </p>
            <Link href="/landing/care-kit" className="mt-8 flex items-center text-[14px] font-bold text-[#18231F] hover:text-[#B99562] transition-colors">
              검증 기준 자세히 보기 <ArrowRight className="ml-1 size-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-6 p-8 md:p-10 lg:w-[66%] lg:grid-cols-4 lg:items-center">
            {[
              { icon: Activity, title: '브랜드 운영 방향', desc: '가치와 철학을 함께 봅니다' },
              { icon: Leaf, title: '성분·원료 정보', desc: '안전한 성분을 확인합니다' },
              { icon: Monitor, title: '제조·유통 기준', desc: '과정을 세밀하게 검토합니다' },
              { icon: Heart, title: '보호자 사용 가치', desc: '실제 사용 경험을 확인합니다' }
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="flex flex-col items-start">
                  <div className="mb-4 flex size-[48px] items-center justify-center rounded-full bg-[#F9F8F5] text-[#18231F]">
                    <Icon className="size-[24px]" strokeWidth={1.5} />
                  </div>
                  <h4 className="text-[15px] font-bold text-[#18231F] mb-1">{item.title}</h4>
                  <p className="text-[13px] leading-[1.5] text-[#68716C] break-keep">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. 우리 아이를 위한 3가지 솔루션 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12 mb-14 md:mb-16 lg:mb-18">
        <h2 className="mb-8 text-[24px] font-bold tracking-tight text-[#18231F] sm:text-[28px]">우리 아이를 위한 3가지 솔루션</h2>
        <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-3">
          
          <Link href="/brands" className="group grid min-w-0 grid-cols-1 md:grid-cols-[minmax(0,62%)_minmax(0,38%)] overflow-hidden rounded-[20px] border border-[#E3DCCF] bg-[#FFFEFB] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            {/* 모바일 뷰: 상단 이미지 */}
            <div className="relative w-full aspect-[16/9] md:hidden overflow-hidden">
               <Image src="/images/solutions/audit.png" alt="솔루션" fill sizes="(max-width: 767px) 100vw, 13vw" className="object-cover object-[48%_center] transition-transform duration-300 group-hover:scale-[1.02]" />
            </div>
            
            <div className="flex min-w-0 flex-col p-[20px] md:p-[22px] lg:p-[26px] xl:p-[30px]">
              <h3 className="text-[22px] md:text-[25px] font-bold leading-[1.28] tracking-[-0.025em] text-[#18231F] break-keep">검증 브랜드</h3>
              <p className="mt-[12px] md:mt-[14px] text-[14px] md:text-[15px] leading-[1.65] text-[#68716C] break-keep line-clamp-2">
                Audit 기준을 철저히 통과한 믿을 수 있는 브랜드와 상품
              </p>
              <div className="mt-auto pt-5 text-[14px] font-semibold text-[#18231F] flex items-center">
                브랜드 보러가기 <ArrowRight className="ml-1 size-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
            
            {/* 데스크탑 뷰: 우측 이미지 */}
            <div className="hidden md:block relative h-full min-h-[220px] w-full overflow-hidden">
               <Image src="/images/solutions/audit.png" alt="솔루션" fill sizes="(max-width: 1023px) 100vw, 13vw" className="object-cover object-[48%_center] transition-transform duration-300 group-hover:scale-[1.02]" />
            </div>
          </Link>

          <Link href="/diagnosis" className="group grid min-w-0 grid-cols-1 md:grid-cols-[minmax(0,62%)_minmax(0,38%)] overflow-hidden rounded-[20px] border border-[#E3DCCF] bg-[#FFFEFB] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="relative w-full aspect-[16/9] md:hidden overflow-hidden">
               <Image src="/images/solutions/curation.png" alt="솔루션" fill sizes="(max-width: 767px) 100vw, 13vw" className="object-cover object-[58%_center] transition-transform duration-300 group-hover:scale-[1.02]" />
            </div>
            
            <div className="flex min-w-0 flex-col p-[20px] md:p-[22px] lg:p-[26px] xl:p-[30px]">
              <h3 className="text-[22px] md:text-[25px] font-bold leading-[1.28] tracking-[-0.025em] text-[#18231F] break-keep">고민별 큐레이션</h3>
              <p className="mt-[12px] md:mt-[14px] text-[14px] md:text-[15px] leading-[1.65] text-[#68716C] break-keep line-clamp-2">
                우리 아이의 증상과 고민에 딱 맞는 상품 맞춤 추천
              </p>
              <div className="mt-auto pt-5 text-[14px] font-semibold text-[#18231F] flex items-center">
                큐레이션 보러가기 <ArrowRight className="ml-1 size-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
            
            <div className="hidden md:block relative h-full min-h-[220px] w-full overflow-hidden">
               <Image src="/images/solutions/curation.png" alt="솔루션" fill sizes="(max-width: 1023px) 100vw, 13vw" className="object-cover object-[58%_center] transition-transform duration-300 group-hover:scale-[1.02]" />
            </div>
          </Link>

          <Link href="/insurance" className="group grid min-w-0 grid-cols-1 md:grid-cols-[minmax(0,62%)_minmax(0,38%)] overflow-hidden rounded-[20px] border border-[#E3DCCF] bg-[#FFFEFB] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
            <div className="relative w-full aspect-[16/9] md:hidden overflow-hidden">
               <Image src="/images/solutions/insurance.png" alt="솔루션" fill sizes="(max-width: 767px) 100vw, 13vw" className="object-cover object-[62%_center] transition-transform duration-300 group-hover:scale-[1.02]" />
            </div>
            
            <div className="flex min-w-0 flex-col p-[20px] md:p-[22px] lg:p-[26px] xl:p-[30px]">
              <h3 className="text-[22px] md:text-[25px] font-bold leading-[1.28] tracking-[-0.025em] text-[#18231F] break-keep">펫보험 비교</h3>
              <p className="mt-[12px] md:mt-[14px] text-[14px] md:text-[15px] leading-[1.65] text-[#68716C] break-keep line-clamp-2">
                복잡한 보장 조건을 우리 아이 맞춤으로 한눈에 비교
              </p>
              <div className="mt-auto pt-5 text-[14px] font-semibold text-[#18231F] flex items-center">
                보험 분석 알아보기 <ArrowRight className="ml-1 size-3 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
            
            <div className="hidden md:block relative h-full min-h-[220px] w-full overflow-hidden">
               <Image src="/images/solutions/insurance.png" alt="솔루션" fill sizes="(max-width: 1023px) 100vw, 13vw" className="object-cover object-[62%_center] transition-transform duration-300 group-hover:scale-[1.02]" />
            </div>
          </Link>
        </div>
      </section>

      {/* 7 & 8. 검증 브랜드 셀렉션 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-20 lg:mb-28">
        <BrandShowcaseSlider brands={displayBrands} productsByBrand={products.reduce((acc, p) => {
          if (!acc[p.brandId]) acc[p.brandId] = [];
          acc[p.brandId].push(p);
          return acc;
        }, {} as Record<string, Product[]>)} />
      </section>

      {/* 9. 펫보험 안내 배너 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-20 lg:mb-28">
        <div className="relative flex h-[260px] md:h-[240px] overflow-hidden rounded-[24px] bg-[#1A2F25] px-6 py-8 md:px-12 md:py-0 md:items-center">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between w-full h-full md:h-auto">
            <div className="flex flex-col items-start text-white max-w-[400px]">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="size-5 text-[#B99562]" strokeWidth={2} />
                <span className="text-[14px] font-semibold text-[#B99562]">펫보험 보장 확인</span>
              </div>
              <h2 className="text-[24px] md:text-[28px] font-bold leading-[1.3] tracking-tight">
                보험도 우리 아이 기준으로.
              </h2>
              <p className="mt-2 text-[14px] md:text-[15px] leading-[1.6] text-white/80 break-keep">
                보험 상품을 우리 아이의 조건에 맞게 비교해 보세요. 가장 적합한 펫보험을 찾아보세요.
              </p>
            </div>
            
            <div className="mt-auto md:mt-0 relative z-20 shrink-0">
              <Link href="/insurance" className="flex h-[48px] items-center justify-center rounded-xl bg-white/10 border border-white/20 px-8 text-[14px] font-bold text-white transition-colors hover:bg-white hover:text-[#18231F] backdrop-blur-sm">
                보험 분석 알아보기
              </Link>
            </div>
          </div>
          <div className="absolute bottom-0 right-0 h-[85%] md:h-[120%] w-[50%] md:w-[45%] opacity-90 mix-blend-luminosity">
            <img src="/images/care_guide_hero.png" alt="강아지와 고양이" className="h-full w-full object-cover object-left-top scale-x-[-1]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1A2F25] to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A2F25] to-transparent md:hidden"></div>
          </div>
        </div>
      </section>

      {/* 10. 반려가족 후기와 백조 소식 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          <div className="w-full lg:w-[58%]">
            <div className="flex items-end justify-between mb-8 border-b border-[#DED8CC] pb-4">
              <h2 className="text-[20px] font-bold tracking-tight text-[#18231F]">반려가족 후기</h2>
              <Link href="/reviews" className="flex items-center text-[13px] font-bold text-[#68716C] hover:text-[#B99562] transition-colors">
                더 보기 <ArrowRight className="ml-1 size-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {reviews.slice(0, 2).map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  productName={products.find((p) => p.id === review.productId)?.name}
                />
              ))}
            </div>
          </div>
          <div className="w-full lg:w-[42%]">
            <div className="flex items-end justify-between mb-8 border-b border-[#DED8CC] pb-4">
              <h2 className="text-[20px] font-bold tracking-tight text-[#18231F]">백조 소식</h2>
              <Link href="/notices" className="flex items-center text-[13px] font-bold text-[#68716C] hover:text-[#B99562] transition-colors">
                더 보기 <ArrowRight className="ml-1 size-3" />
              </Link>
            </div>
            <div className="flex flex-col">
              {recentNotices.map((notice) => (
                <Link key={notice.id} href={`/notices/${notice.id}`} className="group flex flex-col gap-2 border-b border-[#F2EFE9] py-5 transition-colors hover:bg-white/50 first:pt-0">
                  <div className="flex items-center justify-between">
                    <p className="line-clamp-1 break-keep text-[15px] font-medium text-[#18231F] group-hover:text-[#B99562] transition-colors">
                      {notice.title}
                    </p>
                    <time className="shrink-0 font-editorial text-[13px] italic text-[#68716C]">
                      {formatDate(notice.date)}
                    </time>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
