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
  const displayBrands = brands.filter(b => b.isVisible !== false).slice(0, 3);

  return (
    <div className="flex flex-col">
      <section className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">
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

      {/* 2. Core Solutions Section (Compact Independent Cards) */}
      <section className="bg-[#FBFAF7] bg-noise py-12 lg:py-16 border-t border-[#E7E0D5]">
        <div className="site-container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-[0.32fr_0.68fr] items-start gap-8 lg:gap-12">
            
            {/* Left: Title & Desc */}
            <div className="text-left lg:sticky lg:top-32">
              <h2 className="text-3xl lg:text-[34px] font-bold leading-[1.25] text-[#17211D] tracking-tight" dangerouslySetInnerHTML={{ __html: settings.howToStart.title }} />
              <p className="mt-4 text-[14px] text-[#6F766F] leading-[1.7] max-w-[320px] break-keep" dangerouslySetInnerHTML={{ __html: settings.howToStart.description }} />
            </div>

            {/* Right: 3 Compact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
              {settings.howToStart.steps.map((step, index) => {
                const Icon = [ShieldCheck, Leaf, Umbrella][index] || ShieldCheck;
                return (
                  <div key={index} className="flex flex-col items-center text-center px-4 py-8 bg-white border border-[#E7E0D5] rounded-2xl shadow-sm transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-md hover:border-[#D8C4A3] group relative overflow-hidden">
                    
                    {/* Subtle top glow on hover */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-0.5 bg-gradient-to-r from-transparent via-[#D8C4A3]/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>

                    {/* Icon Square/Squircle */}
                    <div className="flex size-[48px] items-center justify-center rounded-2xl bg-[#FBFAF7] text-[#17211D] mb-5 border border-[#E7E0D5]/60 transition-all duration-500 ease-out group-hover:scale-110 group-hover:text-[#A8742E]">
                      <Icon className="size-[20px]" strokeWidth={1.5} />
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-[16px] lg:text-[17px] font-bold text-[#17211D] mb-3 leading-snug transition-colors duration-300" dangerouslySetInnerHTML={{ __html: step.title }}></h3>
                    
                    {/* Description */}
                    <p className="text-[13px] text-[#6F766F] leading-[1.5] mb-6 break-keep flex-1 px-1" dangerouslySetInnerHTML={{ __html: step.desc }}></p>
                    
                    {/* Action Link (Bottom aligned) */}
                    <Link href={step.linkHref} className="text-[13px] font-bold text-[#17211D] transition-all duration-300 flex items-center gap-1 group-hover:text-[#A8742E]">
                      <span>{step.linkText}</span>
                      <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
            
          </div>
        </div>
      </section>

      {/* 3. Audit Section (Editorial Layout - Extra Compact) */}
      <section id="audit" className="bg-[#FBFAF7] bg-noise pt-12 lg:pt-16 overflow-hidden">
        <div className="site-container-wide">
          <div className="grid grid-cols-1 lg:grid-cols-[0.45fr_0.55fr] gap-8 lg:gap-12 items-center">
            
            {/* Left: Text & Criteria */}
            <div className="text-left flex flex-col justify-center h-full pt-2 lg:pt-4">
              <span className="text-[12px] font-bold tracking-[0.15em] text-[#6F766F] block mb-4">{settings.audit.badge}</span>
              <h2 className="text-[34px] lg:text-[38px] font-bold leading-[1.25] text-[#17211D] tracking-tight mb-5" dangerouslySetInnerHTML={{ __html: settings.audit.title }} />
              
              <div className="text-[14px] text-[#6F766F] leading-[1.7] max-w-[380px] mb-10">
                <p className="font-bold text-[#17211D] mb-1.5">{settings.audit.descriptionTitle}</p>
                <p className="break-keep">{settings.audit.descriptionText}</p>
              </div>

              {/* 4 Criteria Grid (Compact 2x2) */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-6 w-full max-w-[400px] mb-10">
                {[
                  { icon: Activity, title: settings.audit.icons[0]?.title || '브랜드 운영 방향' },
                  { icon: Leaf, title: settings.audit.icons[1]?.title || '성분·원료 정보' },
                  { icon: Monitor, title: settings.audit.icons[2]?.title || '제조·유통 기준' },
                  { icon: Heart, title: settings.audit.icons[3]?.title || '보호자 사용 가치' }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex flex-col items-start group">
                      <div className="flex size-[40px] items-center justify-center rounded-xl bg-[#F3EEE6] text-[#A8742E] mb-2.5 transition-transform duration-500 group-hover:-translate-y-1 group-hover:bg-[#EAE2D3]">
                        <Icon className="size-[18px]" strokeWidth={1.5} />
                      </div>
                      <span className="text-[13px] font-bold text-[#17211D] leading-[1.4] break-keep">{item.title}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Handwritten signature text */}
              <p className="font-editorial italic text-[16px] lg:text-[18px] text-[#A8742E] text-left tracking-wide leading-relaxed opacity-90" dangerouslySetInnerHTML={{ __html: settings.audit.signatureText }} />
            </div>

            {/* Right: Compact Canvas Image */}
            <div className="relative w-full h-[300px] lg:h-[400px] rounded-[24px] overflow-hidden shadow-sm border border-[#E7E0D5]/50 group">
              <img 
                src="/images/poodle-pet-food.png" 
                alt="백조오브제 펫 푸드와 푸들"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent mix-blend-multiply opacity-50 pointer-events-none"></div>
            </div>

          </div>
        </div>

        {/* Bottom Banner */}
        <div className="border-t border-[#E7E0D5] bg-[#FAF8F3] py-4 mt-8 lg:mt-12">
          <div className="site-container-wide flex items-center justify-center gap-2 text-[13px] font-semibold text-[#6F766F]">
            <ShieldCheck className="size-[18px] text-[#17211D]" strokeWidth={1.5} />
            <span>{settings.audit.bannerText}</span>
          </div>
        </div>
      </section>

      {/* 3. 맞춤 큐레이션 (통합) */}
      <section className="bg-bg bg-noise py-12 lg:py-16 overflow-hidden">
        <ScrollReveal className="site-container-wide">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Left: Text & CTA */}
            <div className="w-full lg:w-1/3 lg:sticky lg:top-32 self-start flex flex-col text-left">
              <p className="font-editorial text-[16px] italic text-[#A8742E] opacity-90">{settings.curation.badge}</p>
              <h2 className="mt-2 text-balance font-bold text-3xl lg:text-[34px] leading-[1.2] text-[#17211D] tracking-tight" dangerouslySetInnerHTML={{ __html: settings.curation.title }} />
              <p className="mt-4 text-pretty text-[14px] leading-[1.7] text-[#6F766F] break-keep">
                {settings.curation.description}
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <Link href="/diagnosis" className="inline-flex items-center justify-center gap-2 bg-[#17211D] rounded-full px-5 py-3 text-[14px] font-bold text-white transition-all hover:bg-[#1D3E2F] shadow-[0_4px_14px_rgba(23,33,29,0.12)] hover:-translate-y-0.5 duration-300 group">
                  {settings.curation.button1Text} <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link href="/concerns" className="inline-flex items-center justify-center gap-2 bg-white border border-[#E7E0D5] rounded-full px-5 py-3 text-[14px] font-bold text-[#17211D] transition-all hover:bg-[#FAF8F3] hover:border-[#D8C4A3] hover:-translate-y-0.5 duration-300 group">
                  {settings.curation.button2Text} <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Poodle Image below buttons (Compact Aspect Ratio) */}
              <div className="mt-8 rounded-3xl overflow-hidden border border-[#E7E0D5]/50 aspect-[4/3] relative shadow-sm group">
                <img 
                  src="/images/poodle-pet-food.png" 
                  alt="백조오브제 펫 푸드와 푸들"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 ease-out group-hover:scale-105" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent mix-blend-multiply opacity-50 pointer-events-none"></div>
              </div>
            </div>

            {/* Right: Custom Curation Board (Floating Cards) */}
            <div className="w-full lg:w-2/3 flex flex-col pt-2 lg:pt-4">
              
              {/* Step 1: 4 Concern Cards (Compact Grid) */}
              <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-6 relative">
                {[
                  { title: settings.curation.cards[0]?.title || '눈물 자국', desc: settings.curation.cards[0]?.desc || '눈물 자국이<br />걱정될 때', icon: Eye },
                  { title: settings.curation.cards[1]?.title || '피부 건강', desc: settings.curation.cards[1]?.desc || '자주 긁거나<br />피부가 예민할 때', icon: Sparkles },
                  { title: settings.curation.cards[2]?.title || '관절 케어', desc: settings.curation.cards[2]?.desc || '걸음걸이가<br />불편해 보일 때', icon: Bone },
                  { title: settings.curation.cards[3]?.title || '체중 조절', desc: settings.curation.cards[3]?.desc || '체중 관리가<br />필요할 때', icon: Scale }
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="bg-white border border-[#E7E0D5] rounded-3xl p-4 lg:p-6 flex flex-col items-center justify-center text-center shadow-sm transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-md hover:border-[#D8C4A3] group relative overflow-hidden">
                      <div className="flex size-[40px] items-center justify-center rounded-xl bg-[#F3EEE6] text-[#A8742E] mb-3 transition-transform duration-500 group-hover:-translate-y-1 group-hover:bg-[#EAE2D3]">
                        <Icon className="size-[20px]" strokeWidth={1.5} />
                      </div>
                      <h4 className="text-[14px] lg:text-[15px] font-bold text-[#17211D] mb-1.5">{item.title}</h4>
                      <p className="text-[12px] text-[#6F766F] leading-[1.4] break-keep" dangerouslySetInnerHTML={{ __html: item.desc }}></p>
                    </div>
                  );
                })}
              </div>

              {/* Connecting Element Instead of SVG */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center size-8 rounded-full bg-[#FAF8F3] border border-[#E7E0D5] text-[#A8742E]">
                  <ArrowDown className="size-4 opacity-70" strokeWidth={1.5} />
                </div>
              </div>

              {/* Step 2: Central Curation Block */}
              <div className="bg-white border border-[#E7E0D5] rounded-3xl p-5 lg:p-6 flex items-center shadow-sm transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-md hover:border-[#D8C4A3] group mb-6 relative overflow-hidden">
                <div className="flex items-center gap-5 relative z-10 w-full">
                  <div className="flex size-[48px] shrink-0 items-center justify-center rounded-2xl bg-[#F3EEE6] text-[#A8742E] transition-transform duration-500 group-hover:bg-[#EAE2D3] group-hover:-translate-y-1">
                    <HeartHandshake className="size-[24px]" strokeWidth={1.5} />
                  </div>
                  <div className="text-left">
                    <h4 className="text-[16px] lg:text-[17px] font-bold text-[#17211D] mb-1.5 tracking-tight">{settings.curation.step2Title}</h4>
                    <p className="text-[13px] text-[#6F766F] leading-[1.6] break-keep" dangerouslySetInnerHTML={{ __html: settings.curation.step2Desc }}></p>
                  </div>
                </div>
              </div>

              {/* Connecting Element Instead of SVG */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center justify-center size-8 rounded-full bg-[#FAF8F3] border border-[#E7E0D5] text-[#A8742E]">
                  <ArrowDown className="size-4 opacity-70" strokeWidth={1.5} />
                </div>
              </div>

              {/* Step 3: Outcomes Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4 items-center relative">
                {/* Left outcome card */}
                <div className="flex-1 bg-white border border-[#E7E0D5] rounded-3xl p-5 lg:p-6 shadow-sm flex items-center gap-4 transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-md hover:border-[#D8C4A3] group">
                  <div className="flex size-[40px] shrink-0 items-center justify-center rounded-xl bg-[#F3EEE6] text-[#A8742E] transition-transform duration-500 group-hover:bg-[#EAE2D3] group-hover:-translate-y-1">
                    <ShoppingBag className="size-[20px]" strokeWidth={1.5} />
                  </div>
                  <div className="text-left">
                    <h5 className="text-[14px] lg:text-[15px] font-bold text-[#17211D] mb-1">{settings.curation.step3LeftTitle}</h5>
                    <p className="text-[12px] text-[#6F766F] leading-[1.5] break-keep" dangerouslySetInnerHTML={{ __html: settings.curation.step3LeftDesc }}></p>
                  </div>
                </div>

                {/* Plus Badge (Center) */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-8 rounded-full bg-[#FAF8F3] border border-[#E7E0D5] text-[#A8742E] flex items-center justify-center hidden md:flex z-10 shadow-sm">
                  <Plus className="size-4" strokeWidth={1.5} />
                </div>

                {/* Right outcome card */}
                <div className="flex-1 bg-white border border-[#E7E0D5] rounded-3xl p-5 lg:p-6 shadow-sm flex items-center gap-4 transition-all duration-500 ease-out hover:-translate-y-1.5 hover:shadow-md hover:border-[#D8C4A3] group">
                  <div className="flex size-[40px] shrink-0 items-center justify-center rounded-xl bg-[#F3EEE6] text-[#A8742E] transition-transform duration-500 group-hover:bg-[#EAE2D3] group-hover:-translate-y-1">
                    <ShieldCheck className="size-[20px]" strokeWidth={1.5} />
                  </div>
                  <div className="text-left">
                    <h5 className="text-[14px] lg:text-[15px] font-bold text-[#17211D] mb-1">{settings.curation.step3RightTitle}</h5>
                    <p className="text-[12px] text-[#6F766F] leading-[1.5] break-keep" dangerouslySetInnerHTML={{ __html: settings.curation.step3RightDesc }}></p>
                  </div>
                </div>
              </div>

              {/* Bottom Guide */}
              <div className="mt-8 flex items-center justify-center gap-2 text-[12px] text-[#6F766F]">
                <Activity className="size-[16px] text-[#A8742E]" strokeWidth={1.5} />
                <span>{settings.curation.bottomGuide}</span>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 4. 검증 브랜드관 */}
      <section id="brands" className="bg-[#FBFAF7] bg-noise py-12 lg:py-16 overflow-hidden">
        <ScrollReveal className="site-container-wide">
          <SectionHeading
            eyebrow={settings.brands.eyebrow}
            title={settings.brands.title}
            description={settings.brands.description}
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
              {settings.brands.buttonText} <ArrowRight className="size-4" />
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* 5. 베스트 상품 */}
      <section className="bg-[#FBFAF7] py-12 lg:py-16 overflow-hidden">
        <ScrollReveal className="site-container-wide">
          <SectionHeading
            eyebrow={settings.bestProducts.eyebrow}
            title={settings.bestProducts.title}
            description={settings.bestProducts.description}
            href="/shop"
            linkLabel={settings.bestProducts.linkLabel}
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
      <section id="insurance" className="bg-[#FBFAF7] py-12 lg:py-16 overflow-hidden relative border-t border-[#E7E0D5]">
        <ScrollReveal className="site-container-wide relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <p className="font-editorial text-[16px] italic text-[#A8742E] opacity-90">{settings.insurance.eyebrow}</p>
            <h2 className="mt-2 text-balance font-bold text-3xl lg:text-[34px] leading-[1.2] text-[#17211D] tracking-tight" dangerouslySetInnerHTML={{ __html: settings.insurance.title }}>
            </h2>
            <p className="mt-4 text-pretty text-[14px] leading-[1.7] text-[#6F766F] break-keep" dangerouslySetInnerHTML={{ __html: settings.insurance.description }}></p>
          </div>

          {/* Flow Cards */}
          <div className="flex flex-col lg:flex-row gap-6 relative">
            {/* Step 1 */}
            <div className="flex-1 rounded-[24px] bg-card border border-border p-6 lg:p-8 shadow-sm flex flex-col items-center text-center relative mt-0 lg:mt-0 transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_16px_48px_rgba(15,23,42,0.08)] hover:border-[#D8C4A3]">
              <span className="flex size-12 items-center justify-center rounded-full bg-bg text-slate-400 font-editorial text-xl italic mb-6">1</span>
              <div className="w-full max-w-[200px] mb-6 space-y-3">
                <div className="h-2 w-1/2 bg-slate-200 rounded-full mx-auto"></div>
                <div className="h-10 w-full bg-bg border border-border rounded-lg flex items-center px-4 gap-2">
                  <div className="size-3 rounded-sm bg-navy"></div>
                  <div className="h-2 w-20 bg-slate-200 rounded-full"></div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-text-main" dangerouslySetInnerHTML={{ __html: settings.insurance.step1Title }}></h3>
              <p className="mt-2 text-xs text-text-sub" dangerouslySetInnerHTML={{ __html: settings.insurance.step1Desc }}></p>
            </div>

            {/* Step 2 */}
            <div className="flex-1 rounded-[24px] bg-card border border-border p-6 lg:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.06)] flex flex-col items-center text-center relative mt-0 lg:mt-8 z-10 transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_20px_56px_rgba(15,23,42,0.1)] hover:border-[#1B2922]">
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
              <h3 className="text-lg font-semibold text-text-main" dangerouslySetInnerHTML={{ __html: settings.insurance.step2Title }}></h3>
              <p className="mt-2 text-xs text-text-sub" dangerouslySetInnerHTML={{ __html: settings.insurance.step2Desc }}></p>
            </div>

            {/* Step 3 */}
            <div className="flex-1 rounded-[24px] bg-card border border-border p-6 lg:p-8 shadow-sm flex flex-col items-center text-center relative mt-0 lg:mt-16 transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-[0_16px_48px_rgba(15,23,42,0.08)] hover:border-[#D8C4A3]">
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
              <h3 className="text-lg font-semibold text-text-main" dangerouslySetInnerHTML={{ __html: settings.insurance.step3Title }}></h3>
              <p className="mt-2 text-xs text-text-sub" dangerouslySetInnerHTML={{ __html: settings.insurance.step3Desc }}></p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <p className="text-xs text-slate-400 mb-6" dangerouslySetInnerHTML={{ __html: settings.insurance.disclaimer }}></p>
            <Link href="/insurance" className="inline-flex items-center gap-2 bg-navy rounded-full px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-blue shadow-lg">
              {settings.insurance.buttonText} <ArrowRight className="size-4" />
            </Link>
          </div>
        </ScrollReveal>
      </section>


      {/* 9 & 10. Trust Block (후기 & 공지사항 통합) */}
      <section className="bg-white py-12 lg:py-16 overflow-hidden border-t border-[#E7E0D5]">
        <ScrollReveal className="site-container-wide">
          <div className="flex flex-col mb-8">
            <p className="font-editorial text-[16px] italic text-[#A8742E] opacity-90">{settings.trustBoard.eyebrow}</p>
            <h2 className="mt-2 text-balance font-bold text-3xl lg:text-[34px] leading-[1.2] text-[#17211D] tracking-tight" dangerouslySetInnerHTML={{ __html: settings.trustBoard.title }}>
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
            {/* Reviews */}
            <div className="w-full lg:w-2/3">
              <div className="flex justify-between items-end mb-6">
                <h3 className="text-lg font-semibold text-text-main">{settings.trustBoard.reviewsTitle}</h3>
                <Link href="/reviews" className="text-sm font-semibold text-text-sub hover:text-text-main transition-colors flex items-center gap-1">
                  {settings.trustBoard.reviewsLinkText} <ArrowRight className="size-3" />
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
                <h3 className="text-lg font-semibold text-text-main">{settings.trustBoard.noticesTitle}</h3>
                <Link href="/notices" className="text-sm font-semibold text-text-sub hover:text-text-main transition-colors flex items-center gap-1">
                  {settings.trustBoard.noticesLinkText} <ArrowRight className="size-3" />
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
            <span dangerouslySetInnerHTML={{ __html: settings.b2b.text }}></span>
            <span className="font-semibold underline underline-offset-2">{settings.b2b.linkText}</span>
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
        <p className="font-editorial text-[16px] italic text-[#A8742E] opacity-90">{eyebrow}</p>
        <h2 className="mt-2 max-w-2xl text-balance font-bold text-3xl lg:text-[34px] leading-[1.2] text-[#17211D] tracking-tight" dangerouslySetInnerHTML={{ __html: title }}>
        </h2>
        <p className="mt-4 max-w-xl text-pretty text-[14px] leading-[1.7] text-[#6F766F] break-keep">{description}</p>
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
