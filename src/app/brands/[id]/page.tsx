import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Search, ShieldCheck } from 'lucide-react';
import BrandAuditReport from '@/components/common/BrandAuditReport';
import BrandLogo from '@/components/common/BrandLogo';
import { SectionHeading } from '@/components/common/EditorialHeading';
import ReviewCard from '@/components/common/ReviewCard';
import BrandProductsClient from '@/components/brands/BrandProductsClient';
import { getBrandById } from '@/lib/brands/repo';
import { listProductsByBrand } from '@/lib/products/repo';
import { concerns } from '@/data/concerns';
import { reviews } from '@/data/reviews';

// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // getBrandById 는 includeHidden 없이 호출하므로 비노출(is_visible: false) 브랜드는 null → 404.
  const brand = await getBrandById(id);

  if (!brand) {
    notFound();
  }

  const shortBrandName = brand.name.replace(/\s*\(.*?\)/, '').trim();
  const brandProducts = await listProductsByBrand(brand.id);
  const relatedConcerns = concerns.filter((concern) =>
    brand.relatedConcernSlugs.includes(concern.slug),
  );
  const brandReviews = reviews.filter((review) =>
    brandProducts.some((product) => product.id === review.productId),
  );
  const hasPublishedAudit = Boolean(brand.auditReport);

  return (
    <div className="page-canvas min-h-dvh pb-20 lg:pb-28">
      <section className="bg-noise relative overflow-hidden bg-[#202521] text-[#FBFAF7]">
        <div aria-hidden="true" className="absolute -right-32 -top-40 size-[520px] rounded-full bg-[#A8742E]/15 blur-3xl" />
        <div className="site-container relative z-10 py-10 sm:py-14 lg:py-16">
          <Link
            href="/brands"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-[#FBFAF7]/65 transition-colors duration-500 hover:text-[#FBFAF7]"
          >
            <ArrowLeft className="size-4 transition-transform duration-500 group-hover:-translate-x-1" aria-hidden="true" />
            브랜드 둘러보기
          </Link>

          <div className="mt-10 grid gap-8 lg:grid-cols-[0.62fr_0.38fr] lg:items-end lg:gap-12">
            <div>
              <p className="font-editorial text-sm italic tracking-wide text-[#D8C4A3]">백조가 만난 브랜드</p>
              <h1 className="mt-4 break-keep text-[40px] font-bold leading-[1.12] tracking-[-0.04em] text-[#FBFAF7] sm:text-5xl lg:text-6xl">
                {brand.name}
              </h1>
              <p className="mt-5 max-w-2xl break-keep text-sm leading-7 text-[#FBFAF7]/75 sm:text-base sm:leading-8">
                {brand.description}
              </p>
              <span
                className={`mt-7 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${
                  hasPublishedAudit
                    ? 'border-[#D8C4A3]/40 bg-[#D8C4A3]/10 text-[#D8C4A3]'
                    : 'border-[#FBFAF7]/15 bg-[#FBFAF7]/5 text-[#FBFAF7]/70'
                }`}
              >
                {hasPublishedAudit ? (
                  <ShieldCheck className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <Search className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                )}
                {hasPublishedAudit ? '확인 기록을 공개했어요' : '자료를 살펴보고 있어요'}
              </span>
            </div>

            <div className="flex min-h-40 items-center justify-center rounded-3xl border border-[#FBFAF7]/10 bg-[#FBFAF7]/5 p-8 backdrop-blur-sm">
              <BrandLogo brand={brand} size="lg" surface={false} fit="contain" />
            </div>
          </div>
        </div>
      </section>

      <div className="site-container-wide py-12 sm:py-16">
        <section className="grid overflow-hidden rounded-3xl border border-[#E7E0D5] bg-white lg:grid-cols-[0.44fr_0.56fr]">
          <div className="flex flex-col justify-center border-b border-[#E7E0D5] p-6 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
            <p className="page-eyebrow">브랜드 한눈에</p>
            <h2 className="mt-4 break-keep text-2xl font-bold leading-[1.3] tracking-tight text-[#17211D] sm:text-3xl">
              {brand.description}
            </h2>
            {relatedConcerns.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {relatedConcerns.map((concern) => (
                  <Link key={concern.slug} href={`/concerns/${concern.slug}`} className="filter-chip gap-2">
                    <span aria-hidden="true">{concern.icon}</span>
                    {concern.title}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col justify-center bg-[#FAF8F3] p-6 sm:p-10 lg:p-12">
            <p className="page-eyebrow">브랜드가 지키는 생각</p>
            <p className="mt-5 whitespace-pre-line break-keep text-[15px] leading-8 text-[#6F766F] sm:text-base">
              {brand.philosophy}
            </p>
          </div>
        </section>

        <BrandAuditReport brand={brand} />

        <BrandProductsClient 
          brand={brand} 
          initialProducts={brandProducts} 
          shortBrandName={shortBrandName} 
        />

          <section>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeading
                eyebrow="반려가족 이야기"
                title="함께 써본 시간을 들려주세요."
                description="제품을 고르는 다음 반려가족에게 실제 사용 경험은 따뜻하고 든든한 안내가 됩니다."
              />
              <Link href="/reviews" className="btn-secondary shrink-0 self-start sm:self-auto">
                모든 후기 보기
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>

            {brandReviews.length > 0 ? (
              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {brandReviews.slice(0, 4).map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    productName={brandProducts.find((product) => product.id === review.productId)?.name}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-3xl border border-dashed border-[#D8C4A3] bg-white px-6 py-12 text-center sm:py-16">
                <p className="break-keep text-base font-semibold text-[#17211D]">아직 도착한 후기가 없어요.</p>
                <p className="mt-2 break-keep text-sm leading-6 text-[#6F766F]">반려가족의 첫 이야기를 기다리고 있을게요.</p>
              </div>
            )}
          </section>

      </div>
    </div>
  );
}
