import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Info, CheckCircle, ShieldCheck } from 'lucide-react';
import { concerns } from '@/data/concerns';
import { listProducts } from '@/lib/products/repo';
import { listBrands } from '@/lib/brands/repo';
import { reviews } from '@/data/reviews';
import ProductCard from '@/components/common/ProductCard';
import ReviewCard from '@/components/common/ReviewCard';
import EmptyState from '@/components/common/EmptyState';

// In Next.js 15, params is a Promise. Wait, the prompt says Next 15, so params should be awaited.
// But for simplicity in a basic App Router setup, if we don't await, it might throw a warning.
// Let's use it as a Promise.

// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export default async function ConcernDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const concern = concerns.find(c => c.slug === resolvedParams.slug);

  if (!concern) {
    notFound();
  }

  const [allProducts, allBrands] = await Promise.all([listProducts(), listBrands()]);
  const recommendedProducts = allProducts.filter(p => concern.recommendedProductIds.includes(p.id));
  const recommendedBrands = allBrands.filter(b => concern.recommendedBrandIds.includes(b.id));
  // Find reviews for the recommended products
  const relatedReviews = reviews.filter(r => concern.recommendedProductIds.includes(r.productId));

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="bg-[#ECEAE3] py-16">
        <div className="site-container">
          <Link href="/concerns" className="mb-8 inline-flex items-center text-sm font-medium text-gray-500 hover:text-[#2F3B34]">
            <ArrowLeft className="mr-2 h-4 w-4" /> 고민해결 목록
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-3xl shadow-sm">
              {concern.icon}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#202521]">{concern.title} 고민</h1>
              <p className="mt-2 text-gray-600">{concern.shortDescription}</p>
            </div>
          </div>
          <p className="mt-6 max-w-3xl text-lg text-gray-700 leading-relaxed">
            {concern.description}
          </p>
        </div>
      </div>

      <nav aria-label="고민 상세 메뉴" className="sticky top-[72px] z-30 border-y border-[#D8D6CE] bg-[#FAF9F5]">
        <div className="site-container flex gap-7 overflow-x-auto hide-scrollbar">
          {[
            ['원인과 정보', 'info'],
            ['추천 브랜드', 'brands'],
            ['추천 상품', 'products'],
            ['보험 정보', 'insurance'],
            ['실제 후기', 'reviews'],
            ['FAQ', 'faq'],
          ].map(([label, target]) => (
            <a key={target} href={`#${target}`} className="whitespace-nowrap border-b-2 border-transparent py-4 text-sm text-[#6F756F] hover:border-[#2F3B34] hover:text-[#2F3B34]">
              {label}
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-3">
          {/* Main Content (Left) */}
          <div className="lg:col-span-2 space-y-16">
            
            {/* 증상 확인 */}
            <section id="info" className="scroll-mt-36">
              <h2 className="flex items-center text-xl font-bold text-[#202521]">
                <Info className="mr-2 h-5 w-5 text-[#68776C]" /> 이런 증상이 있나요?
              </h2>
              <div className="mt-6 rounded-sm bg-[#E7E4DC] p-6 sm:p-8">
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {concern.symptoms.map((symptom, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="mr-2 mt-0.5 h-4 w-4 shrink-0 text-[#68776C]" />
                      <span className="text-sm font-medium text-gray-800">{symptom}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* 원인 정보 */}
            <section>
              <h2 className="text-xl font-bold text-[#202521]">주요 원인</h2>
              <div className="mt-6 space-y-4">
                {concern.causes.map((cause, i) => (
                  <div key={i} className="flex items-center rounded-sm border border-gray-100 bg-white p-4 shadow-sm">
                    <span className="mr-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#2F3B34] text-sm font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="font-medium text-gray-800">{cause}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* 추천 상품 */}
            <section id="products" className="scroll-mt-36">
              <div className="flex items-end justify-between mb-6">
                <h2 className="text-xl font-bold text-[#202521]">맞춤 추천 상품</h2>
                <Link href={`/shop?concern=${concern.slug}`} className="text-sm font-medium text-[#2F3B34] hover:text-[#68776C]">
                  더보기
                </Link>
              </div>
              {recommendedProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {recommendedProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <EmptyState title="추천 상품이 없습니다." description="현재 준비 중입니다." />
              )}
            </section>

            {/* 실제 후기 */}
            <section id="reviews" className="scroll-mt-36">
              <h2 className="text-xl font-bold text-[#202521] mb-6">이런 후기가 있어요</h2>
              {relatedReviews.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {relatedReviews.slice(0, 4).map(review => {
                    const product = allProducts.find(p => p.id === review.productId);
                    return <ReviewCard key={review.id} review={review} productName={product?.name} />;
                  })}
                </div>
              ) : (
                <EmptyState title="아직 후기가 없습니다." description="첫 후기를 남겨주세요." />
              )}
            </section>

            {/* FAQ */}
            <section id="faq" className="scroll-mt-36">
              <h2 className="text-xl font-bold text-[#202521] mb-6">자주 묻는 질문 (FAQ)</h2>
              <div className="space-y-4">
                {concern.faq.map((item, i) => (
                  <div key={i} className="rounded-sm border border-gray-100 p-5">
                    <h3 className="font-bold text-[#2F3B34] flex items-start">
                      <span className="mr-2 text-[#68776C]">Q.</span> {item.question}
                    </h3>
                    <p className="mt-3 text-sm text-gray-600 leading-relaxed pl-6">
                      {item.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar (Right) */}
          <div className="space-y-8 lg:sticky lg:top-24 lg:self-start">
            
            {/* 추천 브랜드 */}
            <div id="brands" className="scroll-mt-36 rounded-sm border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-[#202521] mb-4 flex items-center">
                <ShieldCheck className="mr-2 h-5 w-5 text-[#2F3B34]" /> 신뢰할 수 있는 브랜드
              </h3>
              <div className="space-y-4">
                {recommendedBrands.map(brand => (
                  <Link key={brand.id} href={`/brands/${brand.id}`} className="group flex items-center gap-3 rounded-sm border border-gray-50 bg-gray-50 p-3 transition hover:border-[#2F3B34] hover:bg-white">
                    <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-gray-400 border border-gray-100">
                      로고
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 group-hover:text-[#2F3B34]">{brand.name}</div>
                      <div className="text-xs text-gray-500">검증 등급: {brand.auditGrade}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* 보험 CTA */}
            <div id="insurance" className="scroll-mt-36 rounded-sm bg-[#2F3B34] p-6 text-white text-center shadow-sm">
              <h3 className="text-lg font-bold text-[#68776C] mb-3">병원비 걱정되시나요?</h3>
              <p className="text-sm text-gray-300 leading-relaxed mb-6">
                {concern.insuranceCta}
              </p>
              <Link href="/insurance/apply" className="block w-full rounded-full bg-white px-4 py-3 text-sm font-bold text-[#2F3B34] transition hover:bg-gray-100">
                무료 보험 분석 받기
              </Link>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
