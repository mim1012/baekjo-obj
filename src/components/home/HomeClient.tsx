'use client';

import { Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, ShieldCheck, Activity, Leaf, Monitor, Heart,
  Droplet, Sparkles, Bone, Scale, Grid, Dog, Cat, Rabbit, Utensils, Bath, HeartPulse, Stethoscope, Store
} from 'lucide-react';
import type { HomeSettings } from '@/data/homeContent';
import BrandShowcaseSlider from '@/components/home/BrandShowcaseSlider';
import ProductCard from '@/components/common/ProductCard';
import ReviewCard from '@/components/common/ReviewCard';
import { sortProducts } from '@/lib/filters';
import { formatDate } from '@/lib/format';
import type { Brand, Notice, Product, Review } from '@/types';

type HomeClientSettings = Omit<HomeSettings, 'solutions'>;

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

export default function HomeClient({
  products,
  brands,
  notices,
  reviews,
  settings,
}: {
  products: Product[];
  brands: Brand[];
  notices: Notice[];
  reviews: Review[];
  settings: HomeClientSettings;
}) {
  const bestProducts = sortProducts(
    products.filter((product) => product.isBest || product.isRecommended),
    'popular',
  ).slice(0, 3);
  const recentNotices = notices.slice(0, 4);
  const displayBrands = brands.filter(b => b.isVisible !== false);

  const { hero, quickShop, curation, audit, insuranceBanner, trustBoard } = settings;
  const bestProductsCopy = settings.bestProducts;

  // 아이콘·href·이미지 등 "구조"는 여기 하드코딩으로 두고, 문구만 settings 로 오버레이한다.
  const quickLinks = [
    { icon: Grid, href: '/shop' },
    { icon: Dog, href: '/shop?petType=dog' },
    { icon: Cat, href: '/shop?petType=cat' },
    { icon: Rabbit, href: '/shop?petType=small' },
    { icon: Utensils, href: '/shop?category=dining-and-nourish' },
    { icon: Bath, href: '/shop?category=fragrance-and-hygiene' },
    { icon: HeartPulse, href: '/shop?category=wellness-and-care' },
    { icon: Stethoscope, href: '/concerns' },
    { icon: Store, href: '/brands' },
  ];

  const curationCards = [
    { icon: Droplet, href: '/concerns/tear', img: '/images/curation_tear.png' },
    { icon: Sparkles, href: '/concerns/skin', img: '/images/curation_skin.png' },
    { icon: Bone, href: '/concerns/joint', img: '/images/curation_joint.png' },
    { icon: Scale, href: '/concerns/obesity', img: '/images/curation_weight.png' },
  ];

  const auditCriteriaIcons = [Activity, Leaf, Monitor, Heart];

  return (
    <main className="flex flex-col bg-[#FCFBF8] min-h-screen pb-20">
      {/* 1. 메인 히어로 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 pt-6 md:pt-10 pb-8 md:pb-14 lg:pt-14 lg:pb-16">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between lg:h-[500px] gap-8 md:gap-10 lg:gap-14">
          <div className="flex w-full flex-col items-start lg:w-[47%]">
            <span className="block text-[11px] lg:text-[12px] font-bold tracking-[0.12em] text-[#7A4E1D] uppercase mb-3 md:mb-4">{hero.eyebrow}</span>
            <h1 className="text-[30px] md:text-[34px] lg:text-[44px] font-bold leading-[1.2] lg:leading-[1.18] tracking-[-0.035em] text-[#17231E] break-keep">
              {renderLines(hero.titleLines)}
            </h1>
            <p className="mt-4 md:mt-[20px] lg:mt-[24px] max-w-[500px] text-[14px] md:text-[15px] lg:text-[16px] leading-[1.7] text-[#59615B] break-keep">
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

      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-14 md:mb-[72px] lg:mb-[88px]">
        <div className="overflow-hidden rounded-[24px] border border-[#E7E2D9] bg-[#F6F3ED] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex flex-col justify-center p-6 md:p-8 lg:p-10">
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7A4E1D]">{audit.badge}</span>
              <h2 className="mt-3 break-keep text-[28px] font-bold leading-[1.22] tracking-tight text-[#17231E] md:text-[36px] lg:text-[42px]">
                {renderLines(audit.titleLines)}
              </h2>
              <p className="mt-4 max-w-[560px] break-keep text-[14px] leading-[1.7] text-[#68716C] md:text-[15px]">
                {audit.description}
              </p>
              <Link href="/audit" className="mt-6 inline-flex h-11 w-fit items-center justify-center rounded-full bg-[#173C32] px-5 text-[13px] font-bold text-white transition-colors hover:bg-[#2F3B34]">
                {audit.linkLabel} <ArrowRight className="ml-1.5 size-4" />
              </Link>
            </div>

            <div className="flex items-center justify-center bg-[#EDE8DD] p-6 md:p-8 lg:p-10">
              <div className="relative h-[180px] w-full max-w-[320px] overflow-hidden rounded-[18px] border border-white/70 bg-white shadow-sm md:h-[220px]">
                <Image
                  src="/images/baekjo-audit-logo.png"
                  alt="백조오브제 Audit 엠블럼"
                  fill
                  sizes="(max-width: 1024px) 80vw, 320px"
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>

          <div className="grid border-t border-[#E0D8CA] bg-white md:grid-cols-2 lg:grid-cols-4">
            {auditCriteriaIcons.map((Icon, idx) => {
              const item = audit.criteria[idx] ?? { title: '', desc: '' };
              return (
                <div key={idx} className="border-b border-[#E7E2D9] p-5 last:border-b-0 md:border-r md:last:border-r-0 lg:border-b-0">
                  <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-[#F8F6F0] text-[#17231E]">
                    <Icon className="size-5" strokeWidth={1.5} />
                  </div>
                  <h3 className="break-keep text-[15px] font-bold text-[#17231E]">{item.title}</h3>
                  <p className="mt-2 break-keep text-[13px] leading-[1.55] text-[#68716C]">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

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

      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-16 md:mb-20 lg:mb-28">
        <div className="flex items-end justify-between mb-6 md:mb-8">
          <h2 className="text-[22px] md:text-[24px] font-bold tracking-tight text-[#18231F] sm:text-[28px]">{bestProductsCopy.title}</h2>
          <Link href="/shop" className="hidden sm:flex items-center text-[14px] font-semibold text-[#59615B] hover:text-[#7A4E1D] transition-colors">
            {bestProductsCopy.linkLabel} <ArrowRight className="ml-1 size-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 md:gap-5">
          {bestProducts.map((product) => (
            <div key={product.id} className="min-w-0">
              <ProductCard product={product} variant="home" />
            </div>
          ))}
        </div>
        <Link href="/shop" className="mt-8 flex w-full h-[48px] items-center justify-center rounded-xl border border-[#DED8CC] text-[14px] font-bold text-[#18231F] sm:hidden">
          {bestProductsCopy.linkLabel}
        </Link>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-16 md:mb-20 lg:mb-28">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 md:mb-8 gap-4">
          <div>
            <h2 className="text-[22px] md:text-[24px] font-bold tracking-tight text-[#18231F] sm:text-[28px]">{curation.title}</h2>
            <p className="mt-2 text-[14px] md:text-[15px] text-[#59615B]">{curation.description}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/diagnosis" className="text-[13px] md:text-[14px] font-bold text-[#7A4E1D] hover:text-[#17211D] transition-colors">
              {curation.diagnosisLinkLabel}
            </Link>
            <Link href="/concerns" className="flex items-center text-[13px] md:text-[14px] font-semibold text-[#59615B] hover:text-[#18231F] transition-colors">
              {curation.allConcernsLinkLabel} <ArrowRight className="ml-1 size-4" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          {curationCards.map((card, i) => {
            const title = curation.cards[i]?.title ?? '';
            const desc = curation.cards[i]?.desc ?? '';
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group relative flex h-[210px] min-w-0 flex-col overflow-hidden rounded-[18px] bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#173C32] lg:h-[228px]"
              >
                <div className="absolute inset-0 z-0 h-full w-full overflow-hidden bg-black">
                  <Image
                    src={card.img}
                    alt={title}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="absolute inset-0 z-10 bg-black/[0.08]" />
                <div className="absolute inset-x-0 bottom-0 z-10 h-[62%] bg-gradient-to-t from-black/60 via-black/25 to-transparent" />
                <div className="relative z-20 flex h-full flex-col justify-end p-[18px] break-keep">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-[18px] font-bold text-white lg:text-[19px]">{title}</span>
                  </div>
                  <span className="line-clamp-2 text-[12px] font-medium leading-[1.55] text-[#F5F1E9] lg:text-[13px]">{desc}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-16 md:mb-20 lg:mb-28">
        <BrandShowcaseSlider brands={displayBrands} />
      </section>

      {/* 9. 펫보험 안내 배너 */}
      <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-16 md:mb-20 lg:mb-28">
        <div className="relative flex h-auto min-h-[210px] md:min-h-[240px] overflow-hidden rounded-[24px] bg-[#1A2F25] px-6 py-8 md:px-12 md:py-0 md:items-center">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between w-full h-full md:h-auto gap-6 md:gap-0">
            <div className="flex flex-col items-start text-white max-w-[400px]">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <ShieldCheck className="size-5 text-[#B99562]" strokeWidth={2} />
                <span className="text-[13px] md:text-[14px] font-semibold text-[#D8C4A3]">{insuranceBanner.eyebrow}</span>
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
              <Link href="/reviews" className="flex items-center text-[13px] font-bold text-[#59615B] hover:text-[#7A4E1D] transition-colors">
                {trustBoard.reviewsLinkLabel} <ArrowRight className="ml-1 size-3" />
              </Link>
            </div>
            <div className="horizontal-snap-rail pb-4" tabIndex={0} role="region" aria-label="보호자 후기 가로 스크롤">
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
              <Link href="/notices" className="flex items-center text-[13px] font-bold text-[#59615B] hover:text-[#7A4E1D] transition-colors">
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
                    <time className="shrink-0 font-editorial text-[13px] italic text-[#59615B]">
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
