'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  Check,
  ClipboardCheck,
  HeartPulse,
  Search,
  ShieldCheck,
  HeartHandshake,
  ShieldPlus,
  Leaf,
  Umbrella,
  Shield,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  Heart,
  FileText,
  Monitor,
  Plus,
  Eye,
  Sparkles,
  Bone,
  Scale,
  ShoppingBag,
  ArrowDown
} from 'lucide-react';
import { brands } from '@/data/brands';
import { concerns } from '@/data/concerns';
import { notices } from '@/data/notices';
import { products } from '@/data/products';
import { reviews } from '@/data/reviews';
import { homeContent } from '@/data/homeContent';
import ConcernCard from '@/components/common/ConcernCard';
import BrandCard from '@/components/common/BrandCard';
import BrandShowcaseSlider from '@/components/home/BrandShowcaseSlider';
import ProductCard from '@/components/common/ProductCard';
import ReviewCard from '@/components/common/ReviewCard';
import ScrollReveal from '@/components/common/ScrollReveal';
import { sortProducts } from '@/lib/filters';
import { formatDate } from '@/lib/format';
import { useSiteSettings } from '@/components/providers/SiteSettingsProvider';

export default function Home() {
  const { settings } = useSiteSettings();
  const bestProducts = sortProducts(products.filter((product) => product.isBest || product.isRecommended), 'popular').slice(0, 4);
  const recentNotices = notices.slice(0, 3);
  const displayBrands = brands.filter(b => b.isVisible !== false);

  return (
    <main className="home-unified flex flex-col">
      <section className="relative flex h-[58svh] min-h-[300px] max-h-[520px] w-full items-center justify-center overflow-hidden bg-black sm:h-[64svh] sm:max-h-[560px] lg:h-[68svh] lg:max-h-[640px]">
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 z-10 pointer-events-none"></div>
        {/* Video */}
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover"
        >
          <source src={settings.intro.videoSrc} type="video/mp4" />
        </video>
      </section>

      <section id="start" className="relative bg-noise home-section">
        <ScrollReveal className="home-container relative z-10">
          <div className="mb-12 lg:mb-16">
            <span className="home-label">Signature Solutions</span>
            <h2 className="home-title">
              백조오브제가 제안하는<br className="md:hidden" /> 3가지 핵심 솔루션
            </h2>
            <p className="home-desc">
              우리 아이의 라이프스타일에 맞춘 가장 확실한 선택 기준을 제공합니다. 복잡한 선택 앞에서 마음이 조금 가벼워지도록 도울게요.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
            {settings.howToStart.steps.map((step, index) => {
              const imageSrc = ['/images/solutions/audit.png', '/images/solutions/curation.png', '/images/solutions/insurance.png'][index];
              const num = String(index + 1).padStart(2, '0');

              return (
                <div key={step.linkHref} className="flex flex-col home-card">
                  <div className="relative mb-5 aspect-[4/3] w-full overflow-hidden rounded-xl bg-[#FAF8F3]">
                    <Image
                      src={imageSrc}
                      alt={step.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>

                  <div className="flex flex-1 flex-col">
                    <span className="mb-2 font-editorial text-lg font-bold text-[#A8742E]">{num}.</span>
                    <h3
                      className="mb-2 break-keep text-lg font-bold tracking-tight text-[#17211D]"
                      dangerouslySetInnerHTML={{ __html: step.title }}
                    />
                    <div className="mb-3 h-px w-6 bg-[#E7E0D5]"></div>
                    <p
                      className="mb-6 flex-1 break-keep text-[14px] leading-[1.65] text-[#6F766F]"
                      dangerouslySetInnerHTML={{ __html: step.desc }}
                    />
                    
                    <Link
                      href={step.linkHref}
                      className="mt-auto flex items-center text-[13px] font-bold tracking-wide text-[#17211D] hover:text-[#A8742E] transition-colors"
                    >
                      <span className="border-b border-current pb-0.5">{step.linkText}</span>
                      <ArrowRight className="ml-2 size-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollReveal>
      </section>

      {/* 2. Audit Section */}
      <section id="audit" className="overflow-hidden bg-noise home-section">
        <div className="home-container">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
            
            {/* Left: Text & Criteria (5 cols) */}
            <div className="flex h-full flex-col justify-center text-left lg:col-span-5">
              <span className="home-label">{settings.audit.badge}</span>
              <h2 className="home-title" dangerouslySetInnerHTML={{ __html: settings.audit.title }} />
              
              <div className="home-desc mb-10">
                <p className="mb-1.5 font-bold text-[#18231F]">{settings.audit.descriptionTitle}</p>
                <p>{settings.audit.descriptionText}</p>
              </div>

              {/* 4 Criteria Grid (Compact 2x2) */}
              <div className="mb-8 grid w-full max-w-[400px] grid-cols-2 gap-x-5 gap-y-5">
                {[
                  { icon: Activity, title: settings.audit.icons[0]?.title || '브랜드 운영 방향' },
                  { icon: Leaf, title: settings.audit.icons[1]?.title || '성분·원료 정보' },
                  { icon: Monitor, title: settings.audit.icons[2]?.title || '제조·유통 기준' },
                  { icon: Heart, title: settings.audit.icons[3]?.title || '보호자 사용 가치' }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="group flex flex-col items-start">
                      <div className="mb-3 flex size-[40px] items-center justify-center rounded-xl bg-[#F2EEE5] text-[#B99562] transition-transform duration-500 group-hover:-translate-y-1 group-hover:bg-[#EAE2D3]">
                        <Icon className="size-[18px]" strokeWidth={1.5} />
                      </div>
                      <span className="break-keep text-[14px] font-bold leading-[1.4] text-[#18231F]">{item.title}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Handwritten signature text */}
              <p className="font-editorial text-left text-[16px] italic leading-relaxed tracking-wide text-[#B99562] opacity-90 lg:text-[18px]" dangerouslySetInnerHTML={{ __html: settings.audit.signatureText }} />
            </div>

            {/* Right: Compact Canvas Image (7 cols) */}
            <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-[18px] border border-[#DED8CC] shadow-sm lg:aspect-auto lg:h-[480px] lg:col-span-7">
              <img 
                src="/images/poodle-pet-food.png" 
                alt="백조오브제 펫 푸드와 푸들"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105" 
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent mix-blend-multiply opacity-50"></div>
            </div>

          </div>

          {/* Bottom Banner */}
          <div className="mt-12 flex items-center justify-center gap-2 border-t border-[#DED8CC] pt-6 text-[14px] font-semibold text-[#68716C]">
            <ShieldCheck className="size-[18px] text-[#18231F]" strokeWidth={1.5} />
            <span>{settings.audit.bannerText}</span>
          </div>
        </div>
      </section>

      {/* 3. 맞춤 큐레이션 (통합) */}
      <section className="overflow-hidden bg-noise home-section">
        <ScrollReveal className="home-container">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
            {/* Left: Text & CTA (5 cols) */}
            <div className="flex w-full flex-col text-left lg:col-span-5">
              <span className="home-label">{settings.curation.badge}</span>
              <h2 className="home-title" dangerouslySetInnerHTML={{ __html: settings.curation.title }} />
              <p className="home-desc mb-8">
                {settings.curation.description}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link href="/diagnosis" className="btn-primary group w-full justify-between sm:w-auto">
                  <span>{settings.curation.button1Text}</span>
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link href="/concerns" className="btn-secondary group w-full justify-between sm:w-auto">
                  <span>{settings.curation.button2Text}</span>
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Poodle Image below buttons (Compact Aspect Ratio) */}
              <div className="group relative mt-10 aspect-[4/3] w-full overflow-hidden rounded-[18px] border border-[#DED8CC] shadow-sm">
                <img 
                  src="/images/poodle-pet-food.png" 
                  alt="백조오브제 펫 푸드와 푸들"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105" 
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 to-transparent mix-blend-multiply opacity-50"></div>
              </div>
            </div>

            {/* Right: Custom Curation Board (7 cols) */}
            <div className="flex w-full flex-col gap-5 lg:col-span-7">
              
              {/* Step 1: 4 Concern Cards (Compact Grid) */}
              <div className="grid grid-cols-2 gap-3 lg:gap-4">
                {[
                  { title: settings.curation.cards[0]?.title || '눈물 자국', desc: settings.curation.cards[0]?.desc || '눈물 자국이<br />걱정될 때', icon: Eye },
                  { title: settings.curation.cards[1]?.title || '피부 건강', desc: settings.curation.cards[1]?.desc || '자주 긁거나<br />피부가 예민할 때', icon: Sparkles },
                  { title: settings.curation.cards[2]?.title || '관절 케어', desc: settings.curation.cards[2]?.desc || '걸음걸이가<br />불편해 보일 때', icon: Bone },
                  { title: settings.curation.cards[3]?.title || '체중 조절', desc: settings.curation.cards[3]?.desc || '체중 관리가<br />필요할 때', icon: Scale }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="home-card flex flex-col items-center justify-center p-5 text-center cursor-pointer">
                      <div className="mb-3 flex size-[40px] items-center justify-center rounded-xl bg-[#F2EEE5] text-[#B99562] transition-transform duration-500 group-hover:-translate-y-1 group-hover:bg-[#EAE2D3]">
                        <Icon className="size-[20px]" strokeWidth={1.5} />
                      </div>
                      <h4 className="mb-1.5 text-[15px] font-bold text-[#18231F]">{item.title}</h4>
                      <p className="break-keep text-[13px] leading-[1.4] text-[#68716C]" dangerouslySetInnerHTML={{ __html: item.desc }}></p>
                    </div>
                  );
                })}
              </div>

              {/* Step 2: Central Curation Block */}
              <div className="home-card relative flex items-center overflow-hidden p-6">
                <div className="relative z-10 flex w-full items-center gap-5">
                  <div className="flex size-[48px] shrink-0 items-center justify-center rounded-xl bg-[#F2EEE5] text-[#B99562] transition-transform duration-500 group-hover:-translate-y-1 group-hover:bg-[#EAE2D3]">
                    <HeartHandshake className="size-[24px]" strokeWidth={1.5} />
                  </div>
                  <div className="text-left">
                    <h4 className="mb-1.5 text-[16px] font-bold tracking-tight text-[#18231F] lg:text-[17px]">{settings.curation.step2Title}</h4>
                    <p className="break-keep text-[14px] leading-[1.6] text-[#68716C]" dangerouslySetInnerHTML={{ __html: settings.curation.step2Desc }}></p>
                  </div>
                </div>
              </div>

              {/* Step 3: Outcomes Cards */}
              <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-2 lg:gap-4">
                {/* Left outcome card */}
                <div className="home-card flex flex-1 items-center gap-4 p-5">
                  <div className="flex size-[40px] shrink-0 items-center justify-center rounded-xl bg-[#F2EEE5] text-[#B99562] transition-transform duration-500 group-hover:-translate-y-1 group-hover:bg-[#EAE2D3]">
                    <ShoppingBag className="size-[20px]" strokeWidth={1.5} />
                  </div>
                  <div className="text-left">
                    <h5 className="mb-1 text-[14px] font-bold text-[#18231F] lg:text-[15px]">{settings.curation.step3LeftTitle}</h5>
                    <p className="break-keep text-[13px] leading-[1.5] text-[#68716C]" dangerouslySetInnerHTML={{ __html: settings.curation.step3LeftDesc }}></p>
                  </div>
                </div>

                {/* Right outcome card */}
                <div className="home-card flex flex-1 items-center gap-4 p-5">
                  <div className="flex size-[40px] shrink-0 items-center justify-center rounded-xl bg-[#F2EEE5] text-[#B99562] transition-transform duration-500 group-hover:-translate-y-1 group-hover:bg-[#EAE2D3]">
                    <ShieldCheck className="size-[20px]" strokeWidth={1.5} />
                  </div>
                  <div className="text-left">
                    <h5 className="mb-1 text-[14px] font-bold text-[#18231F] lg:text-[15px]">{settings.curation.step3RightTitle}</h5>
                    <p className="break-keep text-[13px] leading-[1.5] text-[#68716C]" dangerouslySetInnerHTML={{ __html: settings.curation.step3RightDesc }}></p>
                  </div>
                </div>
              </div>

              {/* Bottom Guide */}
              <div className="mt-4 flex items-center justify-center gap-2 text-[13px] font-semibold text-[#68716C]">
                <Activity className="size-[16px] text-[#B99562]" strokeWidth={1.5} />
                <span>{settings.curation.bottomGuide}</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 4 & 5. 브랜드관 및 베스트 상품 (통합) */}
      <section className="overflow-hidden bg-noise home-section">
        <div className="home-container">
          
          {/* 브랜드관 헤더 및 슬라이더 */}
          <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="브랜드 이야기"
              title="우리 아이의 일상을 함께할 브랜드"
              description="성분과 만드는 과정, 브랜드가 지키는 생각까지. 반려가족의 마음으로 차근차근 살펴 소개합니다."
            />
            <Link href="/brands" className="btn-secondary group flex w-full items-center justify-between sm:w-auto">
              <span>브랜드 모두 보기</span>
              <ArrowRight className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
          
          <div className="mt-10">
            <BrandShowcaseSlider brands={displayBrands} productsByBrand={products.reduce((grouped, product) => {
                if (!grouped[product.brandId]) grouped[product.brandId] = [];
                grouped[product.brandId].push(product);
                return grouped;
              }, {} as Record<string, typeof products>)} />
          </div>

          {/* 간격 축소 (권장 간격 64~72px) */}
          <div className="my-16 h-px w-full bg-[#DED8CC] lg:my-20"></div>

          {/* 베스트 상품 */}
          <SectionHeading
            eyebrow={settings.bestProducts.eyebrow}
            title={settings.bestProducts.title}
            description={settings.bestProducts.description}
            href="/shop"
            linkLabel={settings.bestProducts.linkLabel}
          />
          <div className="mt-10 flex snap-x overflow-x-auto pb-4 lg:grid lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10 lg:overflow-visible lg:pb-0 scrollbar-hide">
            {bestProducts.map((product) => (
              <div key={product.id} className="w-[240px] shrink-0 snap-start pr-4 sm:w-[280px] lg:w-auto lg:pr-0">
                <ProductCard product={product} />
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 6. 펫보험 CTA */}
      <section className="bg-[var(--home-dark)] bg-noise home-section text-[var(--home-surface)]">
        <ScrollReveal className="home-container relative z-10">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-12">
            <div className="lg:col-span-7">
              <p className="font-editorial text-[14px] italic tracking-wide text-[#B99562]">보험도 같은 마음으로</p>
              <h2 className="mt-4 break-keep text-[28px] font-bold leading-[1.25] tracking-tight text-white sm:text-[36px] lg:text-[44px]">
                상품만큼 보험도,
                <br />우리 아이를 기준으로.
              </h2>
            </div>
            <div className="lg:col-span-5">
              <p className="break-keep text-[14px] leading-[1.7] text-white/70 sm:text-[15px] sm:leading-[1.8]">
                옆집 아이에게 좋았던 조건이 우리 아이에게도 꼭 맞는 건 아니니까요. 가입을 권하기보다 지금 필요한 보장과 놓치기 쉬운 조건을 함께 살펴봅니다.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/insurance" className="btn-primary group flex w-full items-center justify-center gap-2 bg-[var(--home-surface)] text-[#18231F] transition-all hover:bg-white sm:w-auto">
                  <span>보험 분석 알아보기</span>
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link href="/insurance/recommend" className="btn-secondary group flex w-full items-center justify-center gap-2 border-[var(--home-surface)]/25 text-[var(--home-surface)] transition-all hover:border-[var(--home-surface)]/50 hover:bg-[var(--home-surface)]/10 sm:w-auto">
                  <span>간단히 조건 살펴보기</span>
                </Link>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 7. 리뷰 & 소식 */}
      <section className="relative bg-noise home-section">
        <ScrollReveal className="home-container relative z-10">
          <SectionHeading
            eyebrow="백조의 기록"
            title="함께 지낸 이야기를 차곡차곡 모아요."
            description="반려가족이 남긴 사용 경험과 백조오브제의 새로운 소식을 한곳에서 만나보세요."
          />

          <div className="mt-12 grid gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-7">
              <div className="mb-6 flex items-center justify-between border-b border-[#18231F] pb-4">
                <h3 className="text-[18px] font-bold tracking-tight text-[#18231F]">반려가족 이야기</h3>
                <Link href="/reviews" className="text-[13px] font-bold text-[#68716C] transition-colors duration-300 hover:text-[#B99562]">
                  더 보기
                </Link>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                {reviews.slice(0, 2).map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    productName={products.find((product) => product.id === review.productId)?.name}
                  />
                ))}
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="mb-6 flex items-center justify-between border-b border-[#18231F] pb-4">
                <h3 className="text-[18px] font-bold tracking-tight text-[#18231F]">백조 소식</h3>
                <Link href="/notices" className="text-[13px] font-bold text-[#68716C] transition-colors duration-300 hover:text-[#B99562]">
                  더 보기
                </Link>
              </div>
              <div className="flex flex-col">
                {recentNotices.map((notice) => (
                  <Link
                    key={notice.id}
                    href={`/notices/${notice.id}`}
                    className="group border-b border-[#DED8CC] py-5 transition-colors duration-300 hover:bg-white/50"
                  >
                    <p className="line-clamp-2 break-keep text-[15px] font-medium leading-[1.6] text-[#18231F] transition-colors duration-300 group-hover:text-[#B99562]">
                      {notice.title}
                    </p>
                    <time className="mt-2 block font-editorial text-[13px] italic tracking-wide text-[#B99562]">
                      {formatDate(notice.date)}
                    </time>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 8. 파트너 제휴 */}
      <section className="border-t border-[#DED8CC] bg-[var(--home-surface-muted)] py-12 lg:py-16">
        <div className="home-container flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="break-keep text-[14px] font-medium text-[#68716C]">
            브랜드 입점이나 병원·장례 제휴, 케어 키트가 필요하신가요?
          </p>
          <Link href="/signup" className="group inline-flex items-center gap-2 text-[14px] font-bold text-[#18231F] transition-colors hover:text-[#B99562]">
            파트너로 함께하기
            <ArrowRight className="size-4 text-[#B99562] transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      </section>
    </main>
  );
}


interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description: string;
  href?: string;
  linkLabel?: string;
}

function SectionHeading({ eyebrow, title, description, href, linkLabel }: SectionHeadingProps) {
  return (
    <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
      <div>
        <p className="home-label">{eyebrow}</p>
        <h2 className="home-title !mb-0" dangerouslySetInnerHTML={{ __html: title }}></h2>
        <p className="home-desc mt-4">{description}</p>
      </div>
      {href && linkLabel && (
        <Link href={href} className="btn-secondary group flex w-full items-center justify-between self-start sm:w-auto md:self-end">
          <span>{linkLabel}</span>
          <ArrowRight className="ml-2 size-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
