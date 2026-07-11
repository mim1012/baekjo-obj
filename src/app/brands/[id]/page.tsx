import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { getBrandById } from '@/lib/brands/repo';
import { listProductsByBrand } from '@/lib/products/repo';
import { concerns } from '@/data/concerns';
import { reviews } from '@/data/reviews';
import BrandAuditReport from '@/components/common/BrandAuditReport';
import ProductCard from '@/components/common/ProductCard';
import ReviewCard from '@/components/common/ReviewCard';

// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const brand = await getBrandById(resolvedParams.id);

  if (!brand) {
    notFound();
  }

  const brandProducts = await listProductsByBrand(brand.id);
  const repProducts = brandProducts.filter(p => brand.representativeProductIds.includes(p.id));
  const relatedConcerns = concerns.filter(c => brand.relatedConcernSlugs.includes(c.slug));
  const brandReviews = reviews.filter((review) => brandProducts.some((product) => product.id === review.productId));

  return (
    <div className="bg-[#FBFAF7] pb-24">
      {/* Brand Hero */}
      <div className="bg-[#17211D] py-24 sm:py-32 relative overflow-hidden text-white">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute right-0 top-0 w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-white/20 to-transparent blur-3xl transform translate-x-1/3 -translate-y-1/4"></div>
        </div>
        <div className="site-container relative z-10">
          <Link href="/brands" className="mb-12 inline-flex items-center text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> 브랜드관 목록
          </Link>
          <div className="flex flex-col md:flex-row md:items-end gap-12 justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-[24px] bg-white text-slate-300 font-bold shadow-xl text-sm">
                <span className="font-editorial text-4xl italic">{brand.name.slice(0, 1)}</span>
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">{brand.name}</h1>
              </div>
            </div>
            <div className="hidden md:flex h-48 w-full max-w-md items-center justify-center rounded-[24px] border border-white/10 bg-white/5 backdrop-blur-sm shadow-inner relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="font-editorial text-[120px] italic text-white/10 mix-blend-overlay">{brand.name.slice(0, 1)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-10 sm:py-24">
        <section className="grid overflow-hidden rounded-[24px] border border-[rgba(15,23,42,0.06)] bg-white shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
          <div className="border-b border-[rgba(15,23,42,0.06)] p-8 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
            <p className="text-xs font-bold tracking-[0.18em] text-[#A8742E] uppercase">About the brand</p>
            <h2 className="mt-5 text-2xl font-bold leading-snug tracking-tight text-[#17211D] sm:text-3xl">
              {brand.description}
            </h2>
            {relatedConcerns.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {relatedConcerns.map(concern => (
                  <Link key={concern.slug} href={`/concerns/${concern.slug}`} className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(15,23,42,0.10)] bg-[#FBFAF7] px-4 py-2 text-xs font-semibold text-[#334155] transition-colors hover:border-[#17211D] hover:text-[#17211D]">
                    <span>{concern.icon}</span> {concern.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="p-8 sm:p-10 lg:p-12">
            <p className="text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">Philosophy</p>
            <p className="mt-5 whitespace-pre-line text-base font-medium leading-8 text-[#52605A]">
              {brand.philosophy}
            </p>
          </div>
        </section>

        <BrandAuditReport brand={brand} />

        <div id="brand-products" className="scroll-mt-28 space-y-24 pt-24 sm:pt-28">
          <section>
            <div className="mb-10 flex items-end justify-between border-b border-[rgba(15,23,42,0.07)] pb-5">
              <div>
                <p className="text-xs font-bold tracking-[0.18em] text-[#A8742E] uppercase">Audit selection</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#17211D]">검증을 통과한 대표 상품</h2>
              </div>
              <span className="hidden text-sm font-medium text-slate-400 sm:block">총 {repProducts.length}개</span>
            </div>
            {repProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
                {repProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-[rgba(15,23,42,0.12)] bg-white p-12 text-center text-sm font-medium text-slate-400 shadow-sm">
                현재 준비 중인 대표 상품입니다.
              </div>
            )}
          </section>

          <section>
            <div className="mb-10 flex items-end justify-between border-b border-[rgba(15,23,42,0.06)] pb-4">
              <h2 className="text-3xl font-bold tracking-tight text-[#17211D]">전체 상품</h2>
              <Link href={`/shop?brandId=${brand.id}`} className="flex items-center text-sm font-semibold text-slate-500 transition-colors hover:text-[#17211D]">
                더보기 <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
              {brandProducts.slice(0, 6).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-10 flex items-end justify-between border-b border-[rgba(15,23,42,0.06)] pb-4">
              <h2 className="text-3xl font-bold tracking-tight text-[#17211D]">브랜드 후기</h2>
              <Link href="/reviews" className="text-sm font-semibold text-slate-500 transition-colors hover:text-[#17211D]">전체 후기</Link>
            </div>
            {brandReviews.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2">
                {brandReviews.slice(0, 4).map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    productName={brandProducts.find((product) => product.id === review.productId)?.name}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-[18px] border border-dashed border-[rgba(15,23,42,0.12)] bg-white p-12 text-center text-sm font-medium text-slate-400 shadow-sm">
                이 브랜드의 공개 후기가 아직 없습니다.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
