import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, ChevronDown, ChevronRight, MessageCircleQuestion, Home, PlusSquare, Search } from 'lucide-react';
import { getConcernsConfigWithFallback } from '@/lib/concerns/repo';
import { listProducts } from '@/lib/products/repo';
import { listBrands } from '@/lib/brands/repo';
import { getShowcaseReviewsConfigWithFallback } from '@/lib/reviews/repo';
import BrandLogo from '@/components/common/BrandLogo';
import EmptyState from '@/components/common/EmptyState';
import ProductCard from '@/components/common/ProductCard';
import ReviewCard from '@/components/common/ReviewCard';

interface ConcernDetailPageProps {
  params: Promise<{ slug: string }>;
}

interface ConcernHeroCopy {
  title: string;
  description: string;
}

const concernHeroCopy: Record<string, ConcernHeroCopy> = {
  tear: {
    title: '눈물 자국이 자꾸\n신경 쓰일 때',
    description:
      '눈가에 남는 자국은 식사와 환경, 눈 주변 상태처럼 여러 이유가 함께 영향을 줄 수 있어요. 평소와 달라진 점부터 하나씩 살펴봐요.',
  },
  joint: {
    title: '걷고 움직이는 모습이 예전과 다를 때',
    description:
      '걷는 속도나 계단 앞에서 머뭇거리는 모습처럼 작은 변화부터 기록해 보세요. 무리하지 않는 생활 관리 기준을 함께 살펴봐요.',
  },
  skin: {
    title: '자꾸 긁거나 피부가 붉어 보일 때',
    description:
      '긁는 횟수와 붉어진 부위, 최근 바뀐 식사나 환경을 함께 살펴보면 진료 상담에도 도움이 돼요.',
  },
  obesity: {
    title: '건강한 체중을 천천히 되찾고 싶을 때',
    description:
      '급하게 줄이기보다 먹는 양과 활동량을 천천히 기록하는 것부터 시작해요. 아이에게 맞는 속도로 관리 기준을 살펴봐요.',
  },
  picky: {
    title: '밥 앞에서 자꾸 망설일 때',
    description:
      '입맛의 문제로만 보기 전에 식사 환경과 간식, 구강 상태까지 차분히 살펴봐요.',
  },
  digestion: {
    title: '배변 리듬이 평소와 달라졌을 때',
    description:
      '배변은 식사와 환경 변화를 보여주는 생활 신호예요. 평소 리듬과 달라진 점부터 기록해 보세요.',
  },
  stress: {
    title: '불안하거나 예민한 모습이 잦아졌을 때',
    description:
      '환경과 생활 리듬이 달라지면 아이의 마음도 흔들릴 수 있어요. 편안해지는 조건부터 하나씩 찾아봐요.',
  },
  senior: {
    title: '나이에 맞는 돌봄이 필요해졌을 때',
    description:
      '나이가 들수록 필요한 돌봄의 속도도 달라져요. 움직임과 식사, 휴식의 변화를 세심하게 살펴봐요.',
  },
};

// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: ConcernDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const { items: concerns } = await getConcernsConfigWithFallback();
  const concern = concerns.find((item) => item.slug === slug);

  if (!concern) {
    return { title: '고민별 케어' };
  }

  const heroCopy = concernHeroCopy[concern.slug];

  return {
    title: `${concern.title} 케어`,
    description: heroCopy?.description ?? concern.shortDescription,
  };
}

export default async function ConcernDetailPage({ params }: ConcernDetailPageProps) {
  const { slug } = await params;
  const { items: concerns } = await getConcernsConfigWithFallback();
  const concern = concerns.find((item) => item.slug === slug);

  if (!concern) {
    notFound();
  }

  const heroCopy = concernHeroCopy[concern.slug] ?? {
    title: `${concern.title}, 어디서부터 살펴볼까요?`,
    description: concern.shortDescription,
  };

  const [allProducts, allBrands] = await Promise.all([listProducts(), listBrands()]);
  const recommendedProducts = allProducts.filter((product) =>
    concern.recommendedProductIds.includes(product.id),
  );
  const recommendedBrands = allBrands.filter((brand) =>
    concern.recommendedBrandIds.includes(brand.id),
  );
  const { items: showcaseReviews } = await getShowcaseReviewsConfigWithFallback();
  const relatedReviews = showcaseReviews.filter((review) =>
    review.isVisible !== false && concern.recommendedProductIds.includes(review.productId),
  );

  const concernHeroImages: Record<string, string> = {
    tear: '/images/care-hero-tear.webp',
  };
  const heroImage = concernHeroImages[concern.slug] || '/images/hero-curation-visual.png';

  return (
    <main className="flex flex-col bg-[#F8F6F0] min-h-screen pb-0">
      {/* 1. 상단 인트로 및 히어로 */}
      <div className="mx-auto w-full max-w-[1240px] px-5 md:px-7 lg:px-10 xl:px-12 pt-9 lg:pt-12 pb-7 lg:pb-9">
        <section className="flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-16 lg:h-[440px]">
          {/* 좌측 텍스트 (43%) */}
          <div className="w-full lg:w-[43%] flex flex-col items-start relative z-10 order-2 lg:order-1">
            <Link
              href="/concerns"
              className="inline-flex items-center gap-2 text-[14px] sm:text-[15px] font-medium text-[#72766F] transition-colors duration-300 hover:text-[#17251F] mb-6 sm:mb-8"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              케어 가이드로 돌아가기
            </Link>

            <div className="inline-flex h-[34px] sm:h-[36px] items-center gap-1.5 rounded-full border border-[#E4DDD1] bg-[#F2EEE5]/50 px-3.5 sm:px-4 text-[13px] sm:text-[14px] font-bold text-[#17251F]">
              <span aria-hidden="true" className="text-[16px] leading-none">{concern.icon}</span>
              {concern.title} CARE
            </div>

            <h1 className="mt-6 sm:mt-7 max-w-[520px] break-keep text-[32px] sm:text-[42px] lg:text-[54px] font-bold leading-[1.14] tracking-[-0.035em] text-[#17251F] whitespace-pre-line">
              {heroCopy.title}
            </h1>

            <p className="mt-5 sm:mt-6 max-w-[500px] break-keep text-[15px] sm:text-[16px] leading-[1.7] text-[#72766F]">
              {heroCopy.description}
            </p>
          </div>

          {/* 우측 이미지 (57%) */}
          <div className="w-full lg:w-[57%] h-[340px] sm:h-[390px] relative overflow-hidden rounded-[20px] lg:rounded-[24px] bg-[#E4DDD1]/30 order-1 lg:order-2">
            <Image
              src={heroImage}
              alt={`${concern.title} 케어 안내`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 57vw"
              className="object-cover"
              style={{ objectPosition: concern.slug === 'tear' ? 'center 30%' : 'center' }}
            />
          </div>
        </section>
      </div>

      {/* 2. 핵심 정보 요약 바 */}
      <div className="mx-auto w-full max-w-[1240px] px-5 md:px-7 lg:px-10 xl:px-12 mb-12 lg:mb-16">
        <div className="flex flex-col sm:flex-row sm:items-center overflow-hidden rounded-[18px] sm:rounded-[20px] border border-[#E4DDD1] bg-[#FFFEFB] sm:h-[100px] lg:h-[110px]">
          {/* 주요 원인 확인 */}
          <a href="#causes" className="group flex flex-1 items-center px-5 py-6 sm:px-4 lg:px-6 sm:py-0 hover:bg-[#F8F6F0] transition-colors border-b sm:border-b-0 sm:border-r border-[#E4DDD1] h-full gap-4 lg:gap-5">
            <div className="flex items-center justify-center w-11 h-11 lg:w-12 lg:h-12 rounded-[12px] bg-[#F8F6F0] text-[#17251F]">
              <Search className="size-[20px] lg:size-[22px]" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="flex items-center gap-1.5 text-[15px] lg:text-[16px] font-bold tracking-tight text-[#17251F]">
                <span className="font-editorial text-[#B68B4E] font-semibold text-[13px] lg:text-[14px]">01</span> 주요 원인 확인
              </span>
              <span className="mt-1 text-[13px] lg:text-[14px] text-[#72766F] break-keep leading-snug">식사·환경·생활 습관 등<br className="hidden lg:block" />주요 원인을 함께 살펴봅니다.</span>
            </div>
            <ChevronRight className="size-4 text-[#E4DDD1] group-hover:text-[#B68B4E] transition-colors" />
          </a>

          {/* 집에서 관리하기 */}
          <a href="#management" className="group flex flex-1 items-center px-5 py-6 sm:px-4 lg:px-6 sm:py-0 hover:bg-[#F8F6F0] transition-colors border-b sm:border-b-0 sm:border-r border-[#E4DDD1] h-full gap-4 lg:gap-5">
            <div className="flex items-center justify-center w-11 h-11 lg:w-12 lg:h-12 rounded-[12px] bg-[#F8F6F0] text-[#17251F]">
              <Home className="size-[20px] lg:size-[22px]" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="flex items-center gap-1.5 text-[15px] lg:text-[16px] font-bold tracking-tight text-[#17251F]">
                <span className="font-editorial text-[#B68B4E] font-semibold text-[13px] lg:text-[14px]">02</span> 집에서 관리하기
              </span>
              <span className="mt-1 text-[13px] lg:text-[14px] text-[#72766F] break-keep leading-snug">매일 실천할 수 있는<br className="hidden lg:block" />생활 관리 방법을 안내합니다.</span>
            </div>
            <ChevronRight className="size-4 text-[#E4DDD1] group-hover:text-[#B68B4E] transition-colors" />
          </a>

          {/* 병원 방문 기준 */}
          <a href="#hospital" className="group flex flex-1 items-center px-5 py-6 sm:px-4 lg:px-6 sm:py-0 hover:bg-[#F8F6F0] transition-colors h-full gap-4 lg:gap-5">
            <div className="flex items-center justify-center w-11 h-11 lg:w-12 lg:h-12 rounded-[12px] bg-[#F8F6F0] text-[#17251F]">
              <PlusSquare className="size-[20px] lg:size-[22px]" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col flex-1">
              <span className="flex items-center gap-1.5 text-[15px] lg:text-[16px] font-bold tracking-tight text-[#17251F]">
                <span className="font-editorial text-[#B68B4E] font-semibold text-[13px] lg:text-[14px]">03</span> 병원 방문 기준
              </span>
              <span className="mt-1 text-[13px] lg:text-[14px] text-[#72766F] break-keep leading-snug">진료가 필요한 신호와<br className="hidden lg:block" />병원 방문 기준을 정리했습니다.</span>
            </div>
            <ChevronRight className="size-4 text-[#E4DDD1] group-hover:text-[#B68B4E] transition-colors" />
          </a>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1240px] px-5 md:px-7 lg:px-10 xl:px-12 pb-16 space-y-14 lg:space-y-16">

        {/* 3. 증상 확인 + 병원 방문 기준 2단 통합 섹션 */}
        <section id="hospital" className="scroll-mt-32 flex flex-col lg:flex-row gap-5 lg:gap-6">
          {/* 왼쪽: 증상 확인 (52%) */}
          <div className="w-full lg:w-[52%] p-6 sm:p-8 lg:p-10 bg-[#FFFEFB] border border-[#E4DDD1] rounded-[20px] lg:rounded-[24px]">
            <h3 className="text-[18px] lg:text-[20px] font-bold tracking-tight text-[#17251F] mb-6">생활 속에서 보이는 신호</h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {concern.symptoms.map((symptom) => (
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
              병원은 하나의 정답지지 않아요
            </h3>
            <p className="mt-2.5 break-keep text-[13px] lg:text-[14px] leading-[1.65] text-[#72766F]">
              다음 중 하나 이상에 해당한다면 수의사와 상담해보세요.<br className="hidden lg:block"/>
              정확한 진단을 통해 적절한 케어를 시작할 수 있어요.
            </p>
            <ol className="mt-7 space-y-3 lg:space-y-3.5">
              {concern.causes.map((cause) => (
                <li key={cause} className="flex items-start gap-2.5">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[#B68B4E]" />
                  <span className="break-keep text-[14px] font-medium leading-[1.6] text-[#17251F]">{cause}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4. 함께 살펴볼 브랜드 */}
        <section id="brands" className="scroll-mt-32">
          <div className="flex items-end justify-between mb-6 lg:mb-8">
            <h2 className="text-[20px] lg:text-[24px] font-bold text-[#17251F] tracking-tight">이 고민과 함께 살펴볼 브랜드</h2>
            <Link href="/brands" className="text-[13px] lg:text-[14px] font-semibold text-[#17251F] flex items-center gap-1 hover:text-[#B68B4E] transition-colors">
              모든 브랜드 보기 <ChevronRight className="size-4" />
            </Link>
          </div>

          {recommendedBrands.length > 0 ? (
            <div className="horizontal-snap-rail pb-4">
              {recommendedBrands.map((brand) => {
                const relatedProductsCount = allProducts.filter(p => p.brandId === brand.id).length;
                return (
                  <Link
                    key={brand.id}
                    href={`/brands/${brand.id}`}
                    className="horizontal-snap-item group flex min-h-[210px] flex-col justify-between rounded-[16px] border border-[#E4DDD1] bg-[#FFFEFB] p-6 transition-transform duration-300 hover:-translate-y-[2px] lg:min-h-[240px] lg:rounded-[18px] lg:basis-[calc(25%-0.75rem)]"
                  >
                    <div>
                      <div className="h-[44px] flex items-center mb-5">
                        <BrandLogo brand={brand} size="md" surface={false} />
                      </div>
                      <h3 className="break-keep text-[16px] lg:text-[17px] font-bold tracking-tight text-[#17251F]">
                        {brand.name} <span className="font-editorial font-normal text-[14px] text-[#72766F]">({brand.name.replace(/[^a-zA-Z\s()]/g, '').trim() || brand.id})</span>
                      </h3>
                      <p className="mt-2 break-keep text-[13px] leading-[1.6] text-[#72766F]">
                        {brand.description}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#17251F]">
                      {relatedProductsCount > 0 ? `관련 상품 ${relatedProductsCount}개` : '브랜드 이야기 보기'}
                      <ChevronRight className="size-4 text-[#B68B4E]" />
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              compact
              title="함께 소개할 브랜드를 살펴보고 있어요"
              description="브랜드 자료를 차분히 확인한 뒤 이곳에서 소개할게요."
              actionLabel="브랜드 모두 보기"
              actionHref="/brands"
            />
          )}
        </section>

        {/* 5. 관련 상품 */}
        <section id="products" className="scroll-mt-32">
          <div className="flex items-end justify-between mb-6 lg:mb-8">
            <h2 className="text-[20px] lg:text-[24px] font-bold text-[#17251F] tracking-tight">일상 관리에 함께 볼 상품</h2>
            <Link href={`/shop?concern=${concern.slug}`} className="text-[13px] lg:text-[14px] font-semibold text-[#17251F] flex items-center gap-1 hover:text-[#B68B4E] transition-colors">
              전체 상품 보기 <ChevronRight className="size-4" />
            </Link>
          </div>

          {recommendedProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5 xl:gap-6">
              {recommendedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <EmptyState
              compact
              title="함께 소개할 상품을 고르고 있어요"
              description="생활 관리에 참고할 상품을 차분히 살펴본 뒤 소개할게요."
              actionLabel="전체 셀렉션 보기"
              actionHref="/shop"
            />
          )}
        </section>

        {/* 6. 펫보험 안내 (배너형) */}
        <section id="insurance" className="scroll-mt-32">
          <div className="w-full rounded-[20px] lg:rounded-[24px] bg-[#16382D] px-6 py-8 sm:px-10 lg:px-10 lg:py-10 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden h-auto md:h-[220px] lg:h-[240px]">
            {/* 좌측 콘텐츠 (55%) */}
            <div className="relative z-10 md:w-[55%] flex flex-col">
              <span className="text-[12px] font-medium tracking-wide text-[#B68B4E] mb-2 opacity-90">
                사랑하는 아이를 위한 든든한 준비
              </span>
              <h2 className="break-keep text-[22px] sm:text-[24px] lg:text-[26px] font-bold leading-[1.3] tracking-tight text-[#FFFEFB]">
                가입한 보험, 이 고민도 보장될까요?
              </h2>
              <p className="mt-3 break-keep text-[14px] lg:text-[15px] leading-[1.65] text-[#FFFEFB]/80">
                질병·사고 보장 범위부터 보장한도, 면책기간까지<br className="hidden lg:block"/>
                반려동물 보험을 한눈에 비교해 보세요.
              </p>
            </div>
            {/* 중앙 CTA (20%) */}
            <div className="relative z-10 w-full md:w-[20%] flex justify-start md:justify-center">
              <Link
                href="/insurance/recommend"
                className="inline-flex h-[44px] lg:h-[48px] items-center justify-center rounded-[12px] bg-[#FFFEFB] px-5 text-[14px] font-bold text-[#16382D] transition-colors hover:bg-[#F2EEE5]"
              >
                보험 보장 범위 분석하기 <ChevronRight className="ml-1 size-4" />
              </Link>
            </div>
            {/* 우측 이미지 (25%) */}
            <div className="hidden md:block relative z-10 w-[25%] h-full">
              <div className="absolute right-0 bottom-[-40px] w-[200px] h-[240px]">
                <Image
                  src="/images/insurance-dog.webp"
                  alt="펫보험 분석"
                  fill
                  className="object-contain object-right-bottom"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 7. 반려가족 후기 */}
        <section id="reviews" className="scroll-mt-32">
          <div className="flex items-end justify-between mb-6 lg:mb-8">
            <h2 className="text-[20px] lg:text-[24px] font-bold text-[#17251F] tracking-tight">함께 읽어볼 반려가족 이야기</h2>
            <Link href="/reviews" className="text-[13px] lg:text-[14px] font-semibold text-[#17251F] flex items-center gap-1 hover:text-[#B68B4E] transition-colors">
              전체 이야기 보기 <ChevronRight className="size-4" />
            </Link>
          </div>

          {relatedReviews.length > 0 ? (
            <div className="horizontal-snap-rail pb-4">
              {relatedReviews.map((review) => {
                const product = allProducts.find((item) => item.id === review.productId);
                return (
                  <div key={review.id} className="horizontal-snap-item md:basis-[calc(50%-0.5rem)]">
                    <ReviewCard review={review} productName={product?.name} />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              compact
              title="함께 읽을 이야기가 아직 없어요"
              description="다른 반려가족의 이야기가 도착하면 이곳에서 소개할게요."
              actionLabel="전체 이야기 보기"
              actionHref="/reviews"
            />
          )}
        </section>

        {/* 8. FAQ + 1:1 문의 */}
        <section id="faq" className="scroll-mt-32">
          <div className="flex flex-col lg:flex-row bg-[#FFFEFB] border border-[#E4DDD1] rounded-[18px] lg:rounded-[20px] overflow-hidden">
            {/* 왼쪽 FAQ (72%) */}
            <div className="w-full lg:w-[72%] p-6 sm:p-8 lg:p-9 border-b lg:border-b-0 lg:border-r border-[#E4DDD1]">
              <h2 className="text-[18px] lg:text-[20px] font-bold text-[#17251F] tracking-tight mb-6">많이 궁금해하시는 점</h2>
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
            {/* 오른쪽 문의 (28%) */}
            <div className="w-full lg:w-[28%] p-6 sm:p-8 lg:p-9 flex flex-col items-center justify-center text-center bg-[#FFFEFB]">
              <div className="w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] mb-4 text-[#E4DDD1]">
                {/* 시안의 라인 일러스트 느낌의 아이콘을 대체 */}
                <MessageCircleQuestion className="w-full h-full text-[#B68B4E]/20" strokeWidth={1} />
              </div>
              <p className="text-[14px] lg:text-[15px] font-medium text-[#72766F] mb-4">
                더 궁금한 점이 있으신가요?
              </p>
              <Link href="/qna" className="inline-flex items-center gap-1 text-[14px] lg:text-[15px] font-bold text-[#17251F] hover:text-[#B68B4E] transition-colors">
                1:1 문의하기 <ChevronRight className="size-[18px]" />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
