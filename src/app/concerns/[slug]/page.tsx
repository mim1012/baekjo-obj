import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Info,
  ShieldCheck,
  Droplet,
  Bone,
  PawPrint,
  Scale,
  Utensils,
  Activity,
  HeartPulse,
  ShieldPlus,
  Circle
} from 'lucide-react';
import { getConcernsConfigWithFallback } from '@/lib/concerns/repo';
import { listProducts } from '@/lib/products/repo';
import { reviews } from '@/data/reviews';
import ProductCard from '@/components/common/ProductCard';
import ReviewCard from '@/components/common/ReviewCard';
import CareDetailNav from './components/CareDetailNav';

interface ConcernDetailPageProps {
  params: Promise<{ slug: string }>;
}

interface ConcernHeroCopy {
  title: string;
  description: string;
}

const concernHeroCopy: Record<string, ConcernHeroCopy> = {
  tear: {
    title: '눈물 자국이 자꾸 신경 쓰일 때',
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

const concernIconMap = {
  tear: Droplet,
  joint: Bone,
  skin: PawPrint,
  obesity: Scale,
  picky: Utensils,
  digestion: Activity,
  stress: HeartPulse,
  senior: ShieldPlus,
} as const;

const detailSections = [
  { id: 'info', label: '살펴볼 신호' },
  { id: 'products', label: '생활 관리 상품' },
  { id: 'insurance', label: '보험 보장' },
  { id: 'reviews', label: '반려가족 이야기' },
  { id: 'faq', label: '궁금한 점' },
] as const;

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

  const Icon = concernIconMap[concern.slug as keyof typeof concernIconMap] ?? Circle;
  
  const heroCopy = concernHeroCopy[concern.slug] ?? {
    title: `${concern.title}, 어디서부터 살펴볼까요?`,
    description: concern.shortDescription,
  };

  const allProducts = await listProducts();
  const recommendedProducts = allProducts.filter((product) =>
    concern.recommendedProductIds.includes(product.id),
  );
  const relatedReviews = reviews.filter((review) =>
    concern.recommendedProductIds.includes(review.productId),
  );

  return (
    <main className="care-detail-page">
      <section className="care-detail-hero">
        <div className="care-detail-container">
          <Link
            href="/concerns"
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#68716C] transition-colors duration-300 hover:text-[#18231F]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            고민별 케어로 돌아가기
          </Link>

          <div className="mt-8 flex flex-col items-start gap-4 md:mt-10">
            <span className="font-editorial text-[13px] font-bold italic tracking-widest text-[#B99562]">CARE GUIDE · {concern.title}</span>
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-6">
              <div
                aria-hidden="true"
                className="flex size-[48px] shrink-0 items-center justify-center rounded-[14px] bg-[#F2EEE5] text-[#18231F]"
              >
                <Icon className="size-[24px]" strokeWidth={1.6} />
              </div>
              <div className="flex flex-col">
                <h1 className="max-w-[800px] break-keep text-[31px] font-bold leading-[1.25] tracking-tight text-[#18231F] md:text-[44px]">
                  {heroCopy.title}
                </h1>
                <p className="mt-4 max-w-[720px] break-keep text-[15px] leading-[1.7] text-[#68716C] md:text-[16px]">
                  {heroCopy.description}
                </p>
                <div
                  role="note"
                  className="mt-[26px] flex w-fit items-start gap-3 rounded-[14px] border border-[#DED8CC] bg-[#FFFDF9] p-4 md:p-[20px]"
                >
                  <Info className="mt-0.5 size-[18px] shrink-0 text-[#B99562]" aria-hidden="true" />
                  <p className="break-keep text-[14px] leading-[1.65] text-[#68716C] md:text-[15px]">
                    아래 내용은 일상에서 참고할 일반 정보예요. 증상이 갑자기 심해졌거나 오래 이어진다면
                    제품을 고르기 전에 동물병원에서 먼저 확인해 주세요.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CareDetailNav sections={detailSections} />

      <section id="info" className="care-detail-section">
        <div className="care-detail-container">
          <span className="mb-3 block font-editorial text-[13px] font-semibold italic tracking-widest text-[#B99562]">CARE SIGNALS</span>
          <h2 className="break-keep text-[25px] font-bold leading-[1.3] tracking-tight text-[#18231F] md:text-[32px]">이런 변화가 함께 보이나요?</h2>
          <p className="mt-4 max-w-[700px] break-keep text-[15px] leading-[1.7] text-[#68716C] md:text-[16px]">
            하나만 보여도 바로 문제가 있다는 뜻은 아니에요. 평소와 다른 점이 이어지는지 천천히 살펴봐 주세요.
          </p>

          <div className="care-insight-layout mt-[24px] flex flex-col gap-7 md:mt-[36px] md:gap-8">
            <div className="care-signal-panel rounded-[16px] border border-[#DED8CC] bg-[#FFFDF9] p-6 md:p-7">
              <h3 className="break-keep text-[18px] font-bold tracking-tight text-[#18231F]">생활 속에서 보이는 신호</h3>
              <ul className="mt-6 grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:gap-3">
                {concern.symptoms.map((symptom) => (
                  <li
                    key={symptom}
                    className="flex items-start gap-3 rounded-[12px] bg-[#F8F6F0] p-4 md:p-4"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-[#B99562]" aria-hidden="true" />
                    <span className="break-keep text-[14px] font-medium leading-[1.6] text-[#18231F]">{symptom}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="care-cause-panel rounded-[16px] border border-[#DED8CC] bg-[#FFFDF9] p-6 md:p-7">
              <h3 className="break-keep text-[18px] font-bold tracking-tight text-[#18231F]">
                원인은 하나로 정해지지 않아요
              </h3>
              <p className="mt-3 break-keep text-[14px] leading-[1.6] text-[#68716C]">
                아래 항목은 가능성을 살펴보는 참고 목록이에요. 정확한 원인은 진료를 통해 확인해 주세요.
              </p>
              <ol className="mt-6 flex flex-col">
                {concern.causes.map((cause, index) => (
                  <li key={cause} className="flex items-start gap-4 border-b border-[#DED8CC] py-3.5 last:border-0">
                    <span className="shrink-0 font-editorial text-[13px] font-semibold text-[#B99562]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="break-keep text-[14px] font-medium leading-[1.6] text-[#18231F]">{cause}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="care-detail-section bg-[#F2EEE5]/30">
        <div className="care-detail-container">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="mb-3 block font-editorial text-[13px] font-semibold italic tracking-widest text-[#B99562]">DAILY SELECTION</span>
              <h2 className="break-keep text-[25px] font-bold leading-[1.3] tracking-tight text-[#18231F] md:text-[32px]">일상 관리에 함께 볼 상품</h2>
              <p className="mt-4 max-w-[700px] break-keep text-[15px] leading-[1.7] text-[#68716C] md:text-[16px]">
                치료를 대신하는 상품이 아니라, 매일의 관리에서 참고할 수 있는 선택지를 모았어요.
              </p>
            </div>
            <Link
              href={`/shop?concern=${concern.slug}`}
              className="flex h-[42px] shrink-0 items-center justify-center gap-1.5 rounded-full border border-[#DED8CC] bg-transparent px-5 text-[14px] font-semibold text-[#18231F] transition-colors duration-300 hover:border-[#B99562] hover:bg-[#F2EEE5] md:h-[48px]"
            >
              셀렉션 더 보기
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          {recommendedProducts.length > 0 ? (
            <div className="related-product-grid mt-[24px] md:mt-[36px]">
              {recommendedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="related-product-empty">
              <p className="text-[16px] font-bold text-[#18231F]">관련 상품을 준비하고 있어요</p>
              <p className="mt-2 text-[14px] text-[#68716C]">선별이 완료되면 이곳에서 확인할 수 있어요.</p>
              <Link
                href={`/shop?concern=${concern.slug}`}
                className="mt-5 inline-flex h-[42px] items-center justify-center gap-1.5 rounded-full bg-[#18231F] px-5 text-[14px] font-semibold text-[#FFFDF9] transition-colors duration-300 hover:bg-[#2F3B34]"
              >
                전체 셀렉션 보기
              </Link>
            </div>
          )}
        </div>
      </section>

      <section
        id="insurance"
        className="care-detail-section bg-[#14211C] text-[#FFFDF9]"
      >
        <div className="care-detail-container relative z-10 grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="lg:col-span-8">
            <span className="mb-3 block font-editorial text-[13px] font-semibold italic tracking-widest text-[#B99562]">COVERAGE CHECK</span>
            <h2 className="max-w-3xl break-keep text-[25px] font-bold leading-[1.3] tracking-tight md:text-[32px]">
              가입한 보험, 이 고민도 보장될까요?
            </h2>
            <p className="mt-4 max-w-2xl break-keep text-[15px] leading-[1.7] text-[#FFFDF9]/80 md:text-[16px]">
              {concern.title} 관련 진료가 어디까지 보장되는지 약관부터 차분히 살펴보세요. 아직 보험이
              없어도 필요한 보장 기준을 먼저 정리할 수 있어요.
            </p>
            <p className="mt-3 break-keep text-[13px] leading-[1.6] text-[#FFFDF9]/60">
              실제 보장 여부와 보험금은 가입한 상품의 약관과 보험사 심사에 따라 달라질 수 있어요.
            </p>
          </div>
          <div className="lg:col-span-4 lg:flex lg:justify-end">
            <Link
              href="/insurance/apply"
              className="flex h-[42px] items-center justify-center gap-1.5 rounded-full border border-[#FFFDF9] bg-[#FFFDF9] px-6 text-[14px] font-semibold text-[#14211C] transition-colors duration-300 hover:bg-[#F2EEE5] md:h-[48px]"
            >
              보험 보장 살펴보기
              <ShieldCheck className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section id="reviews" className="care-detail-section bg-[#F2EEE5]/30">
        <div className="care-detail-container">
          <span className="mb-3 block font-editorial text-[13px] font-semibold italic tracking-widest text-[#B99562]">FAMILY STORIES</span>
          <h2 className="break-keep text-[25px] font-bold leading-[1.3] tracking-tight text-[#18231F] md:text-[32px]">함께 읽어볼 반려가족 이야기</h2>
          <p className="mt-4 max-w-[700px] break-keep text-[15px] leading-[1.7] text-[#68716C] md:text-[16px]">
            먼저 사용해 본 반려가족의 경험을 참고해 보세요. 아이마다 생활 환경과 느끼는 차이가 있을 수 있어요.
          </p>

          {relatedReviews.length > 0 ? (
            <div className="mt-[24px] grid gap-4 sm:grid-cols-2 md:mt-[36px] lg:gap-5">
              {relatedReviews.slice(0, 4).map((review) => {
                const product = allProducts.find((item) => item.id === review.productId);
                return <ReviewCard key={review.id} review={review} productName={product?.name} />;
              })}
            </div>
          ) : (
            <div className="related-product-empty">
              <p className="text-[16px] font-bold text-[#18231F]">함께 읽을 이야기가 아직 없어요</p>
              <p className="mt-2 text-[14px] text-[#68716C]">다른 반려가족의 이야기가 도착하면 이곳에서 소개할게요.</p>
              <Link
                href="/reviews"
                className="mt-5 inline-flex h-[42px] items-center justify-center gap-1.5 rounded-full bg-[#18231F] px-5 text-[14px] font-semibold text-[#FFFDF9] transition-colors duration-300 hover:bg-[#2F3B34]"
              >
                전체 이야기 보기
              </Link>
            </div>
          )}
        </div>
      </section>

      <section id="faq" className="care-detail-section mb-[72px]">
        <div className="care-detail-container">
          <span className="mb-3 block font-editorial text-[13px] font-semibold italic tracking-widest text-[#B99562]">QUESTIONS</span>
          <h2 className="break-keep text-[25px] font-bold leading-[1.3] tracking-tight text-[#18231F] md:text-[32px]">많이 궁금해하시는 점</h2>
          <p className="mt-4 max-w-[700px] break-keep text-[15px] leading-[1.7] text-[#68716C] md:text-[16px]">
            생활 속에서 자주 떠오르는 질문을 모았어요. 아이의 상태에 따라 답은 달라질 수 있으니 참고용으로 살펴봐 주세요.
          </p>

          <div className="mt-[24px] space-y-3 md:mt-[36px] md:space-y-4">
            {concern.faq.map((item) => (
              <details
                key={item.question}
                className="group rounded-[16px] border border-[#DED8CC] bg-[#FFFDF9] p-5 transition-colors duration-300 open:bg-[#F2EEE5]/30 md:p-6"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-5 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start gap-3 break-keep text-[15px] font-bold leading-[1.6] text-[#18231F] md:text-[16px]">
                    <span className="font-editorial text-[#B99562]">Q.</span>
                    {item.question}
                  </span>
                  <ChevronDown
                    className="mt-0.5 size-5 shrink-0 text-[#68716C] transition-transform duration-300 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="ml-8 mt-4 max-w-4xl break-keep text-[14px] leading-[1.7] text-[#68716C] md:text-[15px]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
