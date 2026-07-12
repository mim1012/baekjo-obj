import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2, Lock, MessageCircle, ShieldCheck } from 'lucide-react';
import { getProductById, listProducts } from '@/lib/products/repo';
import { getBrandById } from '@/lib/brands/repo';
import { getQnaConfig } from '@/lib/qna/repo';
import { defaultQnaConfig } from '@/lib/qna/config';
import { reviews } from '@/data/reviews';
import { logServerError } from '@/lib/logServerError';
import EmptyState from '@/components/common/EmptyState';
import ProductCard from '@/components/common/ProductCard';
import ReviewCard from '@/components/common/ReviewCard';
import ProductDetailClient from '@/components/shop/ProductDetailClient';
import { formatDate } from '@/lib/format';

const defaultRecommendations = [
  '상품 설명과 사용 방법을 충분히 확인하고 싶은 보호자',
  '우리 아이의 취향과 생활 습관을 살펴 천천히 고르고 싶은 보호자',
];

const defaultCautions = [
  '특정 성분에 민감하거나 알레르기 경험이 있는 아이',
  '치료 중인 질환이 있거나 처방식을 먹고 있는 아이',
];

// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const [brand, allProducts] = await Promise.all([
    getBrandById(product.brandId),
    listProducts(),
  ]);
  const relatedProducts = allProducts
    .filter((candidate) => candidate.id !== product.id && (
      candidate.category === product.category
      || candidate.concernTags.some((tag) => product.concernTags.includes(tag))
    ))
    .slice(0, 4);
  const productReviews = reviews.filter((review) => review.productId === product.id);
  // Q&A 는 DB 싱글턴 config(콘센트=서버 repo)에서 읽고, 공개 화면이라 실패 시 기본 문의로 폴백한다(500 금지).
  let qnaItems = defaultQnaConfig.items;
  try {
    const savedQna = await getQnaConfig();
    if (savedQna && Array.isArray(savedQna.items)) qnaItems = savedQna.items;
  } catch (error) {
    logServerError('[GET /shop/[id]] Q&A 조회 실패 — defaultQnaConfig 로 폴백', error);
  }
  const productQna = qnaItems.filter((qna) => qna.productId === product.id);
  const brandProducts = brand
    ? allProducts.filter((candidate) => brand.representativeProductIds.includes(candidate.id)).slice(0, 3)
    : [];
  const recommendedFor = product.recommendedFor?.length ? product.recommendedFor : defaultRecommendations;
  const cautions = product.caution?.length ? product.caution : defaultCautions;

  const tabs = [
    ['상품 이야기', 'story'],
    ['성분·사용법', 'details'],
    ['살펴본 기준', 'standard'],
    [`후기 ${productReviews.length}`, 'reviews'],
    [`문의 ${productQna.length}`, 'qna'],
  ];

  return (
    <div className="page-canvas pb-16">
      <div className="site-container-wide py-8 lg:py-12">
        <ProductDetailClient product={product} />

        <div className="sticky top-16 z-20 mt-12 border-b border-[#E7E0D5] bg-[#FBFAF7]/95 backdrop-blur-xl lg:top-[72px]">
          <nav aria-label="상품 상세 메뉴" className="hide-scrollbar -mb-px flex gap-6 overflow-x-auto">
            {tabs.map(([label, target]) => (
              <a
                key={target}
                href={`#${target}`}
                className="shrink-0 border-b-2 border-transparent py-4 text-sm font-semibold text-[#6F766F] transition-colors duration-500 hover:border-[#17211D] hover:text-[#17211D] focus:border-[#17211D] focus:text-[#17211D]"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div className="space-y-20 py-12 lg:space-y-28 lg:py-20">
          <section id="story" className="scroll-mt-36">
            <div className="mx-auto max-w-3xl">
              <p className="page-eyebrow">상품 이야기</p>
              <h2 className="section-title mt-3">일상에서 이렇게 만나보세요.</h2>
              <p className="body-copy mt-5">{product.description}</p>
              <div className="relative mt-8 aspect-[4/5] overflow-hidden rounded-3xl bg-[#F3EEE6] sm:aspect-[4/3]">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 768px"
                    className="object-contain p-8 sm:p-12"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-[#6F766F]">상세 이미지를 준비하고 있어요.</div>
                )}
              </div>
            </div>
          </section>

          <section id="details" className="scroll-mt-36">
            <div className="mx-auto max-w-4xl">
              <div className="mb-8">
                <p className="page-eyebrow">성분과 사용법</p>
                <h2 className="section-title mt-3">아이에게 닿는 정보부터 확인해요.</h2>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <InfoCard
                  title="성분·소재"
                  description={product.ingredients || '상품 패키지에 표시된 성분과 소재 정보를 확인해 정리하고 있어요.'}
                />
                <InfoCard
                  title="급여·사용 방법"
                  description={
                    product.howToUse ||
                    '아이의 체중과 건강 상태를 살피고, 패키지에 안내된 권장량과 사용 방법을 먼저 확인해 주세요.'
                  }
                />
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <ChecklistCard title="함께 확인하면 좋아요" items={recommendedFor} tone="positive" />
                <ChecklistCard title="조금 더 주의해 주세요" items={cautions} tone="caution" />
              </div>
            </div>
          </section>

          <section id="standard" className="scroll-mt-36">
            <div className="mx-auto max-w-4xl overflow-hidden rounded-3xl bg-[#202521] p-7 text-[#FBFAF7] sm:p-10">
              <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
                <div>
                  <p className="font-editorial text-sm italic tracking-wide text-[#D8C4A3]">백조가 살펴본 내용</p>
                  <h2 className="mt-3 break-keep text-2xl font-bold tracking-tight text-[#FBFAF7] sm:text-3xl">
                    {brand?.auditReport ? '확인한 내용을 솔직하게 전해요.' : '브랜드 자료를 차근차근 살펴보고 있어요.'}
                  </h2>
                  <p className="mt-5 break-keep text-sm leading-7 text-[#FBFAF7]/70">
                    {brand?.auditReport
                      ? '브랜드가 제공한 자료와 공개 정보를 바탕으로 정리한 내용이에요. 새로운 정보가 확인되면 계속 업데이트할게요.'
                      : '아직 모든 확인이 끝나지 않았어요. 판매를 시작하기 전에 필요한 자료와 상품 정보를 더 살펴볼게요.'}
                  </p>
                  {brand && (
                    <Link href={`/brands/${brand.id}`} className="btn-secondary mt-7 border-[#FBFAF7]/25 text-[#FBFAF7] hover:border-[#FBFAF7]/50 hover:bg-[#FBFAF7]/10">
                      브랜드 이야기 더 보기
                      <ArrowRight className="size-4" />
                    </Link>
                  )}
                </div>
                <div className="lg:border-l lg:border-[#FBFAF7]/10 lg:pl-10">
                  <ul className="space-y-3">
                    {(brand?.auditPoints ?? ['브랜드 운영 자료 확인 중', '상품 정보와 판매 조건 확인 중']).map((point) => (
                      <li key={point} className="flex items-start gap-3 rounded-2xl bg-[#FBFAF7]/5 px-4 py-3 text-sm leading-6 text-[#FBFAF7]/75">
                        <ShieldCheck className="mt-1 size-4 shrink-0 text-[#D8C4A3]" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  {brandProducts.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-2">
                      {brandProducts.map((item) => (
                        <Link key={item.id} href={`/shop/${item.id}`} className="rounded-full border border-[#FBFAF7]/15 px-3 py-2 text-xs text-[#FBFAF7]/65 transition-colors duration-500 hover:border-[#FBFAF7]/40 hover:text-[#FBFAF7]">
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section id="reviews" className="scroll-mt-36">
            <div className="mb-6 flex items-end justify-between border-b border-[#E7E0D5] pb-4">
              <div>
                <p className="page-eyebrow">반려가족 이야기</p>
                <h2 className="mt-2 text-xl font-bold text-[#17211D]">이 상품을 써본 이야기</h2>
              </div>
              <Link href="/login" className="text-sm font-semibold text-[#6F766F] transition-colors duration-500 hover:text-[#17211D]">
                후기 남기기
              </Link>
            </div>
            {productReviews.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {productReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} productName={product.name} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="이 상품의 이야기는 아직 없어요."
                description="먼저 사용해 본 경험이 쌓이면 이곳에 차곡차곡 소개할게요."
                actionLabel="다른 셀렉션 보기"
                actionHref="/shop"
              />
            )}
          </section>

          <section id="qna" className="scroll-mt-36">
            <div className="mb-6 flex items-end justify-between border-b border-[#E7E0D5] pb-4">
              <div>
                <p className="page-eyebrow">상품 문의</p>
                <h2 className="mt-2 text-xl font-bold text-[#17211D]">궁금한 점을 남겨주세요.</h2>
              </div>
              <Link href="/login" className="btn-secondary min-h-10 px-4 py-2 text-xs">
                <MessageCircle className="size-4" />
                문의하기
              </Link>
            </div>
            {productQna.length > 0 ? (
              <div className="border-t border-[#E7E0D5]">
                {productQna.map((qna) => (
                  <article key={qna.id} className="border-b border-[#E7E0D5] py-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#F3EEE6] px-2.5 py-1 text-[10px] font-bold text-[#6F766F]">
                        {qna.status}
                      </span>
                      <h3 className="flex items-center gap-1.5 break-keep text-sm font-semibold text-[#17211D]">
                        {qna.isSecret && <Lock className="size-3 text-[#6F766F]" />}
                        {qna.question}
                      </h3>
                      <time className="ml-auto text-xs tabular-nums text-[#8A918B]">{formatDate(qna.createdAt)}</time>
                    </div>
                    {qna.answer && <p className="mt-4 rounded-2xl bg-[#FAF8F3] p-4 text-sm leading-6 text-[#6F766F]">{qna.answer}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="아직 등록된 문의가 없어요."
                description="상품에 대해 궁금한 점이 있다면 편하게 남겨주세요."
                actionLabel="로그인하고 문의하기"
                actionHref="/login"
              />
            )}
          </section>

          {relatedProducts.length > 0 && (
            <section>
              <div className="mb-8">
                <p className="page-eyebrow">함께 둘러보기</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#17211D]">이런 상품도 함께 살펴보세요.</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
                {relatedProducts.map((item) => (
                  <ProductCard key={item.id} product={item} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

interface InfoCardProps {
  title: string;
  description: string;
}

function InfoCard({ title, description }: InfoCardProps) {
  return (
    <div className="premium-card p-6 sm:p-8">
      <h3 className="text-base font-bold text-[#17211D]">{title}</h3>
      <p className="mt-4 break-keep text-sm leading-7 text-[#6F766F]">{description}</p>
    </div>
  );
}

interface ChecklistCardProps {
  title: string;
  items: string[];
  tone: 'positive' | 'caution';
}

function ChecklistCard({ title, items, tone }: ChecklistCardProps) {
  return (
    <div className="rounded-3xl border border-[#E7E0D5] bg-[#FAF8F3] p-6 sm:p-8">
      <h3 className="flex items-center gap-2 text-base font-bold text-[#17211D]">
        <CheckCircle2 className={`size-4 ${tone === 'positive' ? 'text-[#A8742E]' : 'text-[#9E3939]'}`} />
        {title}
      </h3>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3 break-keep text-sm leading-6 text-[#6F766F]">
            <span className={`mt-2 size-1.5 shrink-0 rounded-full ${tone === 'positive' ? 'bg-[#A8742E]' : 'bg-[#9E3939]'}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
