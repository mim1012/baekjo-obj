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
  Plus
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
  const displayBrands = brands.filter(b => b.isVisible !== false).slice(0, 3);

  return (
    <div className="flex flex-col">
      <section className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">
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

      {/* 2. How to start Section (Timeline Flow) */}
      <section className="bg-[#FBFAF7] py-16 lg:py-24 border-t border-[#E7E0D5]">
        <div className="site-container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-[0.3fr_0.7fr] items-start gap-12 lg:gap-16">
            {/* Left 30% */}
            <div className="text-left">
              <h2 className="text-[34px] lg:text-[38px] font-bold leading-[1.25] text-[#17211D] tracking-tight" dangerouslySetInnerHTML={{ __html: settings.howToStart.title }} />
              <p className="mt-5 text-[15px] text-[#6F766F] leading-relaxed" dangerouslySetInnerHTML={{ __html: settings.howToStart.description }} />
            </div>

            {/* Right 70% Timeline Flow */}
            <div className="relative flex flex-col md:flex-row w-full justify-between items-start pt-2">
              {/* 가로 연결선 (Desktop) */}
              <div className="absolute top-[14px] left-[15%] right-[15%] h-px bg-[#E7E0D5] z-0 hidden md:block"></div>

              {settings.howToStart.steps.map((step, index) => {
                const Icon = [ShieldCheck, Leaf, Umbrella][index] || ShieldCheck;
                return (
                  <div key={step.num} className="relative z-10 flex-1 flex flex-col items-center text-center px-4">
                    {/* Number Badge */}
                    <div className="bg-[#FBFAF7] px-2 mb-6">
                      <span className="font-editorial text-[12px] font-bold text-[#A8742E] bg-[#F3EEE6] border border-[#E7E0D5]/60 rounded-full size-7 flex items-center justify-center shadow-sm">
                        {step.num}
                      </span>
                    </div>
                    
                    {/* Icon Circle */}
                    <div className="flex size-[54px] items-center justify-center rounded-full border border-[#17211D] bg-[#FBFAF7] text-[#17211D] mb-4">
                      <Icon className="size-[20px]" strokeWidth={1.5} />
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-[16px] lg:text-[17px] font-bold text-[#17211D] mb-3 leading-snug" dangerouslySetInnerHTML={{ __html: step.title }}></h3>
                    
                    {/* Description */}
                    <p className="text-[13px] text-[#6F766F] leading-relaxed mb-5 max-w-[200px] break-keep" dangerouslySetInnerHTML={{ __html: step.desc }}></p>
                    
                    {/* Link */}
                    <Link href={step.linkHref} className="text-[13px] font-bold text-[#17211D] hover:underline flex items-center gap-1">
                      <span>{step.linkText}</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Audit Section (2-Column Layout: Typography + Card Visual Group) */}
      <section id="audit" className="bg-[#FBFAF7] py-16 lg:py-24 border-t border-[#E7E0D5] overflow-hidden">
        <div className="site-container-wide pb-12 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-[0.35fr_0.65fr] gap-12 lg:gap-16 items-center">
            
            {/* Left 35%: Large Main Message */}
            <div className="text-left">
              <span className="text-[12px] font-bold tracking-[0.15em] text-[#6F766F] block mb-6">{settings.audit.badge}</span>
              <h2 className="text-[38px] lg:text-[46px] font-bold leading-[1.25] text-[#17211D] tracking-tight mb-8" dangerouslySetInnerHTML={{ __html: settings.audit.title }} />
              <div className="text-[14px] text-[#6F766F] leading-[1.8] max-w-[340px]">
                <p className="font-bold text-[#17211D] mb-2">{settings.audit.descriptionTitle}</p>
                <p className="break-keep">{settings.audit.descriptionText}</p>
              </div>
            </div>

            {/* Right 65%: Unified Visual Group Card */}
            <div className="flex flex-col md:flex-row bg-white border border-[#E7E0D5] rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.02)] w-full items-stretch">
              {/* Left inside card: 4 Icons & Signature */}
              <div className="flex-1 flex flex-col justify-between p-8 lg:p-10 border-b md:border-b-0 md:border-r border-[#E7E0D5]/60">
                {/* 4 Icons Grid */}
                <div className="grid grid-cols-4 gap-2 text-center w-full">
                  {[
                    { icon: Activity, title: '브랜드 운영 방향' },
                    { icon: Leaf, title: '성분·원료 정보' },
                    { icon: Monitor, title: '제조·유통 기준' },
                    { icon: Heart, title: '보호자 사용 가치' }
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <div className="flex size-[56px] items-center justify-center rounded-full border border-[#E7E0D5] bg-[#FBFAF7] text-[#17211D] shadow-[0_2px_8px_rgba(0,0,0,0.03)] mb-3">
                          <Icon className="size-5 text-[#17211D]" strokeWidth={1.5} />
                        </div>
                        <span className="text-[12px] font-bold text-[#17211D] leading-[1.4] break-keep">{item.title}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Handwritten signature text */}
                <p className="font-editorial italic text-[18px] text-[#A8742E] text-left mt-8 tracking-wide leading-relaxed" dangerouslySetInnerHTML={{ __html: settings.audit.signatureText }} />
              </div>

              {/* Right inside card: Large Poodle Image (Takes up full height and half card width) */}
              <div className="w-full md:w-[320px] lg:w-[380px] shrink-0 relative min-h-[300px]">
                <img 
                  src="/images/poodle-pet-food.png" 
                  alt="백조오브제 펫 푸드와 푸들"
                  className="absolute inset-0 w-full h-full object-cover" 
                />
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Banner */}
        <div className="border-t border-[#E7E0D5] bg-[#FAF8F3] py-4">
          <div className="site-container-wide flex items-center justify-center gap-2 text-[13px] font-semibold text-[#6F766F]">
            <ShieldCheck className="size-[18px] text-[#17211D]" strokeWidth={1.5} />
            <span>{settings.audit.bannerText}</span>
          </div>
        </div>
      </section>

      {/* 3. 맞춤 큐레이션 (통합) */}
      <section className="bg-bg py-20 lg:py-32 overflow-hidden">
        <ScrollReveal className="site-container-wide">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
            {/* Left: Text & CTA */}
            <div className="w-full lg:w-1/3 lg:sticky lg:top-32 self-start flex flex-col text-left">
              <p className="font-editorial text-lg italic text-slate-400">{settings.curation.badge}</p>
              <h2 className="mt-3 text-balance font-editorial text-3xl sm:text-4xl lg:text-[40px] leading-[1.2] text-[#17211D] tracking-tight" dangerouslySetInnerHTML={{ __html: settings.curation.title }} />
              <p className="mt-6 text-pretty text-sm leading-7 text-[#6F766F]">
                {settings.curation.description}
              </p>
              <div className="mt-8 flex flex-col gap-3">
                <Link href="/diagnosis" className="inline-flex items-center justify-center gap-2 bg-[#17211D] rounded-full px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#1D3E2F] shadow-[0_4px_14px_rgba(23,33,29,0.12)]">
                  {settings.curation.button1Text} <ArrowRight className="size-4" />
                </Link>
                <Link href="/concerns" className="inline-flex items-center justify-center gap-2 bg-white border border-[#E7E0D5] rounded-full px-6 py-3.5 text-sm font-semibold text-[#17211D] transition-all hover:bg-[#FAF8F3]">
                  {settings.curation.button2Text} <ArrowRight className="size-4" />
                </Link>
              </div>

              {/* Poodle Image below buttons */}
              <div className="mt-8 rounded-2xl overflow-hidden border border-[#E7E0D5] aspect-[4/3] relative bg-[#FAF8F3]">
                <img 
                  src="/images/poodle-pet-food.png" 
                  alt="백조오브제 펫 푸드와 푸들"
                  className="absolute inset-0 w-full h-full object-cover" 
                />
              </div>
            </div>

            {/* Right: Custom Curation Board */}
            <div className="w-full lg:w-2/3 bg-[#FAF8F3] border border-[#E7E0D5] rounded-[28px] p-6 lg:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.01)] flex flex-col justify-between">
              
              {/* Board Header */}
              <div className="text-center mb-8">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-[#E7E0D5] font-light">—</span>
                  <h3 className="text-sm font-bold text-[#17211D] tracking-wide">진단 기반 추천 프로세스</h3>
                  <span className="text-[#E7E0D5] font-light">—</span>
                </div>
                <p className="text-[13px] text-[#6F766F]">간단한 정보로 우리 아이에게 꼭 맞는 선택을 연결합니다.</p>
              </div>

              {/* Step 1: 4 Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { 
                    title: '눈물', 
                    desc: '눈물 자국이<br />걱정될 때',
                    imgSrc: '/images/icon-tear.svg',
                  },
                  { 
                    title: '피부', 
                    desc: '자주 긁거나<br />피부가 예민할 때',
                    imgSrc: '/images/icon-skin.svg',
                  },
                  { 
                    title: '관절', 
                    desc: '걸음걸이가<br />불편해 보일 때',
                    imgSrc: '/images/icon-joint.svg',
                  },
                  { 
                    title: '체중', 
                    desc: '체중 관리가<br />필요할 때',
                    imgSrc: '/images/icon-weight.svg',
                  }
                ].map((item, idx) => (
                  <div key={idx} className="bg-white border border-[#E7E0D5] rounded-[20px] p-5 flex flex-col items-center justify-center text-center shadow-[0_4px_12px_rgba(0,0,0,0.02)] min-h-[140px] transition-transform hover:-translate-y-1">
                    <div className="mb-3">
                      <img src={item.imgSrc} alt={item.title} className="w-12 h-12 object-contain" />
                    </div>
                    <h4 className="text-[14px] font-bold text-[#17211D] mb-1.5">{item.title}</h4>
                    <p className="text-[12px] text-[#6F766F] leading-tight break-keep" dangerouslySetInnerHTML={{ __html: item.desc }}></p>
                  </div>
                ))}
              </div>

              {/* Connecting Lines: y=0 to y=48 */}
              <div className="w-full flex justify-center my-6 h-12 relative">
                <svg className="w-full h-full" viewBox="0 0 100 48" preserveAspectRatio="none">
                  <path d="M 12.5,0 L 12.5,20 L 87.5,20 M 37.5,0 L 37.5,20 M 62.5,0 L 62.5,20 M 87.5,0 L 87.5,20" stroke="#E7E0D5" strokeWidth="1.5" fill="none" />
                  <path d="M 50,20 L 50,48" stroke="#E7E0D5" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
                </svg>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-[#FAF8F3] border-2 border-[#E7E0D5] rounded-full p-1.5 z-10">
                  <div className="size-2 rounded-full bg-[#E7E0D5]" />
                </div>
              </div>

              {/* Step 2: Central Block */}
              <div className="bg-white border border-[#E7E0D5] rounded-[24px] p-6 lg:p-8 flex items-center justify-between shadow-[0_4px_12px_rgba(0,0,0,0.02)] min-h-[160px] relative overflow-hidden transition-transform hover:-translate-y-1">
                <div className="flex items-center gap-5 relative z-10">
                  <div className="w-16 h-16 shrink-0 rounded-[14px] bg-[#FAF8F3] border border-[#E7E0D5]/50 flex items-center justify-center overflow-hidden">
                  <img src="/images/icon-swan-shield.svg" alt="백조오브제 큐레이션" className="w-full h-full object-cover scale-110" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-[15px] font-bold text-[#17211D] mb-1 tracking-tight">백조오브제 큐레이션</h4>
                    <p className="text-[12.5px] text-[#6F766F] leading-relaxed">필요한 정보만 정리하고<br/>복잡한 선택 과정을 단순하게 안내합니다.</p>
                  </div>
                </div>
              </div>

              {/* Connecting Lines: Step 2 to Step 3 */}
              <div className="w-full flex justify-center my-4 h-12 relative">
                <svg className="w-full h-full" viewBox="0 0 100 48" preserveAspectRatio="none">
                  <path d="M 50,0 L 50,24" stroke="#E7E0D5" strokeWidth="1" strokeDasharray="3 3" fill="none" />
                  <path d="M 25,24 L 75,24" stroke="#E7E0D5" strokeWidth="1" fill="none" />
                  <path d="M 25,24 L 25,48 M 75,24 L 75,48" stroke="#E7E0D5" strokeWidth="1" fill="none" />
                </svg>
              </div>

              {/* Step 3: Outcomes Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center relative">
                {/* Left outcome card */}
                <div className="flex-1 bg-white border border-[#E7E0D5] rounded-[24px] p-6 lg:p-8 shadow-[0_4px_12px_rgba(0,0,0,0.02)] min-h-[160px] flex items-center gap-5 transition-transform hover:-translate-y-1">
                <div className="w-16 h-16 shrink-0 rounded-[14px] bg-[#FAF8F3] border border-[#E7E0D5]/50 flex items-center justify-center overflow-hidden">
                    <img src="/images/icon-product.svg" alt="검증 브랜드 & 상품 추천" className="w-full h-full object-cover scale-110" />
                </div>
                  <div className="text-left">
                    <h5 className="text-[13px] font-bold text-[#17211D] mb-0.5">검증 브랜드 & 상품 추천</h5>
                    <p className="text-[11px] text-[#6F766F] leading-tight">엄선된 브랜드와 상품을 고민 유형에 맞게 추천</p>
                  </div>
                </div>

                {/* Plus Badge */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-8 rounded-full bg-[#FAF8F3] border-2 border-[#E7E0D5] text-[#17211D] font-medium text-sm flex items-center justify-center hidden md:flex z-10 shadow-sm">+</div>

                {/* Right outcome card */}
                <div className="flex-1 bg-white border border-[#E7E0D5] rounded-[24px] p-6 lg:p-8 shadow-[0_4px_12px_rgba(0,0,0,0.02)] min-h-[160px] flex items-center gap-5 transition-transform hover:-translate-y-1">
                <div className="w-16 h-16 shrink-0 rounded-[14px] bg-[#FAF8F3] border border-[#E7E0D5]/50 flex items-center justify-center overflow-hidden">
                    <img src="/images/icon-insurance.svg" alt="펫보험 비교 & 안내" className="w-full h-full object-cover scale-110" />
                </div>
                  <div className="text-left">
                    <h5 className="text-[13px] font-bold text-[#17211D] mb-0.5">펫보험 비교 & 안내</h5>
                    <p className="text-[11px] text-[#6F766F] leading-tight">필요한 경우 보험 비교 및 안내 제공</p>
                  </div>
                </div>
              </div>

              {/* Bottom Guide */}
              <div className="mt-8 pt-4 border-t border-[#E7E0D5]/50 flex items-center justify-center gap-2 text-[11px] text-[#6F766F] font-medium">
                <svg className="size-4 text-[#A8742E]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                <span>맞춤 진단은 왼쪽의 "1분 맞춤 진단 시작" 버튼에서 시작할 수 있습니다.</span>
              </div>

            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 4. 검증 브랜드관 */}
      <section id="brands" className="bg-card py-20 lg:py-32 overflow-hidden">
        <ScrollReveal className="site-container-wide">
          <SectionHeading
            eyebrow="Verified brands"
            title="검증된 브랜드, 한눈에 둘러보기"
            description="검증보다 감동을 먼저 생각합니다. 제품 데이터, 철학, 제조 품질, 성분 안정성을 직접 확인한 브랜드만 큐레이션합니다."
          />
          <div className="mt-12 w-full pb-4">
            <BrandShowcaseSlider 
              brands={displayBrands} 
              productsByBrand={products.reduce((acc, p) => {
                if (!acc[p.brandId]) acc[p.brandId] = [];
                acc[p.brandId].push(p);
                return acc;
              }, {} as Record<string, typeof products>)} 
            />
          </div>
          <div className="mt-10 flex justify-center">
            <Link href="/brands" className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-8 py-4 text-sm font-semibold text-text-sub transition-all hover:bg-bg shadow-sm">
              모든 검증 브랜드 보기 <ArrowRight className="size-4" />
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* 5. 베스트 상품 */}
      <section className="bg-bg py-20 lg:py-32 overflow-hidden">
        <ScrollReveal className="site-container-wide">
          <SectionHeading
            eyebrow="The daily edit"
            title="Audit를 통과한 오늘의 추천"
            description="검증된 브랜드 중에서도 가장 많은 보호자님들께 선택받은 대표 상품입니다."
            href="/shop"
            linkLabel="전체 셀렉션 보기"
          />
          <div className="mt-12 flex overflow-x-auto snap-x scrollbar-hide gap-4 lg:grid lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10 pb-4">
            {bestProducts.map((product) => (
              <div key={product.id} className="shrink-0 w-[240px] sm:w-[280px] lg:w-auto snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* 7. 펫보험 무료 분석 (Mock UI Flow) */}
      <section id="insurance" className="bg-card py-20 lg:py-32 overflow-hidden relative">
        <ScrollReveal className="site-container-wide relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="font-editorial text-lg italic text-slate-400">Insurance Analysis</p>
            <h2 className="mt-4 text-balance font-editorial text-3xl sm:text-4xl lg:text-[40px] leading-[1.2] text-text-main tracking-tight" dangerouslySetInnerHTML={{ __html: settings.insuranceTitle }}>
            </h2>
            <p className="mt-5 text-pretty text-sm leading-7 text-text-sub">
              옆집 아이의 정답이 우리 아이의 정답일까요? 나이와 질환에 꼭 맞는 맞춤 특약을 찾고,<br className="hidden sm:block" /> 보험 가입을 강요하지 않는 객관적인 약관 분석 프로세스를 경험해 보세요.
            </p>
          </div>

          {/* Flow Cards */}
          <div className="flex flex-col lg:flex-row gap-6 relative">
            {/* Step 1 */}
            <div className="flex-1 rounded-[24px] bg-card border border-border p-6 lg:p-8 shadow-sm flex flex-col items-center text-center relative mt-0 lg:mt-0">
              <span className="flex size-12 items-center justify-center rounded-full bg-bg text-slate-400 font-editorial text-xl italic mb-6">1</span>
              <div className="w-full max-w-[200px] mb-6 space-y-3">
                <div className="h-2 w-1/2 bg-slate-200 rounded-full mx-auto"></div>
                <div className="h-10 w-full bg-bg border border-border rounded-lg flex items-center px-4 gap-2">
                  <div className="size-3 rounded-sm bg-navy"></div>
                  <div className="h-2 w-20 bg-slate-200 rounded-full"></div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-text-main">기본 정보 동의</h3>
              <p className="mt-2 text-xs text-text-sub">최소한의 정보로 비교를 시작합니다.</p>
            </div>

            {/* Step 2 */}
            <div className="flex-1 rounded-[24px] bg-card border border-border p-6 lg:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.04)] flex flex-col items-center text-center relative mt-0 lg:mt-8 z-10">
              <span className="flex size-12 items-center justify-center rounded-full bg-navy text-white font-editorial text-xl italic mb-6 shadow-md">2</span>
              <div className="w-full max-w-[200px] mb-6 space-y-2">
                <div className="flex justify-between items-center bg-bg p-2.5 rounded-lg border border-border">
                  <span className="text-[10px] font-medium text-slate-400">품종</span>
                  <span className="text-[10px] font-bold text-text-main">말티즈</span>
                </div>
                <div className="flex justify-between items-center bg-bg p-2.5 rounded-lg border border-border">
                  <span className="text-[10px] font-medium text-slate-400">나이</span>
                  <span className="text-[10px] font-bold text-text-main">만 4세</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-text-main">맞춤 조건 입력</h3>
              <p className="mt-2 text-xs text-text-sub">아이의 건강 상태를 꼼꼼히 체크합니다.</p>
            </div>

            {/* Step 3 */}
            <div className="flex-1 rounded-[24px] bg-card border border-border p-6 lg:p-8 shadow-sm flex flex-col items-center text-center relative mt-0 lg:mt-16">
              <span className="flex size-12 items-center justify-center rounded-full bg-bg text-slate-400 font-editorial text-xl italic mb-6">3</span>
              <div className="w-full max-w-[200px] mb-6">
                <div className="bg-bg rounded-xl p-3 border border-border text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-text-main">추천 특약 A</span>
                    <HeartPulse className="size-3 text-navy" />
                  </div>
                  <div className="text-xs font-bold text-text-main">월 32,000원~</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-text-main">결과 리포트</h3>
              <p className="mt-2 text-xs text-text-sub">최적의 보장 조건을 안내합니다.</p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <p className="text-xs text-slate-400 mb-6">* 본 화면은 실제 API 연동이 아닌 가이드라인 안내를 위한 예시 화면입니다.</p>
            <Link href="/insurance" className="inline-flex items-center gap-2 bg-navy rounded-full px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-blue shadow-lg">
              무료 분석 프로세스 시작하기 <ArrowRight className="size-4" />
            </Link>
          </div>
        </ScrollReveal>
      </section>


      {/* 9 & 10. Trust Block (후기 & 공지사항 통합) */}
      <section className="bg-bg py-20 lg:py-32 overflow-hidden">
        <ScrollReveal className="site-container-wide">
          <div className="flex flex-col mb-12">
            <p className="font-editorial text-lg italic text-slate-400">Trust Board</p>
            <h2 className="mt-3 text-balance font-editorial text-3xl sm:text-4xl lg:text-[40px] leading-[1.2] text-text-main tracking-tight">
              함께 만드는 백조오브제의 기록
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
            {/* Reviews */}
            <div className="w-full lg:w-2/3">
              <div className="flex justify-between items-end mb-6">
                <h3 className="text-lg font-semibold text-text-main">먼저 함께해 본 이들의 이야기</h3>
                <Link href="/reviews" className="text-sm font-semibold text-text-sub hover:text-text-main transition-colors flex items-center gap-1">
                  후기 전체보기 <ArrowRight className="size-3" />
                </Link>
              </div>
              <div className="flex flex-col gap-6">
                {reviews.slice(0, 2).map((review) => (
                  <div key={review.id} className="w-full h-full">
                    <ReviewCard
                      review={review}
                      productName={products.find((product) => product.id === review.productId)?.name}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Notices */}
            <div className="w-full lg:w-1/3">
              <div className="flex justify-between items-end mb-6">
                <h3 className="text-lg font-semibold text-text-main">새로운 소식</h3>
                <Link href="/notices" className="text-sm font-semibold text-text-sub hover:text-text-main transition-colors flex items-center gap-1">
                  공지 전체보기 <ArrowRight className="size-3" />
                </Link>
              </div>
              <div className="flex flex-col border-t border-border">
                {recentNotices.map((notice) => (
                  <Link
                    key={notice.id}
                    href={`/notices/${notice.id}`}
                    className="group flex flex-col justify-center gap-2 border-b border-border py-6 transition-colors hover:bg-card px-4 -mx-4 rounded-xl"
                  >
                    <span className="line-clamp-2 text-sm font-medium text-text-sub group-hover:text-text-main leading-relaxed">{notice.title}</span>
                    <span className="text-[11px] font-semibold text-slate-400">{formatDate(notice.date)}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>
      {/* 9. B2B 파트너십 유도 바 (Footer 직전) */}
      <section className="bg-card py-6 border-t border-border">
        <div className="site-container-wide flex justify-center">
          <Link href="/b2b" className="flex items-center gap-2 text-[13px] font-medium text-slate-500 hover:text-navy transition-colors">
            <span>브랜드 입점, 병원/장례 제휴, 케어 키트 도입 등 파트너십이 필요하신가요?</span>
            <span className="font-semibold underline underline-offset-2">B2B 제휴 안내 보기</span>
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </section>
    </div>
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
        <p className="font-editorial text-lg italic text-slate-400">{eyebrow}</p>
        <h2 className="mt-3 max-w-2xl text-balance font-editorial text-3xl sm:text-4xl lg:text-[40px] leading-[1.2] text-text-main tracking-tight" dangerouslySetInnerHTML={{ __html: title }}>
        </h2>
        <p className="mt-4 max-w-xl text-pretty text-sm leading-7 text-text-sub">{description}</p>
      </div>
      {href && linkLabel && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-text-sub hover:text-text-main transition-colors">
          {linkLabel}
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
