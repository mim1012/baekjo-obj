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
  '눈물 고민이 있는 아이',
  '편식이 있는 아이',
  '영양 보충이 필요한 아이',
];
const defaultCautions = [
  '특정 성분 알레르기가 있는 아이',
  '치료 중인 질환이 있는 아이',
  '수의사 처방식 급여 중인 아이',
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
    ['상세정보', 'tab-0'],
    ['추천대상', 'tab-1'],
    ['성분/소재', 'tab-2'],
    ['급여/사용방법', 'tab-3'],
    ['브랜드스토리', 'tab-4'],
    [`구매평 (${product.reviewCount})`, 'tab-5'],
    [`Q&A (${productQna.length})`, 'tab-6'],
    ['추천상품', 'tab-7'],
  ];

  return (
    <div className="bg-white pb-20">
      <div className="site-container py-10">
        <ProductDetailClient product={product} />

        {/* Audit Summary Card */}
        {brand && (
          <div className="mt-16 sm:mt-24 rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[#FBFAF7] p-8 sm:p-10 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
              <ShieldCheck className="size-48" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <span className="flex items-center justify-center size-10 rounded-full bg-white shadow-sm border border-[rgba(15,23,42,0.04)] text-[#17211D]">
                  <ShieldCheck className="size-5" />
                </span>
                <h2 className="text-2xl font-editorial font-bold text-[#17211D] tracking-tight">Audit Summary</h2>
              </div>
              <p className="text-sm font-semibold text-[#17211D] mb-4">백조오브제 3단계 검증을 통과한 신뢰할 수 있는 제품입니다.</p>
              <ul className="grid sm:grid-cols-2 gap-3 text-sm text-[#334155]">
                {brand.auditPoints.map((point) => (
                  <li key={point} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-[#17211D]" /> {point}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-slate-400">*본 평가는 브랜드로부터 제공받은 자료와 자체 기준을 바탕으로 한 가상 데이터입니다.</p>
            </div>
          </div>
        )}

        <div className="sticky top-[72px] z-40 mt-16 sm:mt-24 border-b border-[rgba(15,23,42,0.06)] bg-white/80 backdrop-blur-md">
          <nav aria-label="상품 상세 메뉴" className="-mb-px flex gap-7 overflow-x-auto hide-scrollbar px-2">
            {tabs.map(([label, target], index) => (
              <a
                key={target}
                href={`#${target}`}
                className={`whitespace-nowrap border-b-2 py-4 text-sm font-semibold transition-colors ${
                  index === 0 ? 'border-[#17211D] text-[#17211D]' : 'border-transparent text-slate-400 hover:text-[#17211D]'
                }`}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>

        <div className="space-y-32 py-16 sm:py-24">
          <section id="tab-0" className="mx-auto max-w-3xl text-center scroll-mt-36">
            <p className="font-editorial text-lg italic text-slate-400">Product details</p>
            <h2 className="mt-4 text-3xl font-normal leading-tight text-[#17211D] tracking-tight text-balance">{product.description}</h2>
            <div className="mt-12 flex aspect-[3/4] w-full items-center justify-center rounded-[24px] border border-[rgba(15,23,42,0.06)] bg-[#FBFAF7] shadow-sm">
              <div className="text-center">
                <span className="font-editorial text-6xl italic text-slate-200">{product.category.slice(0, 1)}</span>
                <p className="mt-5 text-xs font-semibold text-slate-400">교체 가능한 상세 이미지 영역</p>
                <p className="mt-2 text-[10px] text-slate-300">{product.image}</p>
              </div>
            </div>
          </section>

          <section id="tab-1" className="mx-auto grid max-w-4xl gap-6 scroll-mt-36 md:grid-cols-2">
            <div className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-white p-8 sm:p-10 shadow-sm">
              <h2 className="flex items-center text-2xl font-bold text-[#17211D] tracking-tight">
                <span className="flex items-center justify-center size-10 rounded-full bg-[#FBFAF7] mr-4 text-[#17211D]">
                  <CheckCircle2 className="size-5" />
                </span>
                이런 아이에게 추천해요
              </h2>
              <ul className="mt-8 space-y-5">
                {recommendedFor.map((recommendation) => (
                  <li key={recommendation} className="flex items-start gap-3 text-sm font-medium text-[#334155]">
                    <span className="mt-2 size-1.5 rounded-full bg-[#17211D] shrink-0" />
                    {recommendation}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[18px] border border-[rgba(15,23,42,0.08)] bg-[#FBFAF7] p-8 sm:p-10 shadow-sm">
              <h2 className="flex items-center text-2xl font-bold text-[#17211D] tracking-tight">
                <span className="flex items-center justify-center size-10 rounded-full bg-white mr-4 text-red-500 shadow-sm border border-[rgba(15,23,42,0.04)]">
                  !
                </span>
                이런 경우 확인이 필요해요
              </h2>
              <ul className="mt-8 space-y-5">
                {cautions.map((caution) => (
                  <li key={caution} className="flex items-start gap-3 text-sm font-medium text-[#334155]">
                    <span className="mt-2 size-1.5 rounded-full bg-red-400 shrink-0" />
                    {caution}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="tab-2" className="mx-auto max-w-3xl scroll-mt-36">
            <h2 className="text-2xl font-bold text-[#17211D] tracking-tight">성분 / 소재</h2>
            <p className="mt-6 rounded-[16px] border border-[rgba(15,23,42,0.06)] bg-[#FBFAF7] p-8 text-sm leading-8 text-[#334155] shadow-sm">
              {product.ingredients || '상세 성분과 소재 정보는 상품 패키지 표기 기준으로 준비 중입니다.'}
            </p>
          </section>

          <section id="tab-3" className="mx-auto max-w-3xl scroll-mt-36">
            <h2 className="text-2xl font-bold text-[#17211D] tracking-tight">급여 / 사용방법</h2>
            <p className="mt-6 rounded-[16px] border border-[rgba(15,23,42,0.06)] bg-[#FBFAF7] p-8 text-sm leading-8 text-[#334155] shadow-sm">
              {product.howToUse || '반려동물의 체중과 건강 상태를 고려해 패키지에 안내된 권장량과 사용법을 확인해 주세요.'}
            </p>
          </section>

          {brand && (
            <section id="tab-4" className="mx-auto max-w-5xl scroll-mt-36">
              <div className="grid gap-8 rounded-[24px] bg-[#17211D] p-10 text-white lg:grid-cols-[0.8fr_1.2fr] lg:p-14 shadow-lg overflow-hidden relative">
                <div className="absolute -right-20 -top-20 opacity-5">
                  <span className="font-editorial text-[300px] italic">{brand.name.slice(0, 1)}</span>
                </div>
                <div className="relative z-10">
                  <p className="font-editorial text-lg italic text-slate-400">Brand story</p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight">{brand.name}</h2>
                  <p className="mt-6 text-sm leading-8 text-slate-300">{brand.description}</p>
                  <Link href={`/brands/${brand.id}`} className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#17211D] hover:bg-slate-100 transition-colors">
                    브랜드관 이동 <ArrowRight className="size-4" />
                  </Link>
                </div>
                <div className="relative z-10 pt-4 lg:pt-0 lg:border-l border-slate-700 lg:pl-12">
                  <h3 className="flex items-center text-sm font-semibold text-white">
                    <ShieldCheck className="mr-2 size-4" /> 백조가 확인한 점
                  </h3>
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                    {brand.auditPoints.map((point) => (
                      <li key={point} className="rounded-md border border-slate-700 bg-slate-800/30 px-4 py-3 text-xs text-slate-300 font-medium leading-relaxed">{point}</li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap gap-2">
                    {brandProducts.map((item) => (
                      <Link key={item.id} href={`/shop/${item.id}`} className="rounded-md border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors">
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section id="tab-5" className="scroll-mt-36">
            <div className="mb-8 flex items-end justify-between border-b border-[rgba(15,23,42,0.06)] pb-4">
              <h2 className="text-2xl font-bold text-[#17211D] tracking-tight">구매평 <span className="text-slate-400 ml-1">{product.reviewCount}</span></h2>
              <Link href="/login" className="text-sm font-semibold text-[#17211D] hover:text-slate-500 transition-colors">후기 작성하기</Link>
            </div>
            {productReviews.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {productReviews.map((review) => <ReviewCard key={review.id} review={review} />)}
              </div>
            ) : (
              <EmptyState title="아직 구매평이 없습니다." description="구매 후 첫 사용 경험을 남겨주세요." actionLabel="쇼핑 계속하기" actionHref="/shop" />
            )}
          </section>

          <section id="tab-6" className="scroll-mt-36">
            <div className="mb-8 flex items-end justify-between border-b border-[rgba(15,23,42,0.06)] pb-4">
              <div>
                <p className="font-editorial text-lg italic text-slate-400 leading-none mb-2">Product Q&A</p>
                <h2 className="text-2xl font-bold text-[#17211D] tracking-tight">상품문의</h2>
              </div>
              <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-[rgba(15,23,42,0.12)] bg-white px-5 py-2.5 text-sm font-semibold text-[#17211D] hover:bg-slate-50 transition-colors shadow-sm">
                <MessageCircle className="size-4" /> 1:1 문의
              </Link>
            </div>
            {productQna.length > 0 ? (
              <div className="border-t-2 border-[#17211D]">
                {productQna.map((qna) => (
                  <article key={qna.id} className="border-b border-[rgba(15,23,42,0.06)] py-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-sm px-2.5 py-1 text-[10px] font-bold tracking-wide ${qna.status === '답변완료' ? 'bg-[#17211D] text-white' : 'bg-[#FBFAF7] text-slate-500 border border-[rgba(15,23,42,0.08)]'}`}>
                        {qna.status}
                      </span>
                      <h3 className="flex items-center gap-2 text-sm font-semibold text-[#17211D]">
                        {qna.isSecret && <Lock className="size-3.5 text-slate-400" />} {qna.question}
                      </h3>
                      <time className="ml-auto text-xs font-medium tabular-nums text-slate-400">{formatDate(qna.createdAt)}</time>
                    </div>
                    {qna.answer && <p className="mt-5 rounded-[12px] bg-[#FBFAF7] p-5 text-sm leading-6 text-[#334155] font-medium">{qna.answer}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="등록된 문의가 없습니다." description="상품에 대해 궁금한 점을 남겨주세요." actionLabel="로그인 후 문의하기" actionHref="/login" />
            )}
          </section>

          <section id="tab-7" className="scroll-mt-36">
            <h2 className="mb-8 text-2xl font-bold text-[#17211D] tracking-tight">함께 살펴볼 상품</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {relatedProducts.map((item) => <ProductCard key={item.id} product={item} />)}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
