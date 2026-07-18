'use client';

import { Fragment, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, ShieldCheck, Activity, Leaf, Monitor, Heart,
  Droplet, Sparkles, Bone, Scale, Grid, Dog, Cat, Utensils, Bath, HeartPulse, Stethoscope, Store, ChevronDown
} from 'lucide-react';
import { defaultHomeSettings, type HomeSettings } from '@/data/homeContent';
import BrandShowcaseSlider from '@/components/home/BrandShowcaseSlider';
import ProductCard from '@/components/common/ProductCard';
import ReviewCard from '@/components/common/ReviewCard';
import { sortProducts } from '@/lib/filters';
import { formatDate } from '@/lib/format';
import type { Brand, Notice, Product, Review } from '@/types';

// 줄바꿈은 마크업이 아니라 구조(string[])로 다룬다(§ homeContent). 각 줄 사이에만 <br /> 를
// 넣어 하드코딩 시절 DOM 과 동일하게 렌더한다. brClassName 은 반응형 줄바꿈(예: 'hidden sm:block').
function renderLines(lines: string[], brClassName?: string) {
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br className={brClassName} />}
      {line}
    </Fragment>
  ));
}

// 솔루션 카드의 구조(href·이미지)는 하드코딩, 문구(title·desc·linkLabel)는 settings 로 오버레이한다.
const SOLUTION_CARDS = [
  {
    href: '/brands',
    image: '/images/solutions/audit.png',
    imageAlt: '검증 브랜드와 상품',
    imagePosition: 'object-[48%_center]',
  },
  {
    href: '/diagnosis',
    image: '/images/solutions/curation.png',
    imageAlt: '반려동물 고민별 맞춤 큐레이션',
    imagePosition: 'object-[58%_center]',
  },
  {
    href: '/insurance',
    image: '/images/solutions/insurance.png',
    imageAlt: '반려동물 보험 비교 안내',
    imagePosition: 'object-[62%_center]',
  },
] as const;

export default function HomeClient({
  products,
  brands,
  notices,
  reviews,
  settings = defaultHomeSettings,
}: {
  products: Product[];
  brands: Brand[];
  notices: Notice[];
  reviews: Review[];
  settings?: HomeSettings;
}) {
  const [openAuditIndex, setOpenAuditIndex] = useState(0);
  const bestProducts = sortProducts(
    products.filter((product) => product.isBest || product.isRecommended),
    'popular',
  ).slice(0, 4);
  const recentNotices = notices.slice(0, 4);
  const displayBrands = brands.filter(b => b.isVisible !== false);

  const { hero, quickShop, curation, audit, solutions, insuranceBanner, trustBoard } = settings;
  const bestProductsCopy = settings.bestProducts;

  // 아이콘·href·이미지 등 "구조"는 여기 하드코딩으로 두고, 문구만 settings 로 오버레이한다.
  const quickLinks = [
    { icon: Grid, href: '/shop' },
    { icon: Dog, href: '/shop?petType=dog' },
    { icon: Cat, href: '/shop?petType=cat' },
    { icon: Utensils, href: '/shop?category=dining-and-nourish' },
    { icon: Bath, href: '/shop?category=fragrance-and-hygiene' },
    { icon: HeartPulse, href: '/shop?category=wellness-and-care' },
    { icon: Stethoscope, href: '/concerns' },
    { icon: Store, href: '/brands' },
  ];

  const curationCards = [
    { icon: Droplet, href: '/concerns/tear', img: '/images/hero-curation-visual.png' },
    { icon: Sparkles, href: '/concerns/skin', img: '/images/hero-bg.jpg' },
    { icon: Bone, href: '/concerns/joint', img: '/images/hero-curation-visual-natural.png' },
    { icon: Scale, href: '/concerns/obesity', img: '/images/care_guide_hero.png' },
  ];

  const auditCriteriaIcons = [Activity, Leaf, Monitor, Heart];

  return (
    <main className="flex flex-col bg-[#FCFBF8] min-h-screen pb-20">
      {/* 1. 메인 히어로 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 pt-6 md:pt-10 pb-8 md:pb-14 lg:pt-14 lg:pb-16">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:h-[500px] gap-8 md:gap-10 lg:gap-14">
          <div className="flex w-full flex-col items-start lg:w-[47%]">
            <span className="block text-[11px] lg:text-[12px] font-bold tracking-[0.12em] text-[#B68B4E] uppercase mb-3 md:mb-4">{hero.eyebrow}</span>
            <h1 className="text-[30px] md:text-[34px] lg:text-[44px] font-bold leading-[1.2] lg:leading-[1.18] tracking-[-0.035em] text-[#17231E] break-keep">
              {renderLines(hero.titleLines)}
            </h1>
            <p className="mt-4 md:mt-[20px] lg:mt-[24px] max-w-[500px] text-[14px] md:text-[15px] lg:text-[16px] leading-[1.7] text-[#72766F] break-keep">
              {renderLines(hero.descriptionLines, 'hidden sm:block')}
            </p>
            <div className="mt-6 md:mt-7 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link href="/shop" className="flex h-[48px] lg:h-[50px] items-center justify-center rounded-xl bg-[#18231F] px-8 text-[15px] font-bold text-white transition-colors hover:bg-[#2F3B34]">
                {hero.primaryCtaLabel}
              </Link>
              <Link href="/concerns" className="flex h-[48px] lg:h-[50px] items-center justify-center rounded-xl border border-[#DED8CC] bg-white px-8 text-[15px] font-bold text-[#18231F] transition-colors hover:border-[#B99562]">
                {hero.secondaryCtaLabel}
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-2 text-[13px] font-medium text-[#68716C]">
              <ShieldCheck className="size-4 text-[#B99562]" strokeWidth={2} />
              {hero.trustNote}
            </div>
          </div>
          <div className="w-full lg:w-[53%] aspect-[4/3] min-h-[260px] sm:aspect-auto sm:h-[400px] lg:h-full relative overflow-hidden rounded-[24px]">
            <img src="/images/poodle-pet-food.png" alt="백조오브제 펫 푸드와 푸들" className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute right-5 top-5 inline-flex items-center gap-2 rounded-xl bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
              <ShieldCheck className="size-4 text-[#2E7D32]" strokeWidth={2} />
              <div className="flex flex-col">
                <span className="text-[12px] font-bold leading-none text-[#18231F]">{hero.badgeTitle}</span>
                <span className="mt-0.5 text-[10px] text-[#68716C]">{hero.badgeSubtitle}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 빠른 쇼핑 카테고리 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-16 md:mb-20 lg:mb-24">
        <div className="rounded-[20px] bg-white border border-[#F2EFE9] p-4 md:p-6 lg:p-8 flex flex-col xl:flex-row xl:items-center gap-4 md:gap-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <h3 className="text-[15px] md:text-[16px] font-bold text-[#18231F] shrink-0">{quickShop.title}</h3>
          <div className="grid grid-cols-4 gap-y-4 gap-x-2 md:flex md:flex-wrap md:gap-x-8 xl:flex-1 xl:justify-between">
            {quickLinks.map((link, i) => {
              const Icon = link.icon;
              const name = quickShop.links[i]?.name ?? '';
              return (
                <Link key={link.href} href={link.href} className="group flex flex-col items-center gap-2 md:gap-3">
                  <div className="flex size-[48px] md:size-[52px] items-center justify-center rounded-full bg-[#F9F8F5] text-[#18231F] transition-colors group-hover:bg-[#F2EFE9]">
                    <Icon className="size-[22px] md:size-[24px]" strokeWidth={1.5} />
                  </div>
                  <span className="text-[12px] md:text-[13px] font-medium text-[#68716C] group-hover:text-[#18231F] whitespace-nowrap tracking-tight">{name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Audit 추천 상품 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-16 md:mb-20 lg:mb-28">
        <div className="flex items-end justify-between mb-6 md:mb-8">
          <h2 className="text-[22px] md:text-[24px] font-bold tracking-tight text-[#18231F] sm:text-[28px]">{bestProductsCopy.title}</h2>
          <Link href="/shop" className="hidden sm:flex items-center text-[14px] font-semibold text-[#68716C] hover:text-[#B99562] transition-colors">
            {bestProductsCopy.linkLabel} <ArrowRight className="ml-1 size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4 xl:gap-6">
          {bestProducts.map((product) => (
            <div key={product.id} className="min-w-0">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
        <Link href="/shop" className="mt-8 flex w-full h-[48px] items-center justify-center rounded-xl border border-[#DED8CC] text-[14px] font-bold text-[#18231F] sm:hidden">
          {bestProductsCopy.linkLabel}
        </Link>
      </section>

      {/* 4. 고민별 맞춤 큐레이션 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-16 md:mb-20 lg:mb-28">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h2 className="text-[22px] md:text-[24px] font-bold tracking-tight text-[#18231F] sm:text-[28px]">{curation.title}</h2>
            <p className="mt-2 text-[14px] md:text-[15px] text-[#68716C]">{curation.description}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/diagnosis" className="text-[13px] md:text-[14px] font-bold text-[#B99562] hover:text-[#A8742E] transition-colors">
              {curation.diagnosisLinkLabel}
            </Link>
            <Link href="/concerns" className="flex items-center text-[13px] md:text-[14px] font-semibold text-[#68716C] hover:text-[#18231F] transition-colors">
              {curation.allConcernsLinkLabel} <ArrowRight className="ml-1 size-4" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          {curationCards.map((card, i) => {
            const Icon = card.icon;
            const title = curation.cards[i]?.title ?? '';
            const desc = curation.cards[i]?.desc ?? '';
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-[#E4DDD1] bg-white md:relative md:block md:h-[200px] md:rounded-[20px] md:border-0 md:bg-[#17211D]"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-[#F2EEE6] md:absolute md:inset-0 md:aspect-auto md:h-full">
                  <img
                    src={card.img}
                    alt={title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 md:opacity-80"
                  />
                  <div className="absolute inset-0 hidden bg-gradient-to-t from-[#17211D]/90 via-[#17211D]/20 to-transparent md:block"></div>
                </div>
                <div className="flex flex-1 flex-col p-4 md:absolute md:bottom-0 md:left-0 md:w-full md:p-5">
                  <span className="mb-2 text-[11px] font-medium tracking-[0.08em] text-[#9A8973] md:hidden">고민별 케어</span>
                  <div className="mb-1 flex items-center gap-2">
                    <Icon className="size-[18px] shrink-0 text-[#17211D] md:text-white" strokeWidth={2} />
                    <span className="text-[16px] font-bold text-[#17211D] md:text-[18px] md:text-white">{title}</span>
                  </div>
                  <span className="text-[13px] font-normal leading-[1.55] text-[#6E6A63] md:text-white/80">{desc}</span>
                  <span className="mt-4 text-[12px] font-semibold text-[#9A6A2F] md:hidden">살펴보기 →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. 백조오브제 Audit 검증 기준 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-16 md:mb-20 lg:mb-28">
        <div className="flex flex-col lg:flex-row overflow-hidden rounded-[24px] bg-white border border-[#F2EFE9] md:min-h-[340px] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col justify-center bg-[#FAF9F5] p-6 md:p-8 lg:p-10 lg:w-[34%]">
            <span className="text-[12px] font-bold tracking-widest text-[#B99562] uppercase mb-3">{audit.badge}</span>
            <h2 className="break-keep text-[26px] md:text-[28px] lg:text-[32px] font-bold leading-[1.25] tracking-tight text-[#18231F]">
              {renderLines(audit.titleLines)}
            </h2>
            <p className="mt-4 break-keep text-[14px] leading-[1.65] text-[#68716C]">
              {audit.description}
            </p>
            <Link href="/audit" className="mt-6 md:mt-8 flex items-center text-[14px] font-bold text-[#18231F] hover:text-[#B99562] transition-colors">
              {audit.linkLabel} <ArrowRight className="ml-1 size-4" />
            </Link>
          </div>
          <div className="flex flex-col p-6 gap-2 md:p-8 md:grid md:grid-cols-2 md:gap-6 lg:p-10 lg:w-[66%] lg:grid-cols-4 lg:items-center">
            {auditCriteriaIcons.map((Icon, idx) => {
              const item = audit.criteria[idx] ?? { title: '', desc: '' };
              const isOpen = openAuditIndex === idx;
              return (
                <div key={idx} className="flex flex-col border-b border-[#F2EFE9] last:border-0 pb-3 md:pb-0 md:border-0 md:last:border-0">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between py-2 md:py-0 md:cursor-default"
                    aria-expanded={isOpen}
                    onClick={() => setOpenAuditIndex(isOpen ? -1 : idx)}
                  >
                    <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-0">
                      <div className="flex size-[36px] md:size-[48px] md:mb-4 items-center justify-center rounded-full bg-[#F9F8F5] text-[#18231F]">
                        <Icon className="size-[18px] md:size-[24px]" strokeWidth={1.5} />
                      </div>
                      <h4 className="text-[15px] font-bold text-[#18231F] md:mb-1">{item.title}</h4>
                    </div>
                    <ChevronDown className={`size-5 text-[#68716C] transition-transform md:hidden ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 md:!h-auto md:!opacity-100 md:!mt-0 ${isOpen ? 'mt-2 mb-2 h-auto opacity-100' : 'h-0 opacity-0'}`}>
                    <p className="text-[13px] leading-[1.5] text-[#68716C] break-keep">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. 우리 아이를 위한 3가지 솔루션 */}
      <section className="mx-auto mb-14 w-full max-w-[1280px] overflow-hidden px-5 md:mb-16 md:px-7 lg:mb-18 lg:px-10 xl:px-12">
        <h2 className="mb-6 md:mb-8 text-[22px] md:text-[24px] font-bold tracking-tight text-[#18231F] sm:text-[28px]">{solutions.title}</h2>
        <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 md:grid-cols-1 md:gap-5 lg:grid-cols-3">
          {SOLUTION_CARDS.map((card, i) => (
            <Link
              key={card.href}
              href={card.href}
              className="group grid min-w-0 max-w-full grid-cols-[104px_minmax(0,1fr)] overflow-hidden rounded-[16px] border border-[#E3DCCF] bg-[#FFFEFB] shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-500 ease-out hover:-translate-y-1 hover:border-[#D8C4A3]/60 hover:shadow-[0_20px_40px_-15px_rgba(23,33,29,0.05)] md:w-auto md:grid-cols-[minmax(0,62%)_minmax(0,38%)] md:rounded-[20px]"
            >
              {/* 모바일: 이미지 왼쪽, 정보 오른쪽 */}
              <div className="relative min-h-32 w-full overflow-hidden bg-[#F2EEE6] md:hidden">
                <Image
                  src={card.image}
                  alt={card.imageAlt}
                  fill
                  sizes="104px"
                  className={`object-cover ${card.imagePosition} transition-transform duration-700 ease-out group-hover:scale-105`}
                />
              </div>

              <div className="flex min-w-0 flex-col p-3 md:p-[22px] lg:p-[26px] xl:p-[30px]">
                <h3 className="break-keep text-[15px] font-bold leading-[1.3] tracking-[-0.025em] text-[#18231F] md:text-[25px] md:leading-[1.28]">
                  {solutions.cards[i]?.title ?? ''}
                </h3>
                <p className="mt-2 break-keep text-[12px] leading-[1.6] text-[#68716C] md:mt-[14px] md:text-[15px]">
                  {solutions.cards[i]?.desc ?? ''}
                </p>
                <div className="mt-auto flex min-w-0 items-center pt-2 text-[12px] font-semibold leading-[1.4] text-[#18231F] md:mt-5 md:pt-0 md:text-[14px]">
                  <span className="break-keep">{solutions.cards[i]?.linkLabel ?? ''}</span>
                  <ArrowRight className="ml-1 size-3 shrink-0 transition-transform duration-500 ease-out group-hover:translate-x-1" />
                </div>
              </div>

              {/* 태블릿·데스크톱: 기존 우측 이미지 구성 유지 */}
              <div className="relative hidden h-full min-h-[220px] w-full overflow-hidden bg-[#F2EEE6] md:block">
                <Image
                  src={card.image}
                  alt={card.imageAlt}
                  fill
                  sizes="(max-width: 1023px) 38vw, 13vw"
                  className={`object-cover ${card.imagePosition} transition-transform duration-700 ease-out group-hover:scale-105`}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 7 & 8. 검증 브랜드 셀렉션 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-16 md:mb-20 lg:mb-28">
        <BrandShowcaseSlider brands={displayBrands} productsByBrand={products.reduce((acc, p) => {
          if (!acc[p.brandId]) acc[p.brandId] = [];
          acc[p.brandId].push(p);
          return acc;
        }, {} as Record<string, Product[]>)} />
      </section>

      {/* 9. 펫보험 안내 배너 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-16 md:mb-20 lg:mb-28">
        <div className="relative flex h-auto min-h-[210px] md:min-h-[240px] overflow-hidden rounded-[24px] bg-[#1A2F25] px-6 py-8 md:px-12 md:py-0 md:items-center">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between w-full h-full md:h-auto gap-6 md:gap-0">
            <div className="flex flex-col items-start text-white max-w-[400px]">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <ShieldCheck className="size-5 text-[#B99562]" strokeWidth={2} />
                <span className="text-[13px] md:text-[14px] font-semibold text-[#B99562]">{insuranceBanner.eyebrow}</span>
              </div>
              <h2 className="text-[22px] md:text-[28px] font-bold leading-[1.3] tracking-tight">
                {insuranceBanner.title}
              </h2>
              <p className="mt-2 text-[13px] md:text-[15px] leading-[1.6] text-white/80 break-keep">
                {insuranceBanner.description}
              </p>
            </div>

            <div className="mt-2 md:mt-0 relative z-20 shrink-0">
              <Link href="/insurance" className="flex h-[48px] items-center justify-center rounded-xl bg-white/10 border border-white/20 px-8 text-[14px] font-bold text-white transition-colors hover:bg-white hover:text-[#18231F] backdrop-blur-sm">
                {insuranceBanner.buttonLabel}
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

      {/* 10. 반려가족 후기와 백조오브제 소식 */}
      <section className="mx-auto mb-12 w-full max-w-[1280px] rounded-[24px] bg-[#F2EEE5] px-5 py-8 md:mb-16 md:px-7 md:py-10 lg:px-10 xl:px-14">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          <div className="w-full lg:w-[58%]">
            <div className="flex items-end justify-between mb-8 border-b border-[#DED8CC] pb-4">
              <h2 className="text-[20px] font-bold tracking-tight text-[#18231F]">{trustBoard.reviewsTitle}</h2>
              <Link href="/reviews" className="flex items-center text-[13px] font-bold text-[#68716C] hover:text-[#B99562] transition-colors">
                {trustBoard.reviewsLinkLabel} <ArrowRight className="ml-1 size-3" />
              </Link>
            </div>
            <div className="horizontal-snap-rail pb-4">
              {reviews.map((review) => (
                <div key={review.id} className="horizontal-snap-item sm:basis-[calc(50%-0.625rem)]">
                  <ReviewCard
                    review={review}
                    productName={products.find((p) => p.id === review.productId)?.name}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="w-full lg:w-[42%]">
            <div className="flex items-end justify-between mb-8 border-b border-[#DED8CC] pb-4">
              <h2 className="text-[20px] font-bold tracking-tight text-[#18231F]">{trustBoard.noticesTitle}</h2>
              <Link href="/notices" className="flex items-center text-[13px] font-bold text-[#68716C] hover:text-[#B99562] transition-colors">
                {trustBoard.noticesLinkLabel} <ArrowRight className="ml-1 size-3" />
              </Link>
            </div>
            <div className="flex flex-col">
              {recentNotices.map((notice) => (
                <Link key={notice.id} href={`/notices/${notice.id}`} className="group flex flex-col gap-2 border-b border-[#F2EFE9] py-5 transition-colors hover:bg-white/50 first:pt-0">
                  <div className="flex items-center justify-between">
                    <p className="min-w-0 break-keep pr-4 text-[15px] font-medium text-[#18231F] transition-colors group-hover:text-[#B99562]">
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
