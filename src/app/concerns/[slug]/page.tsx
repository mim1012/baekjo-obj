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
import { FEATURES } from '@/config/features';

interface ConcernDetailPageProps {
  params: Promise<{ slug: string }>;
}

interface ConcernHeroCopy {
  title: string;
  description: string;
}

interface ConcernHeroVisual {
  src: string;
  objectPosition: string;
}

interface ConcernQuickGuideItem {
  title: string;
  description: string;
  href: string;
  icon: 'search' | 'home' | 'hospital';
}

const concernHeroCopy: Record<string, ConcernHeroCopy> = {
  tear: {
    title: '눈물 자국, 닦아주는 것만으로 충분할까요?',
    description: '매일 닦아도 반복된다면, 관리 방법부터 다시 살펴볼 필요가 있어요.',
  },
  joint: {
    title: '걸음걸이가 예전과 달라졌나요?',
    description: '걷거나 움직이는 모습이 평소와 다르다면 관절 상태를 살펴볼 필요가 있어요.',
  },
  skin: {
    title: '자꾸 긁는 우리 아이,\n피부부터 살펴보세요',
    description:
      '우리 아이가 보내는 작은 신호부터 살펴보세요. 일상에서 알아두면 좋은 케어 기준을 정리했습니다.',
  },
  obesity: {
    title: '우리 아이의 체중,\n괜찮은 걸까요?',
    description: '먹는 양과 활동량, 최근 체중의 변화를 함께 살펴보세요.',
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
    title: '평소와 다른 행동이 자주 보이나요?',
    description: '행동이나 생활 패턴이 달라졌다면 최근 바뀐 환경이나 일상은 없는지 살펴보세요.',
  },
  senior: {
    title: '나이에 맞는 돌봄이 필요해졌을 때',
    description:
      '나이가 들수록 필요한 돌봄의 속도도 달라져요. 움직임과 식사, 휴식의 변화를 세심하게 살펴봐요.',
  },
  oral: {
    title: '구강, 어디서부터 살펴볼까요?',
    description: '입 냄새나 치석이 신경 쓰인다면 구강 상태부터 살펴보세요.',
  },
};

const concernHeroVisuals: Record<string, ConcernHeroVisual> = {
  tear: { src: '/images/care-detail-hero-tear.png', objectPosition: '50% center' },
  joint: { src: '/images/care-detail-hero-joint.png', objectPosition: '47% center' },
  skin: { src: '/images/care-detail-hero-skin.png', objectPosition: '46% center' },
  obesity: { src: '/images/care-detail-hero-obesity.png', objectPosition: '45% center' },
  stress: { src: '/images/care-detail-hero-stress.png', objectPosition: '50% center' },
  oral: { src: '/images/care-detail-hero-oral.png', objectPosition: '48% center' },
};

const tearHospitalSigns = [
  '눈이 심하게 붉어지거나 부어오름',
  '노란색·녹색 눈곱이 계속 생김',
  '눈을 잘 뜨지 못하거나 계속 찡그림',
  '눈을 반복해서 심하게 비비거나 긁음',
  '눈이 평소보다 뿌옇게 보임',
  '눈 또는 눈꺼풀에 상처가 보임',
];

const tearSymptoms = [
  '눈 밑의 갈색·적갈색 자국이 짙어짐',
  '평소보다 눈물 양이 많아짐',
  '눈 주위 털이 계속 축축하게 젖어 있음',
  '노란 눈곱이 생기거나 눈곱 양이 많아짐',
  '눈을 평소보다 자주 비비거나 긁음',
  '한쪽 눈의 눈물만 유독 많아짐',
];

const skinHospitalSigns = [
  '긁거나 핥는 행동이 계속되거나 심해짐',
  '붉어짐이나 피부 변화가 넓어지거나 오래 지속됨',
  '상처·진물·출혈이 생김',
  '털이 빠지는 범위가 넓어지거나 피부가 드러남',
  '피부 변화와 함께 식욕이나 활동량이 평소와 달라짐',
];

const concernHospitalSigns: Record<string, string[]> = {
  joint: [
    '절뚝거림이 계속되거나 점점 심해짐',
    '한쪽 다리를 들고 있거나 바닥에 제대로 딛지 못함',
    '관절이나 다리 주변이 눈에 띄게 붓거나 뜨거움',
    '움직일 때 갑자기 울부짖거나 움직이려 하지 않음',
    '넘어지거나 부딪힌 뒤 걷는 모습이 평소와 달라짐',
  ],
  obesity: [
    '체중이 짧은 기간에 급격하게 변함',
    '식욕이 갑자기 크게 늘거나 줄어듦',
    '물을 마시거나 소변을 보는 양이 눈에 띄게 달라짐',
    '배가 갑자기 불러오거나 팽팽해짐',
    '걷거나 움직이는 것을 힘들어하거나 호흡이 불편해 보임',
  ],
  oral: [
    '잇몸이 붓거나 피가 남',
    '음식을 먹기 어려워하거나 자꾸 떨어뜨림',
    '치아가 흔들리거나 빠짐',
    '입이나 얼굴 주변이 부어오름',
    '심한 입 냄새가 지속됨',
  ],
  stress: [
    '먹지 않거나 식욕 저하가 계속됨',
    '구토·설사 등 신체 증상이 함께 나타남',
    '몸을 반복해서 핥아 피부나 털에 손상이 생김',
    '평소와 다른 행동 변화가 갑자기 나타나거나 계속됨',
    '불안하거나 두려워하는 행동으로 일상생활이 어려워 보임',
  ],
};

const defaultQuickGuideItems: ConcernQuickGuideItem[] = [
  {
    title: '변화 살펴보기',
    description: '평소 생활에서 확인할 수 있는 몸과 행동의 변화',
    href: '#signals',
    icon: 'search',
  },
  {
    title: '관리 기준 알아보기',
    description: '일상에서 참고할 수 있는 관리 방법과 알아둘 내용',
    href: '#faq',
    icon: 'home',
  },
  {
    title: '병원 방문 판단하기',
    description: '병원 진료를 고려해야 할 신호와 기준',
    href: '#hospital',
    icon: 'hospital',
  },
];

const concernQuickGuideItems: Record<string, ConcernQuickGuideItem[]> = {
  obesity: [
    {
      title: '원인 살펴보기',
      description: '식사량·활동량·생활 습관 등 체중 증가에 영향을 줄 수 있는 원인',
      href: '#signals',
      icon: 'search',
    },
    {
      title: '집에서 관리하기',
      description: '식사와 활동량 등 일상에서 챙겨야 할 체중 관리 방법',
      href: '#faq',
      icon: 'home',
    },
    {
      title: '병원 방문 판단하기',
      description: '체중 변화와 몸 상태로 구분하는 진료가 필요한 신호',
      href: '#hospital',
      icon: 'hospital',
    },
  ],
  oral: [
    {
      title: '원인 살펴보기',
      description: '치아·잇몸 상태와 구강 위생 등 구강 문제에 영향을 줄 수 있는 원인',
      href: '#signals',
      icon: 'search',
    },
    {
      title: '집에서 관리하기',
      description: '양치와 구강 청결 등 일상에서 챙겨야 할 관리 방법',
      href: '#faq',
      icon: 'home',
    },
    {
      title: '병원 방문 판단하기',
      description: '입 냄새·잇몸 상태·먹는 행동 등으로 구분하는 진료가 필요한 신호',
      href: '#hospital',
      icon: 'hospital',
    },
  ],
  skin: [
    {
      title: '원인 살펴보기',
      description: '식사·환경·피부 상태 등 피부 변화에 영향을 줄 수 있는 원인',
      href: '#signals',
      icon: 'search',
    },
    {
      title: '집에서 관리하기',
      description: '피부 청결과 식사·환경 등 일상에서 챙겨야 할 관리 방법',
      href: '#faq',
      icon: 'home',
    },
    {
      title: '병원 방문 판단하기',
      description: '피부 상태와 행동으로 구분하는 진료가 필요한 신호',
      href: '#hospital',
      icon: 'hospital',
    },
  ],
  joint: [
    {
      title: '원인 살펴보기',
      description: '체중·활동량·생활 환경 등 관절에 부담을 줄 수 있는 요인',
      href: '#signals',
      icon: 'search',
    },
    {
      title: '집에서 관리하기',
      description: '체중 관리와 적절한 활동 등 일상에서 챙겨야 할 관리 방법',
      href: '#faq',
      icon: 'home',
    },
    {
      title: '병원 방문 판단하기',
      description: '걸음걸이와 움직임의 변화로 구분하는 진료가 필요한 신호',
      href: '#hospital',
      icon: 'hospital',
    },
  ],
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

  const allProducts = await listCachedPublicProducts();
  const recommendedProducts = concern.recommendedProductIds.flatMap((productId) => {
    const product = allProducts.find((item) => item.id === productId);
    return product ? [product] : [];
  });
  const { items: showcaseReviews } = await getShowcaseReviewsConfigWithFallback();
  const relatedReviews = showcaseReviews.filter((review) =>
    review.isVisible !== false && concern.recommendedProductIds.includes(review.productId),
  );

  const heroVisual = concernHeroVisuals[concern.slug] ?? {
    src: '/images/hero-curation-visual.png',
    objectPosition: 'center',
  };
  const hospitalSigns = concern.slug === 'tear'
    ? tearHospitalSigns
    : concern.slug === 'skin'
      ? skinHospitalSigns
      : concernHospitalSigns[concern.slug] ?? concern.causes;
  const symptoms = concern.slug === 'tear' ? tearSymptoms : concern.symptoms;
  const quickGuideItems = concernQuickGuideItems[concern.slug] ?? defaultQuickGuideItems;

  return (
    <main className="flex flex-col bg-[#F8F6F0] min-h-screen pb-0">
      {/* 1. 상단 인트로 및 히어로 — 홈과 같은 전체 배경형 구조 */}
      <section data-testid="concern-detail-hero" className="relative h-[640px] w-full overflow-hidden bg-[#EDE5D8] sm:h-[620px] md:h-[480px] lg:h-[520px] xl:h-[560px]">
        <Image
          src={heroVisual.src}
          alt={`${concern.title} 케어 안내`}
          fill
          priority
          sizes="100vw"
          quality={90}
          data-testid="concern-detail-hero-image"
          className="object-cover"
          style={{ objectPosition: heroVisual.objectPosition }}
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
              케어 가이드로 돌아가기
            </Link>

            <div className="inline-flex h-[34px] items-center gap-1.5 rounded-full border border-white/80 bg-white/82 px-3.5 text-[13px] font-bold text-[#17251F] shadow-sm backdrop-blur-sm sm:h-[36px] sm:px-4 sm:text-[14px]">
              <span aria-hidden="true" className="text-[16px] leading-none">{concern.icon}</span>
              {concern.title} 케어
            </div>

            <h1 className="mt-6 max-w-[540px] whitespace-pre-line break-keep text-[32px] font-bold leading-[1.14] tracking-[-0.035em] text-[#17251F] sm:mt-7 sm:text-[42px] lg:text-[52px]">
              {heroCopy.title}
            </h1>

            <p className="mt-5 max-w-[500px] break-keep text-[15px] leading-[1.7] text-[#59615B] sm:mt-6 sm:text-[16px]">
              {heroCopy.description}
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
            <h3 className="text-[18px] lg:text-[20px] font-bold tracking-tight text-[#17251F] mb-6">생활 속에서 보이는 신호</h3>
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
              병원 진료를 고려해야 할 신호
            </h3>
            <p className="mt-2.5 break-keep text-[13px] lg:text-[14px] leading-[1.65] text-[#72766F]">
              아래 증상이 보인다면 집에서 관리하기보다 수의사와 상담해보세요.
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
            <h2 className="text-[20px] lg:text-[24px] font-bold text-[#17251F] tracking-tight">일상 관리에 함께 볼 상품</h2>
            <Link href={`/shop?concern=${concern.slug}`} className="flex min-h-11 items-center gap-1 text-[13px] font-semibold text-[#17251F] transition-colors hover:text-[#B68B4E] sm:min-h-0 lg:text-[14px]">
              {concern.title} 관련 상품 보기 <ChevronRight className="size-4" />
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
                관련 상품을 준비하고 있습니다.
              </p>
            </div>
          )}
        </section>

        {/* 5. 펫보험 안내 (배너형) */}
        {FEATURES.insurance && (
        <section id="insurance" className="scroll-mt-32">
          <div className="w-full rounded-[20px] lg:rounded-[24px] bg-[#16382D] px-6 py-8 sm:px-10 lg:px-10 lg:py-10 flex flex-col md:flex-row md:items-center justify-between gap-8 relative overflow-hidden h-auto md:h-[220px] lg:h-[240px]">
            {/* 좌측 콘텐츠 (55%) */}
            <div className="relative z-10 md:w-[55%] flex flex-col">
              <h2 className="break-keep text-[22px] sm:text-[24px] lg:text-[26px] font-bold leading-[1.3] tracking-tight text-[#FFFEFB]">
                우리 아이에게 필요한 보장은 무엇일까요?
              </h2>
              <p className="mt-3 break-keep text-[14px] lg:text-[15px] leading-[1.65] text-[#FFFEFB]/80">
                나이와 건강 상태를 바탕으로 우리 아이에게 맞는 보험을 살펴보세요.
              </p>
            </div>
            {/* 중앙 CTA (20%) */}
            <div className="relative z-10 w-full md:w-[20%] flex justify-start md:justify-center">
              <Link
                href="/insurance"
                className="inline-flex h-[44px] lg:h-[48px] items-center justify-center rounded-[12px] bg-[#FFFEFB] px-5 text-[14px] font-bold text-[#16382D] transition-colors hover:bg-[#F2EEE5]"
              >
                보험 분석하기 <ChevronRight className="ml-1 size-4" />
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
        )}

        {/* 6. 반려가족 후기 */}
        {relatedReviews.length > 0 && (
        <section id="reviews" className="scroll-mt-32">
          <div className="mb-6 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between lg:mb-8">
            <h2 className="text-[20px] lg:text-[24px] font-bold text-[#17251F] tracking-tight">보호자 후기</h2>
            <Link href="/reviews" className="flex min-h-11 items-center gap-1 text-[13px] font-semibold text-[#17251F] transition-colors hover:text-[#B68B4E] sm:min-h-0 lg:text-[14px]">
              후기 전체 보기 <ChevronRight className="size-4" />
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
          </div>
        </section>

      </div>
    </main>
  );
}
