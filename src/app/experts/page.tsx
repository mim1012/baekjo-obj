import { Stethoscope, Utensils, Activity, Search, ShieldCheck, ListChecks, FileText, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { listCachedPublicProducts } from '@/lib/public-read-cache';
import ProductCard from '@/components/common/ProductCard';
import { getPublishedPageContent } from '@/lib/cms/content';
import type { SiteShellContent } from '@/components/providers/PublicSiteContentProvider';
import { redirect } from 'next/navigation';

type ExpertsContent = Record<string, unknown> & {
  hero: { visible: boolean; eyebrow: string; title: string; description: string; image: string; imageAlt: string; primaryCtaLabel: string; primaryCtaHref: string; secondaryCtaLabel: string; secondaryCtaHref: string };
  body: {
    visible: boolean;
    title: string;
    description: string;
    perspectiveItems: Array<{ filterValue: string; productRule?: 'veterinary' | 'nutrition' | 'lifestyle'; title: string; description: string; bullets: string; linkLabel: string; visible: boolean }>;
    processItems: Array<{ title: string; description: string; visible: boolean }>;
    productsTitle: string;
    allFilterLabel: string;
    emptyText: string;
    noticeTitle: string;
    noticeDescription: string;
    noticeLinkLabel: string;
    noticeLinkHref: string;
  };
};

const perspectiveIcons = [Stethoscope, Utensils, Activity];
const processIcons = [Search, ShieldCheck, ListChecks, FileText];

export const metadata = {
  title: '전문가 추천 | 백조오브제',
  description: '전문가 관점으로 살펴보는 상품 선택 기준을 확인하세요.',
};

export const dynamic = 'force-dynamic';

export default async function ExpertsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = 'all' } = await searchParams;
  const [products, content, shell] = await Promise.all([
    listCachedPublicProducts(),
    getPublishedPageContent<ExpertsContent>('experts'),
    getPublishedPageContent<SiteShellContent & Record<string, unknown>>('site-shell'),
  ]);
  if (!shell.features.experts) redirect('/');
  
  const visiblePerspectives = content.body.perspectiveItems.filter((item) => item.visible);
  const activePerspectiveIndex = visiblePerspectives.findIndex((item) => item.filterValue === filter);
  const activeProductRule = activePerspectiveIndex < 0
    ? undefined
    : visiblePerspectives[activePerspectiveIndex]?.productRule
      ?? (['veterinary', 'nutrition', 'lifestyle'] as const)[activePerspectiveIndex];
  const filteredProducts = products.filter(p => {
    if (!p.isRecommended) return false;
    if (filter === 'all' || activePerspectiveIndex < 0) return true;
    if (activeProductRule === 'veterinary') return p.recommendedFor?.includes('veterinary') || p.category === '영양제' || p.category === '간식';
    if (activeProductRule === 'nutrition') return p.recommendedFor?.includes('nutrition') || p.category === '사료' || p.category === '간식';
    if (activeProductRule === 'lifestyle') return p.recommendedFor?.includes('lifestyle') || p.category === '장난감' || p.category === '용품';
    return true;
  }).slice(0, 12);

  return (
    <div className="bg-[#FAF9F5] min-h-dvh pb-24 text-[#1A1D1B]" style={{ wordBreak: 'keep-all' }}>
      {/* 1. 전문가 추천 인트로 (박스 없음) */}
      {content.hero.visible && <section className="pt-16 pb-12 overflow-hidden">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
           <div className="flex flex-col md:flex-row items-center relative">
              <div className="relative z-10 w-full md:w-[58%] pt-4 pb-6 md:py-0">
                 <p className="font-editorial text-[12px] tracking-widest text-[#A8742E] font-semibold uppercase mb-4">
                    {content.hero.eyebrow}
                 </p>
                 <h1 className="text-[32px] md:text-[38px] lg:text-[46px] font-bold text-[#1A1D1B] leading-[1.25] tracking-[-0.035em] break-keep mb-5 min-w-0">
                    <MultilineText text={content.hero.title} />
                 </h1>
                 <p className="text-[14px] md:text-[15px] text-[#5F6761] leading-[1.65] break-keep min-w-0">
                    {content.hero.description}
                 </p>
                 <div className="mt-7 flex flex-wrap gap-3">
                   {content.hero.primaryCtaLabel && <Link href={content.hero.primaryCtaHref} className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#1A221E] px-6 text-[14px] font-bold text-white">{content.hero.primaryCtaLabel}</Link>}
                   {content.hero.secondaryCtaLabel && <Link href={content.hero.secondaryCtaHref} className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#D8D6CE] bg-white px-6 text-[14px] font-bold text-[#1A1D1B]">{content.hero.secondaryCtaLabel}</Link>}
                 </div>
              </div>
              <div className="relative z-0 w-full md:w-[42%] flex justify-center md:justify-end mt-6 md:mt-0 h-[260px] md:h-[340px]">
                 {/* 우측 이미지 - 시안의 강아지 이미지 */}
                 <div className="relative w-full h-full max-w-[400px]">
                    {/* 이미지가 없을 경우를 대비한 구조. 실제 프로젝트에 전문가 이미지 에셋이 있다면 교체. 
                        현재 에셋이 확실치 않아 투명 배경의 강아지 이미지라고 가정합니다. */}
                    {/* TODO(dad): experts-dog.png 원본이 dad 레포에 미커밋 상태 — 확보되면 교체 */}
                    {content.hero.image && <Image src={content.hero.image} alt={content.hero.imageAlt} fill className="object-contain object-bottom" />}
                 </div>
              </div>
           </div>
        </div>
      </section>}

      {/* 2. 전문가 관점 카드 3개 */}
      {content.body.visible && <><section className="mt-4">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {content.body.perspectiveItems.filter((item) => item.visible).map((item, index) => {
              const Icon = perspectiveIcons[index % perspectiveIcons.length];
              return <div key={item.filterValue} className="bg-white border border-[#EBE8E1] rounded-[24px] p-8 lg:p-10 flex flex-col items-center text-center shadow-sm">
                <div className="flex size-[64px] items-center justify-center rounded-full bg-[#FAF9F5] text-[#1A221E] mb-6 border border-[#F4F2EC]">
                  <Icon className="size-8" strokeWidth={1.5} />
                </div>
                <h2 className="text-[18px] font-bold text-[#1A1D1B] mb-3">{item.title}</h2>
                <p className="text-[14px] leading-[1.65] text-[#5F6761] mb-6 break-keep whitespace-pre-line">{item.description}</p>
                <ul className="text-left text-[13px] leading-[2.2] text-[#5F6761] mb-10 w-full">
                  {item.bullets.split('\n').map((entry) => entry.trim()).filter(Boolean).map((entry) => (
                    <li key={entry} className="flex gap-2"><span className="text-[#A8742E]">•</span>{entry}</li>
                  ))}
                </ul>
                <Link href={`/experts?filter=${encodeURIComponent(item.filterValue)}`} scroll={false} className="mt-auto flex h-[46px] w-[80%] mx-auto items-center justify-center rounded-full bg-[#1A221E] text-[14px] font-bold text-white transition-colors hover:bg-black">
                  {item.linkLabel}
                </Link>
              </div>;
            })}
          </div>
        </div>
      </section>

      {/* 3. 상품 선정 과정 4단계 (시안처럼 투명/화이트 배경에 둥근 아이콘, 화살표) */}
      <section className="mt-20">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <h2 className="text-[20px] font-bold text-[#1A1D1B] mb-2">{content.body.title}</h2>
          <p className="mb-8 text-sm leading-6 text-[#5F6761]">{content.body.description}</p>
          <div
            className="hide-scrollbar -mx-5 flex snap-x snap-mandatory scroll-px-5 items-stretch gap-4 overflow-x-auto px-5 pb-4 md:mx-0 md:items-center md:justify-between md:overflow-visible md:px-2 md:pb-0"
            role="region"
            aria-label="상품 선정 과정 네 단계"
          >
            
            {content.body.processItems.filter((item) => item.visible).map((step, idx) => {
              const StepIcon = processIcons[idx % processIcons.length];
              return (
              <div key={idx} className="relative z-10 flex min-h-[176px] w-[78vw] max-w-[316px] shrink-0 snap-start flex-col items-start gap-4 rounded-[20px] border border-[#E7E0D5] bg-white p-5 md:min-h-0 md:w-[22%] md:max-w-none md:items-center md:border-0 md:bg-transparent md:p-0">
                <div className="font-editorial text-[14px] font-semibold text-[#1A1D1B]">{String(idx + 1).padStart(2, '0')}</div>
                <div className="flex size-[56px] shrink-0 items-center justify-center rounded-full border border-[#EBE8E1] bg-[#FAF8F3] text-[#1A221E] shadow-sm md:size-[72px] md:bg-white">
                  <StepIcon className="size-6 md:size-7 text-[#5F6761]" strokeWidth={1.5} />
                </div>
                <h3 className="mt-auto w-full break-keep text-left text-[16px] font-bold leading-snug text-[#1A1D1B] md:mt-0 md:w-[70%] md:text-center md:text-[15px]">{step.title}</h3>
                {step.description && <p className="w-full break-keep text-left text-[13px] leading-5 text-[#6F766F] md:text-center">{step.description}</p>}
                
                {/* 화살표 */}
                {idx < content.body.processItems.filter((item) => item.visible).length - 1 && (
                   <div className="hidden md:block absolute right-[-15%] top-[50%] -translate-y-1/2 text-[#D8D6CE]">
                      <ArrowRight className="size-5" />
                   </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. 추천 상품 섹션 */}
      <section className="mt-20 border-t border-[#EBE8E1] pt-16">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <h2 className="text-[20px] font-bold text-[#1A1D1B] mb-8">{content.body.productsTitle}</h2>
          
          {/* 필터 - 윤곽선 있는 알약 형태, 활성화시 짙은 녹색 */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
            {['all', ...visiblePerspectives.map((item) => item.filterValue)].map((f) => {
              const isSelected = filter === f || (filter === 'all' && f === 'all');
              return (
                <Link
                  key={f}
                  href={f === 'all' ? '/experts' : `/experts?filter=${encodeURIComponent(f)}`}
                  scroll={false}
                  className={`flex h-[40px] shrink-0 items-center rounded-full border px-6 text-[14px] font-semibold whitespace-nowrap transition-colors ${
                    isSelected 
                      ? 'border-[#1A221E] bg-[#1A221E] text-white' 
                      : 'border-[#EBE8E1] bg-white text-[#5F6761] hover:border-[#D8D6CE] hover:text-[#1A1D1B]'
                  }`}
                >
                  {f === 'all' ? content.body.allFilterLabel : f}
                </Link>
              )
            })}
          </div>

          {/* 상품 그리드 */}
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4 xl:gap-6">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-[20px] border border-[#EBE8E1] bg-white h-[180px]">
              <Search className="size-8 text-[#D8D6CE] mb-3" />
              <p className="text-[#5F6761] text-[15px] font-medium">{content.body.emptyText}</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. 추천 기준 안내 CTA */}
      <section className="mt-16">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="bg-[#F4F2EC] rounded-[16px] p-6 md:px-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-[#EBE8E1]">
            <div className="flex items-start gap-4">
              <div className="mt-0.5">
                 <ShieldCheck className="size-6 text-[#A8742E]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[14px] md:text-[15px] font-bold text-[#1A1D1B] mb-1 break-keep">
                  {content.body.noticeTitle}
                </p>
                <p className="text-[13px] text-[#5F6761] break-keep">
                  {content.body.noticeDescription}
                </p>
              </div>
            </div>
            <Link href={content.body.noticeLinkHref} className="shrink-0 w-full md:w-auto flex h-[44px] items-center justify-center rounded-full bg-white border border-[#EBE8E1] px-5 text-[13px] font-bold text-[#1A1D1B] transition-colors hover:bg-[#FAF9F5]">
              {content.body.noticeLinkLabel}
              <ArrowRight className="ml-2 size-4 text-[#5F6761]" />
            </Link>
          </div>
        </div>
      </section>
      </>}
    </div>
  );
}

function MultilineText({ text }: { text: string }) {
  return <>{text.split('\n').map((line, index) => <span key={`${line}-${index}`}>{index > 0 && <br />}{line}</span>)}</>;
}
