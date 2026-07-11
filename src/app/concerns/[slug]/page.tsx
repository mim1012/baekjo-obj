import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Info, ShieldCheck } from 'lucide-react';
import { concerns } from '@/data/concerns';
import { products } from '@/data/products';
import { brands } from '@/data/brands';
import { reviews } from '@/data/reviews';
import BrandLogo from '@/components/common/BrandLogo';
import EmptyState from '@/components/common/EmptyState';
import { PageIntro, SectionHeading } from '@/components/common/EditorialHeading';
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

const detailSections = [
  { id: 'info', label: '살펴볼 신호' },
  { id: 'brands', label: '함께 볼 브랜드' },
  { id: 'products', label: '생활 관리 상품' },
  { id: 'insurance', label: '보험 보장' },
  { id: 'reviews', label: '반려가족 이야기' },
  { id: 'faq', label: '궁금한 점' },
] as const;

export function generateStaticParams() {
  return concerns.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ConcernDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
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
  const concern = concerns.find((item) => item.slug === slug);

  if (!concern) {
    notFound();
  }

  const heroCopy = concernHeroCopy[concern.slug] ?? {
    title: `${concern.title}, 어디서부터 살펴볼까요?`,
    description: concern.shortDescription,
  };
  const recommendedProducts = products.filter((product) =>
    concern.recommendedProductIds.includes(product.id),
  );
  const recommendedBrands = brands.filter((brand) =>
    concern.recommendedBrandIds.includes(brand.id),
  );
  const relatedReviews = reviews.filter((review) =>
    concern.recommendedProductIds.includes(review.productId),
  );

  return (
    <div className="page-canvas min-h-dvh">
      <section className="bg-noise bg-[#FAF8F3] py-12 lg:py-20">
        <div className="site-container relative z-10">
          <Link
            href="/concerns"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#6F766F] transition-colors duration-500 hover:text-[#17211D]"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            고민별 케어로 돌아가기
          </Link>

          <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <div
              aria-hidden="true"
              className="flex size-16 shrink-0 items-center justify-center rounded-3xl bg-[#F3EEE6] text-3xl sm:size-20"
            >
              {concern.icon}
            </div>
            <PageIntro
              eyebrow={`${concern.title} CARE`}
              title={heroCopy.title}
              description={heroCopy.description}
              className="max-w-4xl"
            />
          </div>

          <div
            role="note"
            className="mt-10 flex max-w-4xl items-start gap-3 rounded-2xl border border-[#E7E0D5] bg-white/80 p-5 sm:p-6"
          >
            <Info className="mt-0.5 size-5 shrink-0 text-[#A8742E]" aria-hidden="true" />
            <p className="break-keep text-sm leading-7 text-[#6F766F]">
              아래 내용은 일상에서 참고할 일반 정보예요. 증상이 갑자기 심해졌거나 오래 이어진다면
              제품을 고르기 전에 동물병원에서 먼저 확인해 주세요.
            </p>
          </div>
        </div>
      </section>

      <nav
        aria-label="고민별 케어 상세 메뉴"
        className="sticky top-16 z-20 border-y border-[#E7E0D5] bg-[#FBFAF7]/95 backdrop-blur-xl lg:top-[72px]"
      >
        <div className="site-container hide-scrollbar flex gap-7 overflow-x-auto">
          {detailSections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="shrink-0 border-b-2 border-transparent py-4 text-xs font-semibold text-[#6F766F] transition-colors duration-500 hover:border-[#A8742E] hover:text-[#17211D] sm:text-sm"
            >
              {section.label}
            </a>
          ))}
        </div>
      </nav>

      <section id="info" className="page-section scroll-mt-32 lg:scroll-mt-36">
        <div className="site-container">
          <SectionHeading
            eyebrow="CARE SIGNALS"
            title="이런 변화가 함께 보이나요?"
            description="하나만 보여도 바로 문제가 있다는 뜻은 아니에요. 평소와 다른 점이 이어지는지 천천히 살펴봐 주세요."
          />

          <div className="mt-10 grid gap-6 lg:grid-cols-12">
            <div className="rounded-3xl bg-[#FAF8F3] p-6 sm:p-8 lg:col-span-7">
              <h3 className="text-lg font-bold tracking-tight text-[#17211D]">생활 속에서 보이는 신호</h3>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {concern.symptoms.map((symptom) => (
                  <li
                    key={symptom}
                    className="flex items-start gap-3 rounded-2xl border border-[#E7E0D5] bg-white p-4"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-[#A8742E]" aria-hidden="true" />
                    <span className="break-keep text-sm font-medium leading-6 text-[#17211D]">{symptom}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-[#E7E0D5] bg-white p-6 sm:p-8 lg:col-span-5">
              <h3 className="break-keep text-lg font-bold tracking-tight text-[#17211D]">
                원인은 하나로 정해지지 않아요
              </h3>
              <p className="mt-3 break-keep text-sm leading-7 text-[#6F766F]">
                아래 항목은 가능성을 살펴보는 참고 목록이에요. 정확한 원인은 진료를 통해 확인해 주세요.
              </p>
              <ol className="mt-6 space-y-4">
                {concern.causes.map((cause, index) => (
                  <li key={cause} className="flex items-start gap-4 border-t border-[#E7E0D5] pt-4 first:border-0 first:pt-0">
                    <span className="font-editorial text-sm font-semibold text-[#A8742E]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="break-keep text-sm font-medium leading-6 text-[#17211D]">{cause}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section id="brands" className="page-section-muted scroll-mt-32 lg:scroll-mt-36">
        <div className="site-container">
          <SectionHeading
            eyebrow="BRANDS TO KNOW"
            title="이 고민과 함께 살펴볼 브랜드"
            description="브랜드가 전하는 철학과 제품 정보를 먼저 읽어보고, 우리 아이의 생활에 맞는지 차분히 비교해 보세요."
          />

          {recommendedBrands.length > 0 ? (
            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:gap-6">
              {recommendedBrands.map((brand) => (
                <Link
                  key={brand.id}
                  href={`/brands/${brand.id}`}
                  className="premium-card group flex min-h-56 flex-col justify-between p-6 sm:p-8"
                >
                  <div>
                    <BrandLogo brand={brand} size="md" surface={false} />
                    <h3 className="mt-8 break-keep text-xl font-bold tracking-tight text-[#17211D]">
                      {brand.name}
                    </h3>
                    <p className="mt-3 line-clamp-2 break-keep text-sm leading-7 text-[#6F766F]">
                      {brand.description}
                    </p>
                  </div>
                  <span className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[#17211D]">
                    브랜드 이야기 보기
                    <ArrowRight
                      className="size-4 text-[#A8742E] transition-transform duration-500 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-10">
              <EmptyState
                title="함께 소개할 브랜드를 살펴보고 있어요"
                description="브랜드 자료를 차분히 확인한 뒤 이곳에서 소개할게요."
                actionLabel="브랜드 모두 보기"
                actionHref="/brands"
              />
            </div>
          )}
        </div>
      </section>

      <section id="products" className="page-section scroll-mt-32 lg:scroll-mt-36">
        <div className="site-container">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <SectionHeading
              eyebrow="DAILY SELECTION"
              title="일상 관리에 함께 볼 상품"
              description="치료를 대신하는 상품이 아니라, 매일의 관리에서 참고할 수 있는 선택지를 모았어요."
            />
            <Link
              href={`/shop?concern=${concern.slug}`}
              className="btn-secondary shrink-0 self-start sm:self-auto"
            >
              셀렉션 더 보기
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>

          {recommendedProducts.length > 0 ? (
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:gap-6">
              {recommendedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="mt-10">
              <EmptyState
                title="함께 소개할 상품을 고르고 있어요"
                description="생활 관리에 참고할 상품을 차분히 살펴본 뒤 소개할게요."
                actionLabel="전체 셀렉션 보기"
                actionHref="/shop"
              />
            </div>
          )}
        </div>
      </section>

      <section
        id="insurance"
        className="bg-noise scroll-mt-32 overflow-hidden bg-[#202521] py-16 lg:scroll-mt-36 lg:py-24"
      >
        <div className="site-container relative z-10 grid gap-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="page-eyebrow">COVERAGE CHECK</p>
            <h2 className="mt-3 max-w-3xl break-keep text-3xl font-bold leading-tight tracking-tight text-[#FBFAF7] sm:text-4xl">
              가입한 보험, 이 고민도 보장될까요?
            </h2>
            <p className="mt-5 max-w-2xl break-keep text-sm leading-7 text-[#FBFAF7]/75 sm:text-base sm:leading-8">
              {concern.title} 관련 진료가 어디까지 보장되는지 약관부터 차분히 살펴보세요. 아직 보험이
              없어도 필요한 보장 기준을 먼저 정리할 수 있어요.
            </p>
            <p className="mt-4 break-keep text-xs leading-6 text-[#FBFAF7]/60">
              실제 보장 여부와 보험금은 가입한 상품의 약관과 보험사 심사에 따라 달라질 수 있어요.
            </p>
          </div>
          <div className="lg:col-span-4 lg:flex lg:justify-end">
            <Link
              href="/insurance/apply"
              className="btn-secondary border-[#E7E0D5] bg-[#FBFAF7] text-[#17211D] hover:bg-[#F3EEE6]"
            >
              보험 보장 살펴보기
              <ShieldCheck className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section id="reviews" className="page-section-muted scroll-mt-32 lg:scroll-mt-36">
        <div className="site-container">
          <SectionHeading
            eyebrow="FAMILY STORIES"
            title="함께 읽어볼 반려가족 이야기"
            description="먼저 사용해 본 반려가족의 경험을 참고해 보세요. 아이마다 생활 환경과 느끼는 차이가 있을 수 있어요."
          />

          {relatedReviews.length > 0 ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:gap-6">
              {relatedReviews.slice(0, 4).map((review) => {
                const product = products.find((item) => item.id === review.productId);
                return <ReviewCard key={review.id} review={review} productName={product?.name} />;
              })}
            </div>
          ) : (
            <div className="mt-10">
              <EmptyState
                title="함께 읽을 이야기가 아직 없어요"
                description="다른 반려가족의 이야기가 도착하면 이곳에서 소개할게요."
                actionLabel="전체 이야기 보기"
                actionHref="/reviews"
              />
            </div>
          )}
        </div>
      </section>

      <section id="faq" className="page-section scroll-mt-32 lg:scroll-mt-36">
        <div className="site-container">
          <SectionHeading
            eyebrow="QUESTIONS"
            title="많이 궁금해하시는 점"
            description="생활 속에서 자주 떠오르는 질문을 모았어요. 아이의 상태에 따라 답은 달라질 수 있으니 참고용으로 살펴봐 주세요."
          />

          <div className="mt-10 space-y-4">
            {concern.faq.map((item) => (
              <details
                key={item.question}
                className="group rounded-3xl border border-[#E7E0D5] bg-white p-5 transition-colors duration-500 open:bg-[#FAF8F3] sm:p-6"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-5 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-start gap-3 break-keep text-base font-bold leading-7 text-[#17211D]">
                    <span className="font-editorial text-[#A8742E]">Q.</span>
                    {item.question}
                  </span>
                  <ChevronDown
                    className="mt-1 size-5 shrink-0 text-[#6F766F] transition-transform duration-500 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>
                <p className="ml-8 mt-5 max-w-4xl break-keep text-sm leading-7 text-[#6F766F]">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
