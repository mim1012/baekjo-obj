import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, ChevronRight, House, PlusSquare, Search } from 'lucide-react';
import { getConcernsConfigWithFallback } from '@/lib/concerns/repo';
import { listCachedPublicProducts } from '@/lib/public-read-cache';
import { getShowcaseReviewsConfigWithFallback } from '@/lib/reviews/repo';
import ProductCard from '@/components/common/ProductCard';
import ReviewCard from '@/components/common/ReviewCard';
import { getPublishedPageContent } from '@/lib/cms/content';
import type { SiteShellContent } from '@/components/providers/PublicSiteContentProvider';

interface ConcernDetailPageProps {
  params: Promise<{ slug: string }>;
}

// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: ConcernDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { items: concerns } = await getConcernsConfigWithFallback();
  const concern = concerns.find((item) => item.slug === slug);

  if (!concern) {
    return { title: '고민별 케어' };
  }

  return {
    title: `${concern.title} 케어`,
    description: concern.heroDescription ?? concern.shortDescription,
  };
}

export default async function ConcernDetailPage({ params }: ConcernDetailPageProps) {
  const { slug } = await params;
  const [{ items: concerns }, shell] = await Promise.all([
    getConcernsConfigWithFallback(),
    getPublishedPageContent<SiteShellContent & Record<string, unknown>>('site-shell'),
  ]);
  const concern = concerns.find((item) => item.slug === slug);

  if (!concern) {
    notFound();
  }

  const allProducts = await listCachedPublicProducts();
  const recommendedProducts = concern.recommendedProductIds.flatMap((productId) => {
    const product = allProducts.find((item) => item.id === productId);
    return product ? [product] : [];
  });
  const { items: showcaseReviews } = await getShowcaseReviewsConfigWithFallback();
  const relatedReviews = showcaseReviews.filter((review) =>
    review.isVisible !== false && concern.recommendedProductIds.includes(review.productId),
  );

  const symptoms = concern.symptoms;
  const hospitalSigns = concern.hospitalSigns ?? concern.causes;
  const quickGuideItems = concern.quickGuideItems ?? [];

  return (
    <main className="flex flex-col bg-[#F8F6F0] min-h-screen pb-0">
      {/* 1. 상단 인트로 및 히어로 — 홈과 같은 전체 배경형 구조 */}
      <section data-testid="concern-detail-hero" className="relative h-[640px] w-full overflow-hidden bg-[#EDE5D8] sm:h-[620px] md:h-[480px] lg:h-[520px] xl:h-[560px]">
        <Image
          src={concern.heroImage || '/images/hero-curation-visual.png'}
          alt={`${concern.title} 케어 안내`}
          fill
          priority
          sizes="100vw"
          quality={90}
          data-testid="concern-detail-hero-image"
          className="object-cover"
          style={{ objectPosition: concern.heroImagePosition ?? 'center' }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(248,246,240,0.94)_0%,rgba(248,246,240,0.76)_42%,rgba(248,246,240,0.18)_72%,rgba(248,246,240,0)_100%)] md:bg-[linear-gradient(90deg,rgba(248,246,240,0.95)_0%,rgba(248,246,240,0.80)_32%,rgba(248,246,240,0.30)_56%,rgba(248,246,240,0)_78%)]"
        />

        <div className="relative z-10 mx-auto flex h-full w-full max-w-[1280px] items-start px-5 pb-8 pt-12 md:items-center md:px-8 md:py-10 lg:px-12 xl:px-14">
          <div className="flex w-full max-w-[560px] flex-col items-start md:w-[54%] md:min-w-[450px]">
            <Link
              href="/concerns"
              className="mb-4 inline-flex min-h-11 items-center gap-2 text-[14px] font-medium text-[#59615B] transition-colors duration-300 hover:text-[#17251F] sm:mb-6 sm:text-[15px]"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              {concern.backLabel}
            </Link>

            <div className="inline-flex h-[34px] items-center gap-1.5 rounded-full border border-white/80 bg-white/82 px-3.5 text-[13px] font-bold text-[#17251F] shadow-sm backdrop-blur-sm sm:h-[36px] sm:px-4 sm:text-[14px]">
              <span aria-hidden="true" className="text-[16px] leading-none">{concern.icon}</span>
              {concern.title} {concern.badgeSuffix}
            </div>

            <h1 className="mt-6 max-w-[540px] whitespace-pre-line break-keep text-[32px] font-bold leading-[1.14] tracking-[-0.035em] text-[#17251F] sm:mt-7 sm:text-[42px] lg:text-[52px]">
              {concern.heroTitle}
            </h1>

            <p className="mt-5 max-w-[500px] break-keep text-[15px] leading-[1.7] text-[#59615B] sm:mt-6 sm:text-[16px]">
              {concern.heroDescription}
            </p>
          </div>
        </div>
      </section>

      {/* 2. 핵심 정보 요약 바 */}
      <div className="mx-auto mb-12 mt-10 w-full max-w-[1240px] px-5 md:mt-14 md:px-7 lg:mb-16 lg:mt-16 lg:px-10 xl:px-12">
        <div className="flex flex-col sm:flex-row sm:items-stretch overflow-hidden rounded-[18px] sm:rounded-[20px] border border-[#E4DDD1] bg-[#FFFEFB] sm:min-h-[112px] lg:min-h-[124px]">
          {quickGuideItems.map((item, index) => (
            <a
              key={item.title}
              href={item.href}
              className="group flex flex-1 items-center gap-4 border-b border-[#E4DDD1] px-5 py-6 transition-colors last:border-b-0 hover:bg-[#F8F6F0] sm:border-b-0 sm:border-r sm:px-4 sm:last:border-r-0 lg:gap-5 lg:px-6"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#F8F6F0] text-[#17251F] lg:size-12">
                {item.icon === 'home' ? (
                  <House className="size-[20px] lg:size-[22px]" strokeWidth={1.5} />
                ) : item.icon === 'hospital' ? (
                  <PlusSquare className="size-[20px] lg:size-[22px]" strokeWidth={1.5} />
                ) : (
                  <Search className="size-[20px] lg:size-[22px]" strokeWidth={1.5} />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="flex items-center gap-1.5 text-[15px] font-bold tracking-tight text-[#17251F] lg:text-[16px]">
                  <span className="font-editorial text-[13px] font-semibold text-[#B68B4E] lg:text-[14px]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  {item.title}
                </span>
                <span className="mt-1 break-keep text-[13px] leading-snug text-[#72766F] lg:text-[14px]">
                  {item.description}
                </span>
              </div>
              <ChevronRight className="size-4 shrink-0 text-[#E4DDD1] transition-colors group-hover:text-[#B68B4E]" />
            </a>
          ))}
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-5 md:px-7 lg:px-10 xl:px-12 pb-16 space-y-14 lg:space-y-16">

        {/* 3. 증상 확인 + 병원 방문 기준 2단 통합 섹션 */}
        <section id="hospital" className="scroll-mt-32 flex flex-col lg:flex-row gap-5 lg:gap-6">
          {/* 왼쪽: 증상 확인 (52%) */}
          <div id="signals" className="scroll-mt-32 w-full lg:w-[52%] p-6 sm:p-8 lg:p-10 bg-[#FFFEFB] border border-[#E4DDD1] rounded-[20px] lg:rounded-[24px]">
            <h3 className="text-[18px] lg:text-[20px] font-bold tracking-tight text-[#17251F] mb-6">{concern.signalsTitle}</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {symptoms.map((symptom) => (
                <li
                  key={symptom}
                  className="flex items-center gap-3 rounded-[12px] lg:rounded-[14px] border border-[#E4DDD1] bg-white px-4 lg:px-[18px] h-[64px] lg:h-[72px]"
                >
                  <Check className="size-[16px] shrink-0 text-[#B68B4E]" aria-hidden="true" strokeWidth={2.5} />
                  <span className="break-keep text-[14px] font-medium text-[#17251F] leading-snug">{symptom}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 오른쪽: 병원 방문 기준 (48%) */}
          <div className="w-full lg:w-[48%] p-6 sm:p-8 lg:p-10 bg-[#FFFEFB] border border-[#E4DDD1] rounded-[20px] lg:rounded-[24px]">
            <h3 className="break-keep text-[18px] lg:text-[20px] font-bold tracking-tight text-[#17251F]">
              {concern.hospitalTitle}
            </h3>
            <p className="mt-2.5 break-keep text-[13px] lg:text-[14px] leading-[1.65] text-[#72766F]">
              {concern.hospitalDescription}
            </p>
            <ol className="mt-7 space-y-3 lg:space-y-3.5">
              {hospitalSigns.map((sign) => (
                <li key={sign} className="flex items-start gap-2.5">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#B68B4E]" />
                  <span className="break-keep text-[14px] font-medium leading-[1.6] text-[#17251F]">{sign}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4. 관련 상품 */}
        <section id="products" className="scroll-mt-32">
          <div className="mb-6 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
            <h2 className="text-[20px] lg:text-[24px] font-bold text-[#17251F] tracking-tight">{concern.productsTitle}</h2>
            <Link href={`/shop?concern=${concern.slug}`} className="flex min-h-11 items-center gap-1 text-[13px] font-semibold text-[#17251F] transition-colors hover:text-[#B68B4E] sm:min-h-0 lg:text-[14px]">
              {concern.productsLinkLabel} <ChevronRight className="size-4" />
            </Link>
          </div>

          {recommendedProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5 xl:gap-6">
              {recommendedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div
              data-testid="concern-products-empty"
              className="flex min-h-[180px] items-center justify-center rounded-[18px] border border-[#E4DDD1] bg-[#FFFEFB] px-6 py-10 text-center lg:min-h-[220px] lg:rounded-[20px]"
            >
              <p className="break-keep text-[14px] leading-[1.7] text-[#72766F] lg:text-[15px]">
                {concern.productsEmptyText}
              </p>
            </div>
          )}
        </section>

        {/* 5. 펫보험 안내 (배너형) */}
        {shell.features.insurance && (
        <section id="insurance" className="scroll-mt-32">
          <div className="w-full rounded-[20px] lg:rounded-[24px] bg-[#16382D] px-6 py-8 sm:px-10 lg:px-10 lg:py-10 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden h-auto md:h-[220px] lg:h-[240px]">
            {/* 좌측 콘텐츠 (55%) */}
            <div className="relative z-10 md:w-[55%] flex flex-col">
              <h2 className="break-keep text-[22px] sm:text-[24px] lg:text-[26px] font-bold leading-[1.3] tracking-tight text-[#FFFEFB]">
                {concern.insuranceTitle}
              </h2>
              <p className="mt-3 break-keep text-[14px] lg:text-[15px] leading-[1.65] text-[#FFFEFB]/80">
                {concern.insuranceDescription}
              </p>
            </div>
            {/* 중앙 CTA (20%) */}
            <div className="relative z-10 w-full md:w-[20%] flex justify-start md:justify-center">
              <Link
                href={concern.insuranceButtonHref ?? '/insurance'}
                className="inline-flex h-[44px] lg:h-[48px] items-center justify-center rounded-[12px] bg-[#FFFEFB] px-5 text-[14px] font-bold text-[#16382D] transition-colors hover:bg-[#F2EEE5]"
              >
                {concern.insuranceButtonLabel} <ChevronRight className="ml-1 size-4" />
              </Link>
            </div>
            {/* 우측 이미지 (25%) */}
            <div className="hidden md:block relative z-10 w-[25%] h-full">
              <div className="absolute right-0 bottom-[-40px] w-[200px] h-[240px]">
                <Image
                  src={concern.insuranceImage || '/images/insurance-dog.webp'}
                  alt={concern.insuranceImageAlt ?? '펫보험 분석'}
                  fill
                  className="object-contain object-right-bottom"
                />
              </div>
            </div>
          </div>
        </section>
        )}

        {/* 6. 반려가족 후기 */}
        {relatedReviews.length > 0 && (
        <section id="reviews" className="scroll-mt-32">
          <div className="mb-6 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
            <h2 className="text-[20px] lg:text-[24px] font-bold text-[#17251F] tracking-tight">{concern.reviewsTitle}</h2>
            <Link href="/reviews" className="flex min-h-11 items-center gap-1 text-[13px] font-semibold text-[#17251F] transition-colors hover:text-[#B68B4E] sm:min-h-0 lg:text-[14px]">
              {concern.reviewsLinkLabel} <ChevronRight className="size-4" />
            </Link>
          </div>

          <div className="horizontal-snap-rail pb-4" tabIndex={0} role="region" aria-label="관련 후기 가로 스크롤">
            {relatedReviews.map((review) => {
              const product = allProducts.find((item) => item.id === review.productId);
              return (
                <div key={review.id} className="horizontal-snap-item md:basis-[calc(50%-0.5rem)]">
                  <ReviewCard review={review} productName={product?.name} />
                </div>
              );
            })}
          </div>
        </section>
        )}

        {/* 7. FAQ */}
        <section id="faq" className="scroll-mt-32">
          <div className="bg-[#FFFEFB] border border-[#E4DDD1] rounded-[18px] lg:rounded-[20px] overflow-hidden">
            <div className="w-full p-6 sm:p-8 lg:p-9">
              <h2 className="text-[18px] lg:text-[20px] font-bold text-[#17251F] tracking-tight mb-6">{concern.faqTitle}</h2>
              <div className="space-y-2 lg:space-y-3">
                {concern.faq.map((item) => (
                  <details
                    key={item.question}
                    className="group rounded-[10px] lg:rounded-[12px] border border-[#E4DDD1] bg-white px-4 py-3.5 sm:px-5 sm:py-4 transition-colors duration-300 open:bg-[#F8F6F0]"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                      <span className="flex items-start gap-2 break-keep text-[14px] lg:text-[15px] font-bold leading-[1.5] text-[#17251F]">
                        <span className="font-editorial text-[#B68B4E] font-medium text-[16px]">Q</span>
                        {item.question}
                      </span>
                      <ChevronDown
                        className="size-[18px] shrink-0 text-[#72766F] transition-transform duration-300 group-open:rotate-180"
                        aria-hidden="true"
                      />
                    </summary>
                    <p className="ml-[22px] mt-3 max-w-[90%] break-keep text-[13px] lg:text-[14px] leading-[1.7] text-[#72766F] pb-1">
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
