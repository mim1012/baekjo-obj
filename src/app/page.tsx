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
  HeartHandshake
} from 'lucide-react';
import { brands } from '@/data/brands';
import { concerns } from '@/data/concerns';
import { notices } from '@/data/notices';
import { products } from '@/data/products';
import { reviews } from '@/data/reviews';
import ConcernCard from '@/components/common/ConcernCard';
import BrandCard from '@/components/common/BrandCard';
import BrandShowroomCard from '@/components/common/BrandShowroomCard';
import ProductCard from '@/components/common/ProductCard';
import ReviewCard from '@/components/common/ReviewCard';
import ScrollReveal from '@/components/common/ScrollReveal';
import { sortProducts } from '@/lib/filters';
import { formatDate } from '@/lib/format';

export default function Home() {
  const bestProducts = sortProducts(products.filter((product) => product.isBest || product.isRecommended), 'popular').slice(0, 4);
  const recentNotices = notices.slice(0, 3);
  const displayBrands = brands.filter(b => b.isVisible !== false).slice(0, 3);

  return (
    <div className="flex flex-col">
      {/* 1. Hero */}
      <section className="relative overflow-hidden min-h-[600px] flex items-center bg-[#FBFAF7] border-b border-[rgba(15,23,42,0.06)]">
        <div className="site-container relative z-10 w-full py-16 lg:py-28 flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          {/* Left: Copy & CTAs */}
          <div className="w-full lg:w-[44%] flex flex-col items-start text-left">
            <h1 className="text-balance text-4xl sm:text-5xl md:text-[56px] font-bold tracking-tight text-[#17211D] leading-[1.15]">
              <span className="block sm:whitespace-nowrap">우리 아이에게</span>
              <span className="block sm:whitespace-nowrap mt-2">정말 필요한 선택</span>
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-[#64748B] sm:text-lg">
              검증된 브랜드, 전문가 추천, 보험 분석까지.<br />
              백조오브제의 엄격한 심사 기준을 통과한 프리미엄 펫슈어런스 에코시스템.
            </p>

            <div className="mt-10 flex flex-col gap-3 w-full sm:w-auto sm:flex-row">
              <Link
                href="#audit"
                className="inline-flex items-center justify-center gap-2 bg-[#17211D] px-8 py-4 text-sm font-bold text-white transition-all duration-300 hover:bg-[#334155] rounded-full shadow-[0_4px_14px_rgba(15,23,42,0.12)]"
              >
                백조오브제 Audit 보기
                <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="mt-4 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Link
                href="/brands"
                className="inline-flex items-center justify-center gap-2 border border-[rgba(15,23,42,0.12)] bg-white px-6 py-3.5 text-sm font-semibold text-[#334155] transition-all hover:bg-slate-50 rounded-full"
              >
                <Check className="size-4" /> 검증 브랜드관 둘러보기
              </Link>
              <Link
                href="/insurance"
                className="inline-flex items-center justify-center gap-2 border border-[rgba(15,23,42,0.12)] bg-white px-6 py-3.5 text-sm font-semibold text-[#334155] transition-all hover:bg-slate-50 rounded-full"
              >
                <HeartPulse className="size-4" /> 펫보험 비교하기
              </Link>
            </div>
          </div>

          {/* Right: Hero Curation Visual Image */}
          <div className="w-full lg:w-[56%] relative mt-12 lg:mt-0 flex lg:justify-end">
            <div className="relative w-full max-w-[820px] aspect-[4/3] lg:ml-auto">
              <Image 
                src="/images/hero-curation-visual-natural.png" 
                alt="백조오브제 큐레이션 비주얼" 
                fill 
                className="object-contain block" 
                priority
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Audit Section */}
      <section id="audit" className="bg-white py-16 lg:py-28 overflow-hidden">
        <ScrollReveal className="site-container">
          <div className="flex flex-col lg:flex-row gap-16 lg:gap-24">
            {/* Left: Sticky Title */}
            <div className="w-full lg:w-1/3 lg:sticky lg:top-32 self-start">
              <span className="inline-flex items-center justify-center size-14 rounded-full bg-[#1D3E2F]/10 mb-6 shadow-sm">
                <ShieldCheck className="size-6 text-[#1D3E2F]" />
              </span>
              <p className="font-editorial text-lg italic text-slate-400">Strict Standard</p>
              <h2 className="mt-3 text-balance font-editorial text-3xl sm:text-4xl lg:text-[40px] leading-[1.2] text-[#17211D] tracking-tight">
                타협하지 않는 기준,<br />Baekjo Audit
              </h2>
              <p className="mt-6 text-pretty text-sm leading-7 text-[#64748B]">
                백조오브제는 단순히 예쁜 상품을 판매하지 않습니다. 성분 안전성, 제조 시설 품질, 기업의 철학까지 검증된 브랜드만을 엄선하여 우리 아이에게 가장 안전한 선택을 제안합니다.
              </p>
            </div>
            
            {/* Right: 4 Step Cards */}
            <div className="w-full lg:w-2/3 grid gap-6 sm:grid-cols-2">
              {[
                { step: '1', title: '브랜드 철학 검증', desc: '생명을 존중하는 진정성 있는 기업 가치관' },
                { step: '2', title: '유해 성분 배제', desc: '조금의 논란이라도 있는 성분 100% 차단' },
                { step: '3', title: '제조 시설 실사', desc: '투명한 위생 상태 및 품질 관리 프로세스 점검' },
                { step: '4', title: '수의학적 자문', desc: '전문가 기반의 효능 검증 및 리스크 평가' },
              ].map((item) => (
                <div key={item.step} className="flex flex-col rounded-[18px] bg-[#FBFAF7] border border-[rgba(15,23,42,0.08)] p-6 shadow-sm transition-transform hover:-translate-y-1">
                  <div className="flex items-center gap-4 mb-4">
                    <span className="flex size-10 items-center justify-center rounded-full bg-white text-[#17211D] font-editorial text-xl italic border border-[rgba(15,23,42,0.06)] shadow-sm">{item.step}</span>
                    <h3 className="text-base font-semibold text-[#17211D] tracking-tight">{item.title}</h3>
                  </div>
                  <p className="text-sm text-[#64748B] leading-relaxed pl-14">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 3. 맞춤 큐레이션 (통합) */}
      <section className="bg-[#FBFAF7] py-16 lg:py-28 overflow-hidden border-t border-[rgba(15,23,42,0.06)]">
        <ScrollReveal className="site-container">
          <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
            {/* Left: Text & CTA */}
            <div className="w-full lg:w-1/3 lg:sticky lg:top-32 self-start">
              <p className="font-editorial text-lg italic text-slate-400">Custom Curation</p>
              <h2 className="mt-3 text-balance font-editorial text-3xl sm:text-4xl leading-[1.2] text-[#17211D] tracking-tight">
                반려동물 고민에 맞춘<br />큐레이션
              </h2>
              <p className="mt-6 text-pretty text-sm leading-7 text-[#64748B]">
                우리 아이의 상태를 알려주시면 가장 완벽한 관리 방향을 설계해 드립니다. 무엇부터 시작할지 막막하시다면 맞춤 진단을, 이미 필요한 고민이 있다면 고민별 가이드를 확인해 보세요.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col">
                <Link href="/diagnosis" className="inline-flex items-center justify-center gap-2 bg-[#17211D] rounded-full px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#334155] shadow-[0_4px_14px_rgba(15,23,42,0.12)]">
                  1분 맞춤 진단 시작 <ArrowRight className="size-4" />
                </Link>
                <Link href="/concerns" className="inline-flex items-center justify-center gap-2 bg-white border border-[rgba(15,23,42,0.12)] rounded-full px-6 py-3.5 text-sm font-semibold text-[#334155] transition-all hover:bg-slate-50">
                  모든 고민 살펴보기 <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>

            {/* Right: Flow & Concern Cards */}
            <div className="w-full lg:w-2/3 flex flex-col gap-10">
              {/* Top: Flow */}
              <div className="bg-white rounded-[24px] border border-[rgba(15,23,42,0.08)] p-6 sm:p-8 shadow-sm">
                <h3 className="text-sm font-bold text-[#17211D] mb-6 flex items-center gap-2">
                  <Activity className="size-4 text-[#1D3E2F]" /> 진단 기반 추천 프로세스
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
                  <div className="hidden sm:block absolute top-6 left-10 right-10 h-px bg-slate-200"></div>
                  {[
                    { icon: Search, title: '상태 체크' },
                    { icon: Check, title: '맞춤 결과' },
                    { icon: Activity, title: '제품 추천' },
                    { icon: ShieldCheck, title: '보험 연계' },
                  ].map((step, idx) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.title} className="relative flex flex-row sm:flex-col items-center gap-4 sm:gap-3 text-center">
                        <div className="shrink-0 flex items-center justify-center size-12 rounded-full bg-[#FBFAF7] border border-[rgba(15,23,42,0.06)] relative z-10">
                          <Icon className="size-5 text-[#1D3E2F]" />
                        </div>
                        <h4 className="font-semibold text-sm text-[#17211D]">{step.title}</h4>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom: 4 Concern Cards */}
              <div className="grid grid-cols-2 gap-4">
                {concerns.slice(0, 4).map((concern) => (
                  <div key={concern.slug} className="w-full">
                    <ConcernCard concern={concern} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* 4. 검증 브랜드관 */}
      <section id="brands" className="bg-[#FBFAF7] py-16 lg:py-28 overflow-hidden border-y border-[rgba(15,23,42,0.06)]">
        <ScrollReveal className="site-container">
          <SectionHeading
            eyebrow="Verified brands"
            title="어떤 브랜드가 좋은지 모르겠다면,<br />저희가 미리 검증한 브랜드를 만나보세요."
            description="입점보다 검증을 먼저 생각합니다. 제품 데이터 판독, 제조 품질, 성분 안전성을 직접 확인한 프리미엄 큐레이션 공간입니다."
          />
          <div className="mt-12 flex flex-col gap-6 pb-4">
            {displayBrands.slice(0, 1).map((brand) => {
              const brandProducts = products.filter(p => p.brandId === brand.id).slice(0, 2);
              return <BrandShowroomCard key={brand.id} brand={brand} products={brandProducts} />;
            })}
          </div>
          <div className="mt-8 flex justify-center">
            <Link href="/brands" className="inline-flex items-center gap-2 bg-white border border-[rgba(15,23,42,0.12)] rounded-full px-8 py-4 text-sm font-semibold text-[#334155] transition-all hover:bg-slate-50 shadow-sm">
              모든 검증 브랜드 쇼룸 보기 <ArrowRight className="size-4" />
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* 5. 베스트 상품 */}
      <section className="bg-white py-16 lg:py-28 overflow-hidden">
        <ScrollReveal className="site-container">
          <SectionHeading
            eyebrow="The daily edit"
            title="Audit를 통과한 오늘의 추천"
            description="검증된 브랜드 중에서도 가장 많은 보호자님들께 선택받은 대표 상품입니다."
            href="/shop"
            linkLabel="전체 셀렉션 보기"
          />
          <div className="mt-12 flex overflow-x-auto snap-x scrollbar-hide gap-4 md:grid md:grid-cols-4 md:gap-x-6 md:gap-y-10 pb-4">
            {bestProducts.map((product) => (
              <div key={product.id} className="shrink-0 w-[240px] md:w-auto snap-start">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* 7. 펫보험 무료 분석 (Mock UI Flow) */}
      <section id="insurance" className="bg-[#FBFAF7] py-16 lg:py-28 overflow-hidden border-y border-[rgba(15,23,42,0.06)] relative">
        <ScrollReveal className="site-container relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="font-editorial text-lg italic text-slate-400">Insurance Analysis</p>
            <h2 className="mt-4 text-balance font-editorial text-3xl sm:text-4xl leading-tight text-[#17211D] tracking-tight">
              보이지 않는 미래의 병원비까지 점검합니다.
            </h2>
            <p className="mt-5 text-pretty text-sm leading-7 text-[#64748B]">
              옆집 아이의 정답이 우리 아이의 정답일까요? 나이와 질환에 꼭 맞는 맞춤 특약을 찾고,<br className="hidden sm:block" /> 보험 가입을 강요하지 않는 객관적인 약관 분석 프로세스를 경험해 보세요.
            </p>
          </div>

          {/* Flow Cards */}
          <div className="flex flex-col lg:flex-row gap-6 relative">
            {/* Step 1 */}
            <div className="flex-1 rounded-[24px] bg-white border border-[rgba(15,23,42,0.08)] p-6 lg:p-8 shadow-sm flex flex-col items-center text-center relative mt-0 lg:mt-0">
              <span className="flex size-12 items-center justify-center rounded-full bg-[#FBFAF7] text-slate-400 font-editorial text-xl italic mb-6">1</span>
              <div className="w-full max-w-[200px] mb-6 space-y-3">
                <div className="h-2 w-1/2 bg-slate-200 rounded-full mx-auto"></div>
                <div className="h-10 w-full bg-[#FBFAF7] border border-[rgba(15,23,42,0.06)] rounded-lg flex items-center px-4 gap-2">
                  <div className="size-3 rounded-sm bg-[#1D3E2F]"></div>
                  <div className="h-2 w-20 bg-slate-200 rounded-full"></div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[#17211D]">기본 정보 동의</h3>
              <p className="mt-2 text-xs text-[#64748B]">최소한의 정보로 비교를 시작합니다.</p>
            </div>

            {/* Step 2 */}
            <div className="flex-1 rounded-[24px] bg-white border border-[rgba(15,23,42,0.08)] p-6 lg:p-8 shadow-[0_12px_40px_rgba(15,23,42,0.04)] flex flex-col items-center text-center relative mt-0 lg:mt-8 z-10">
              <span className="flex size-12 items-center justify-center rounded-full bg-[#1D3E2F] text-white font-editorial text-xl italic mb-6 shadow-md">2</span>
              <div className="w-full max-w-[200px] mb-6 space-y-2">
                <div className="flex justify-between items-center bg-[#FBFAF7] p-2.5 rounded-lg border border-[rgba(15,23,42,0.06)]">
                  <span className="text-[10px] font-medium text-slate-400">품종</span>
                  <span className="text-[10px] font-bold text-[#17211D]">말티즈</span>
                </div>
                <div className="flex justify-between items-center bg-[#FBFAF7] p-2.5 rounded-lg border border-[rgba(15,23,42,0.06)]">
                  <span className="text-[10px] font-medium text-slate-400">나이</span>
                  <span className="text-[10px] font-bold text-[#17211D]">만 4세</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[#17211D]">맞춤 조건 입력</h3>
              <p className="mt-2 text-xs text-[#64748B]">아이의 건강 상태를 꼼꼼히 체크합니다.</p>
            </div>

            {/* Step 3 */}
            <div className="flex-1 rounded-[24px] bg-white border border-[rgba(15,23,42,0.08)] p-6 lg:p-8 shadow-sm flex flex-col items-center text-center relative mt-0 lg:mt-16">
              <span className="flex size-12 items-center justify-center rounded-full bg-[#FBFAF7] text-slate-400 font-editorial text-xl italic mb-6">3</span>
              <div className="w-full max-w-[200px] mb-6">
                <div className="bg-[#FBFAF7] rounded-xl p-3 border border-[rgba(15,23,42,0.06)] text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-[#17211D]">추천 특약 A</span>
                    <HeartPulse className="size-3 text-[#1D3E2F]" />
                  </div>
                  <div className="text-xs font-bold text-[#17211D]">월 32,000원~</div>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[#17211D]">결과 리포트</h3>
              <p className="mt-2 text-xs text-[#64748B]">최적의 보장 조건을 안내합니다.</p>
            </div>
          </div>

          <div className="mt-16 text-center">
            <p className="text-xs text-slate-400 mb-6">* 본 화면은 실제 API 연동이 아닌 가이드라인 안내를 위한 예시 화면입니다.</p>
            <Link href="/insurance" className="inline-flex items-center gap-2 bg-[#17211D] rounded-full px-8 py-4 text-sm font-semibold text-white transition-all hover:bg-[#334155] shadow-lg">
              무료 분석 프로세스 시작하기 <ArrowRight className="size-4" />
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* 8. 케어 키트 / 협업 (Banner Type) */}
      <section className="bg-white py-12 lg:py-16 overflow-hidden">
        <ScrollReveal className="site-container">
          <div className="bg-[#FBFAF7] rounded-[24px] border border-[rgba(15,23,42,0.06)] p-8 lg:p-12 flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
            <div className="relative z-10 max-w-xl">
              <p className="font-editorial text-sm italic text-slate-400 mb-2">Care Kit & Partnership</p>
              <h2 className="text-balance font-editorial text-2xl sm:text-3xl leading-tight text-[#17211D] tracking-tight">
                가장 도움이 필요한 순간, 실질적인 위로를 전합니다.
              </h2>
              <p className="mt-4 text-pretty text-sm leading-6 text-[#64748B]">
                동물병원, 장례식장, 파트너 브랜드와 함께 긴급한 순간에 꼭 필요한 샘플과 가이드를 제공하는 백조오브제 케어 키트를 만나보세요.
              </p>
            </div>
            <div className="relative z-10 shrink-0 flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <Link href="/landing/care-kit" className="inline-flex items-center justify-center gap-2 bg-[#17211D] rounded-full px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[#334155] w-full sm:w-auto">
                케어 키트 살펴보기
              </Link>
              <Link href="/landing/care-kit#partner" className="inline-flex items-center justify-center gap-2 bg-white border border-[rgba(15,23,42,0.12)] rounded-full px-6 py-3.5 text-sm font-semibold text-[#17211D] transition-all hover:bg-slate-50 w-full sm:w-auto">
                제휴 문의
              </Link>
            </div>
            {/* Background Decoration */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#F4EFE8]/50 to-transparent pointer-events-none"></div>
            <HeartHandshake className="absolute -right-8 -bottom-8 size-48 text-[#17211D]/[0.02] pointer-events-none" />
          </div>
        </ScrollReveal>
      </section>

      {/* 9 & 10. Trust Block (후기 & 공지사항 통합) */}
      <section className="bg-white py-16 lg:py-28 overflow-hidden">
        <ScrollReveal className="site-container">
          <div className="flex flex-col mb-12">
            <p className="font-editorial text-lg italic text-slate-400">Trust Board</p>
            <h2 className="mt-3 text-balance font-editorial text-3xl sm:text-4xl leading-tight text-[#17211D] tracking-tight">
              함께 만드는 백조오브제의 기록
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
            {/* Reviews */}
            <div className="w-full lg:w-2/3">
              <div className="flex justify-between items-end mb-6">
                <h3 className="text-lg font-semibold text-[#17211D]">먼저 함께해 본 이들의 이야기</h3>
                <Link href="/reviews" className="text-sm font-semibold text-[#64748B] hover:text-[#17211D] transition-colors flex items-center gap-1">
                  후기 전체보기 <ArrowRight className="size-3" />
                </Link>
              </div>
              <div className="flex flex-col gap-4">
                {reviews.slice(0, 2).map((review) => (
                  <div key={review.id} className="bg-[#FBFAF7] rounded-[16px] border border-[rgba(15,23,42,0.06)] p-5 hover:shadow-sm transition-shadow">
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
                <h3 className="text-lg font-semibold text-[#17211D]">새로운 소식</h3>
                <Link href="/notices" className="text-sm font-semibold text-[#64748B] hover:text-[#17211D] transition-colors flex items-center gap-1">
                  공지 전체보기 <ArrowRight className="size-3" />
                </Link>
              </div>
              <div className="flex flex-col border-t border-[rgba(15,23,42,0.06)]">
                {recentNotices.map((notice) => (
                  <Link
                    key={notice.id}
                    href={`/notices/${notice.id}`}
                    className="group flex flex-col justify-center gap-2 border-b border-[rgba(15,23,42,0.06)] py-5 transition-colors hover:bg-slate-50 px-2 -mx-2 rounded-lg"
                  >
                    <span className="line-clamp-2 text-sm font-medium text-[#334155] group-hover:text-[#17211D] leading-relaxed">{notice.title}</span>
                    <span className="text-[11px] font-semibold text-slate-400">{formatDate(notice.date)}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
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
        <h2 className="mt-3 max-w-2xl text-balance font-editorial text-3xl sm:text-4xl leading-tight text-[#17211D] tracking-tight" dangerouslySetInnerHTML={{ __html: title }}>
        </h2>
        <p className="mt-4 max-w-xl text-pretty text-sm leading-7 text-[#64748B]">{description}</p>
      </div>
      {href && linkLabel && (
        <Link href={href} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-[#334155] hover:text-[#17211D] transition-colors">
          {linkLabel}
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
