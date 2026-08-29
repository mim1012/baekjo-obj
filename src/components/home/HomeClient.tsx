'use client';

import { Fragment } from 'react';
import Image, { getImageProps } from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, ShieldCheck, Activity, Leaf, Monitor, Heart,
  Droplet, Sparkles, Bone, Scale, Dog, Cat, Rabbit, Utensils, Bath, HeartPulse
} from 'lucide-react';
import type { HomeSettings } from '@/data/homeContent';
import BrandShowcaseSlider from '@/components/home/BrandShowcaseSlider';
import ProductCard from '@/components/common/ProductCard';
import ReviewCard from '@/components/common/ReviewCard';
import { FEATURES } from '@/config/features';
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

const { props: desktopHeroImageProps } = getImageProps({
  src: '/images/home-hero-pet-lifestyle-desktop.png',
  alt: '반려동물과 함께하는 백조오브제의 펫 라이프스타일 제품',
  fill: true,
  sizes: '100vw',
  quality: 90,
  priority: true,
});

const { props: { srcSet: mobileHeroSrcSet } } = getImageProps({
  src: '/images/home-hero-pet-lifestyle-mobile.png',
  alt: '반려동물과 함께하는 백조오브제의 펫 라이프스타일 제품',
  fill: true,
  sizes: '100vw',
  quality: 90,
  priority: true,
});

const { props: desktopAuditImageProps } = getImageProps({
  src: '/images/home-audit-client-photo-extended-v4.png',
  alt: '백조오브제 브랜드 패키지 오브제',
  fill: true,
  sizes: '(max-width: 1280px) 100vw, 1168px',
  quality: 90,
});

const { props: { srcSet: mobileAuditSrcSet } } = getImageProps({
  src: '/images/home-audit-client-photo-v3.png',
  alt: '백조오브제 브랜드 패키지 오브제',
  fill: true,
  sizes: '100vw',
  quality: 90,
});

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
    { icon: Dog, href: '/shop?petType=dog' },
    { icon: Cat, href: '/shop?petType=cat' },
    { icon: Rabbit, href: '/shop?petType=small' },
    { icon: Utensils, href: '/shop?category=food-nutrition' },
    { icon: Bath, href: '/shop?category=care' },
    { icon: HeartPulse, href: '/concerns' },
  ];

  const curationCards = [
    { icon: Droplet, href: '/concerns/tear', img: '/images/curation_tear.png', title: '눈물', desc: '눈물 자국이 신경 쓰일 때' },
    { icon: Sparkles, href: '/concerns/skin', img: '/images/curation_skin.png', title: '피부', desc: '피부를 자주 긁을 때' },
    { icon: Bone, href: '/concerns/joint', img: '/images/curation_joint.png', title: '관절', desc: '걸음걸이가 달라졌을 때' },
    { icon: Scale, href: '/concerns/obesity', img: '/images/curation_weight.png', title: '체중', desc: '체중 관리가 필요할 때' },
  ];

  const auditCriteriaIcons = [Activity, Leaf, Monitor, Heart];

  return (
    <main className="flex flex-col bg-[#FCFBF8] min-h-screen pb-20">
      <aside
        data-testid="home-soft-open-notice"
        aria-label="가오픈 결제 안내"
        className="flex min-h-[38px] w-full items-center bg-[#17211D] text-[#FBFAF7] sm:min-h-[34px]"
      >
        <div className="mx-auto flex w-full max-w-[1280px] items-center justify-center gap-2 px-2 py-1 sm:px-8 lg:px-12 xl:px-14">
          <span className="inline-flex min-h-6 shrink-0 items-center rounded-full bg-[#EAD7BC] px-2.5 text-[10px] font-bold leading-none text-[#17211D] sm:text-[11px]">
            가오픈 진행 중
          </span>
          <p className="min-w-0 whitespace-nowrap text-center text-[10px] font-semibold leading-none tracking-[-0.02em] text-[#FBFAF7] sm:text-[12px] sm:tracking-normal">
            현재 결제는 무통장입금으로 진행됩니다.
          </p>
        </div>
      </aside>

      {/* 1. 메인 히어로 */}
      <section data-testid="home-hero" className="relative h-[640px] w-full overflow-hidden bg-[#EDE5D8] sm:h-[620px] md:h-[480px] lg:h-[520px] xl:h-[560px]">
        <div className="relative h-full w-full overflow-hidden">
          <picture>
            <source media="(max-width: 767px)" sizes="100vw" srcSet={mobileHeroSrcSet} />
            <img
              {...desktopHeroImageProps}
              alt="반려동물과 함께하는 백조오브제의 펫 라이프스타일 제품"
              data-testid="home-hero-image"
              className="object-cover object-center"
            />
          </picture>
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(180deg,rgba(249,246,239,0.78)_0%,rgba(249,246,239,0.58)_52%,rgba(249,246,239,0.08)_72%,rgba(249,246,239,0)_100%)] md:bg-[linear-gradient(90deg,rgba(249,246,239,0.58)_0%,rgba(249,246,239,0.22)_44%,rgba(249,246,239,0)_62%)]"
          />

          <div className="relative z-10 mx-auto flex h-full w-full max-w-[1280px] items-start px-5 pb-8 pt-20 md:items-center md:px-8 md:py-10 lg:px-12 xl:px-14">
            <div className="flex w-full max-w-[510px] flex-col items-start md:w-[52%] md:min-w-[430px]">
            <span className="block text-[11px] lg:text-[12px] font-bold tracking-[0.12em] text-[#7A4E1D] uppercase mb-3 md:mb-4">{hero.eyebrow}</span>
            <h1 className="text-[30px] md:text-[34px] lg:text-[44px] font-bold leading-[1.2] lg:leading-[1.18] tracking-[-0.035em] text-[#17231E] break-keep">
              {renderLines(hero.titleLines)}
            </h1>
            <p className="mt-4 md:mt-[20px] lg:mt-[24px] max-w-[500px] text-[14px] md:text-[15px] lg:text-[16px] leading-[1.7] text-[#59615B] break-keep">
              {renderLines(hero.descriptionLines, 'hidden sm:block')}
            </p>
            <div className="mt-5 grid w-full grid-cols-2 gap-2.5 md:mt-7 md:flex md:w-auto md:gap-3">
              <Link href="/shop" className="flex h-[46px] items-center justify-center rounded-xl bg-[#18231F] px-3 text-[14px] font-bold text-white transition-colors hover:bg-[#2F3B34] md:h-[48px] md:px-8 md:text-[15px] lg:h-[50px]">
                {hero.primaryCtaLabel}
              </Link>
              <Link href="/concerns" className="flex h-[46px] items-center justify-center rounded-xl border border-white/80 bg-white/85 px-3 text-[14px] font-bold text-[#18231F] shadow-sm backdrop-blur-sm transition-colors hover:border-[#B99562] hover:bg-white md:h-[48px] md:px-8 md:text-[15px] lg:h-[50px]">
                {hero.secondaryCtaLabel}
              </Link>
            </div>
            <div className="mt-5 flex items-center gap-2 text-[12px] font-medium text-[#68716C] md:mt-6 md:text-[13px]">
              <ShieldCheck className="size-4 text-[#B99562]" strokeWidth={2} />
              {hero.trustNote}
            </div>
          </div>
          </div>

          <div className="absolute right-5 top-5 z-20 inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-md sm:right-8 sm:top-8 lg:right-12 xl:right-14">
            <ShieldCheck className="size-4 text-[#2E7D32]" strokeWidth={2} />
            <div className="flex flex-col">
              <span className="text-[12px] font-bold leading-none text-[#18231F]">{hero.badgeTitle}</span>
              <span className="mt-0.5 text-[10px] text-[#68716C]">{hero.badgeSubtitle}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-14 w-full max-w-[1280px] px-5 md:mt-[72px] md:px-7 lg:mt-[88px] lg:px-10 xl:px-14 mb-14 md:mb-[72px] lg:mb-[88px]">
        <div className="overflow-hidden rounded-[24px] border border-[#E7E2D9] bg-[#F6F3ED] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div data-testid="home-audit-hero" className="relative isolate min-h-[390px] overflow-hidden md:min-h-[360px] lg:min-h-[380px]">
            <picture>
              <source media="(max-width: 767px)" sizes="100vw" srcSet={mobileAuditSrcSet} />
              <img
                {...desktopAuditImageProps}
                alt="백조오브제 브랜드 패키지 오브제"
                className="object-contain object-bottom md:object-cover md:object-[center_39%]"
                data-testid="home-audit-image"
              />
            </picture>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,246,240,0.62)_0%,rgba(248,246,240,0.42)_60%,rgba(248,246,240,0.16)_100%)] md:bg-[linear-gradient(90deg,rgba(248,246,240,0.72)_0%,rgba(248,246,240,0.52)_47%,rgba(248,246,240,0.12)_68%,rgba(248,246,240,0)_100%)]"
            />

            <div className="relative z-10 flex min-h-[390px] max-w-[680px] flex-col justify-center p-6 md:min-h-[360px] md:p-8 lg:min-h-[380px] lg:p-10">
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#7A4E1D]">BAEKJO OBJET AUDIT</span>
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
        <nav aria-label={quickShop.title || '빠른 쇼핑'} className="rounded-[22px] border border-[#E8E0D4] bg-white px-3 py-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] sm:px-5 md:py-7 lg:px-8 lg:py-8">
          <div className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-6 sm:gap-x-4">
            {quickLinks.map((link, i) => {
              const Icon = link.icon;
              const name = quickShop.links[i]?.name ?? '';
              return (
                <Link key={`${link.href}-${i}`} href={link.href} className="group flex min-w-0 flex-col items-center gap-2.5 md:gap-3">
                  <div className="flex size-[54px] items-center justify-center rounded-full bg-[#F8F7F4] text-[#18231F] transition-colors group-hover:bg-[#F0ECE5] md:size-[58px]">
                    <Icon className="size-[23px] md:size-[25px]" strokeWidth={1.6} />
                  </div>
                  <span className="whitespace-nowrap text-[13px] font-medium tracking-tight text-[#59615B] transition-colors group-hover:text-[#18231F] md:text-[14px]">{name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
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
            <p className="mt-2 text-[14px] md:text-[15px] text-[#59615B] break-keep">
              {curation.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Link href="/diagnosis" className="inline-flex h-[38px] md:h-[42px] items-center justify-center rounded-full bg-[#18231F] px-5 text-[13px] md:text-[14px] font-bold text-white transition-colors hover:bg-[#2F3B34]">
              {curation.diagnosisLinkLabel}
            </Link>
            <Link href="/concerns" className="inline-flex h-[38px] md:h-[42px] items-center justify-center rounded-full border border-[#DED8CC] bg-white px-5 text-[13px] md:text-[14px] font-semibold text-[#18231F] transition-colors hover:bg-[#F9F8F5] hover:border-[#B99562]">
              {curation.allConcernsLinkLabel} <ArrowRight className="ml-1.5 size-4" />
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
          {curationCards.map((card, i) => {
            const title = card.title;
            const desc = card.desc;
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

      {/* 9. 펫보험 안내 배너 — 기능 플래그로 미노출(복귀는 features.ts) */}
      {FEATURES.insurance && (
        <section className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-14 mb-16 md:mb-20 lg:mb-28">
        <div className="relative flex h-auto min-h-[210px] md:min-h-[240px] overflow-hidden rounded-[24px] bg-[#1A2F25] px-6 py-8 md:px-12 md:py-0 md:items-center">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between w-full h-full md:h-auto gap-6 md:gap-0">
            <div className="flex max-w-[480px] flex-col items-start text-[#17231E]">
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <ShieldCheck className="size-5 text-[#7A4E1D]" strokeWidth={2} />
                <span className="text-[13px] font-semibold text-[#66431D] md:text-[14px]">{insuranceBanner.eyebrow}</span>
              </div>
              <h2 className="text-[22px] md:text-[28px] font-bold leading-[1.3] tracking-tight">
                {insuranceBanner.title}
              </h2>
              <p className="mt-2 break-keep text-[13px] leading-[1.6] text-[#35433D] md:text-[15px]">
                {insuranceBanner.description}
              </p>
            </div>

            <div className="mt-2 md:mt-0 relative z-20 shrink-0">
              <Link href="/insurance" className="flex h-[48px] items-center justify-center rounded-xl border border-[#173C32]/20 bg-[#173C32]/90 px-8 text-[14px] font-bold text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-[#173C32]">
                {insuranceBanner.buttonLabel}
              </Link>
            </div>
          </div>
          <div className="absolute inset-0 h-full w-full overflow-hidden">
            <picture>
              <source media="(min-width: 768px)" srcSet="/images/insurance-analysis-banner-wide.png" />
              <img
                src="/images/insurance-analysis-banner.png"
                alt="반려동물 보험을 분석하는 보호자와 강아지, 고양이"
                className="h-full w-full object-cover object-center"
              />
            </picture>
          </div>
        </div>
      </section>
      )}

      {/* 10. 반려가족 후기와 백조오브제 소식 */}
      <section className="mx-auto mb-12 w-full max-w-[1280px] rounded-[24px] bg-[#F2EEE5] px-5 py-8 md:mb-16 md:px-7 md:py-10 lg:px-10 xl:px-14">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          <div className="w-full lg:w-[58%]">
            <div className="flex items-end justify-between mb-8 border-b border-[#DED8CC] pb-4">
              <div>
                <h2 className="text-[20px] font-bold tracking-tight text-[#18231F]">{trustBoard.reviewsTitle}</h2>
              </div>
              <Link href="/reviews" className="flex min-h-11 shrink-0 items-center text-[13px] font-bold text-[#59615B] hover:text-[#7A4E1D] transition-colors md:min-h-0">
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
              <div>
                <h2 className="text-[20px] font-bold tracking-tight text-[#18231F]">{trustBoard.noticesTitle}</h2>
              </div>
              <Link href="/notices" className="flex min-h-11 shrink-0 items-center text-[13px] font-bold text-[#59615B] hover:text-[#7A4E1D] transition-colors md:min-h-0">
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
