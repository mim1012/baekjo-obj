import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Leaf, Heart, MessageSquare } from 'lucide-react';
import ProductCard from '@/components/common/ProductCard';
import ReviewCard from '@/components/common/ReviewCard';
import { getBrandDisplayLogo } from '@/components/common/BrandLogo';
import AuditAccordion from '@/components/common/AuditAccordion';
import { getBrandById } from '@/lib/brands/repo';
import { listProductsByBrand } from '@/lib/products/repo';
import { getConcernsConfigWithFallback } from '@/lib/concerns/repo';
import { reviews } from '@/data/reviews';

// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export default async function BrandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const brand = await getBrandById(id);

  if (!brand) {
    notFound();
  }

  const shortBrandName = brand.name.replace(/\s*\(.*?\)/, '').trim();
  const brandProducts = await listProductsByBrand(brand.id);
  const representativeProducts = brandProducts.filter((product) =>
    brand.representativeProductIds.includes(product.id),
  );
  
  // Use all brand products for the representative section if representativeProducts is empty
  const displayProducts = representativeProducts.length > 0 ? representativeProducts : brandProducts;

  const { items: concerns } = await getConcernsConfigWithFallback();
  const relatedConcerns = concerns.filter((concern) =>
    brand.relatedConcernSlugs.includes(concern.slug),
  );
  const brandReviews = reviews.filter((review) =>
    brandProducts.some((product) => product.id === review.productId),
  );
  const hasPublishedAudit = Boolean(brand.auditReport);
  
  const auditStatusText = hasPublishedAudit ? (brand.auditReport?.status || 'Audit 통과') : '입점 자료 확인 중';
  const categoryNames = [...new Set(brandProducts.map(p => p.categoryName || p.category).filter(Boolean))].join(' · ');

  return (
    <main className="bg-[#F8F6F0] pb-24 md:pb-14">
      {/* 1. 브랜드 상세 히어로 */}
      <section className="pt-6 pb-8 md:pt-8 md:pb-10">
        <div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-8 px-5 md:flex-row md:px-6 lg:gap-12 lg:px-8">
          {/* 좌측 브랜드 정보 */}
          <div className="flex w-full flex-1 flex-col md:w-[46%]">
            <Link
              href="/brands"
              className="mb-4 inline-flex items-center gap-2 text-[12px] font-semibold text-[#6F756F] transition-colors hover:text-[#17251F] md:mb-5 md:text-[13px]"
            >
              <ArrowLeft className="w-4 h-4" />
              모든 브랜드 보기
            </Link>
            
            <div className="mb-3 inline-flex h-[30px] self-start items-center justify-center rounded-full border border-[#E2DACD] bg-[#FFFEFB] px-3 text-[11px] font-semibold text-[#6F756F] md:mb-4 md:h-[32px] md:text-[12px]">
              {auditStatusText}
            </div>

            <h1 className="break-keep text-[28px] font-bold leading-[1.18] tracking-[-0.03em] text-[#17251F] sm:text-[32px] md:text-[36px] lg:text-[40px]">
              {brand.name}
            </h1>
            
            <p className="mt-3 max-w-[440px] break-keep text-[14px] leading-[1.75] text-[#6F756F] md:mt-4 md:text-[15px]">
              {brand.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {relatedConcerns.map((concern) => (
                <span key={concern.slug} className="inline-flex h-[28px] items-center justify-center rounded-full bg-[#F1EDE5] px-3 text-[11px] font-medium text-[#17251F] md:h-[30px] md:text-[12px]">
                  {concern.title}
                </span>
              ))}
              <span className="inline-flex h-[28px] items-center justify-center rounded-full bg-[#F1EDE5] px-3 text-[11px] font-medium text-[#17251F] md:h-[30px] md:text-[12px]">
                상품 {brandProducts.length}개
              </span>
            </div>
          </div>

          {/* 우측 브랜드 비주얼 */}
          <div className="w-full flex-1 md:w-[54%]">
            <div className="relative aspect-[16/10] w-full max-h-[280px] overflow-hidden rounded-[20px] bg-[#F1EDE5] md:max-h-[320px]">
               {displayProducts[0] ? (
                 <Image src={displayProducts[0].image} alt={displayProducts[0].name} fill className="object-contain p-4 mix-blend-multiply md:p-6" sizes="(max-width: 768px) 100vw, 54vw" priority />
               ) : (
                 <Image src={getBrandDisplayLogo(brand)} alt={brand.name} fill className="object-contain p-12 mix-blend-multiply" sizes="(max-width: 768px) 100vw, 57vw" priority />
               )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. 핵심 정보 요약 바 */}
      <section className="mb-8 md:mb-10">
        <div className="mx-auto w-full max-w-[1120px] px-5 md:px-6 lg:px-8">
          <div className="rounded-[18px] border border-[#E2DACD] bg-[#FFFEFB] p-4 shadow-[0_4px_24px_rgba(23,37,31,0.03)] md:p-0">
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 divide-y md:grid-cols-2 md:divide-y-0">
              {/* 카테고리 */}
              <div className="flex flex-col items-start gap-3 p-0 sm:flex-row sm:gap-4 md:p-5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#E2DACD] bg-[#F8F6F0] text-[#B58A4C] md:h-11 md:w-11">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[12px] md:text-[13px] font-bold text-[#6F756F] mb-1">카테고리</div>
                  <div className="text-[14px] md:text-[15px] font-bold text-[#17251F] mb-2">{categoryNames || '종합 케어'}</div>
                  <div className="text-[12px] text-[#6F756F] leading-[1.5] break-keep">아이의 건강한 습관을 돕는 제품을 소개합니다.</div>
                </div>
              </div>
              
              {/* 관련 고민 */}
              <div className="flex flex-col items-start gap-3 p-0 sm:flex-row sm:gap-4 md:p-5">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-[#E2DACD] bg-[#F8F6F0] text-[#17251F] md:h-11 md:w-11">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[12px] md:text-[13px] font-bold text-[#6F756F] mb-1">관련 고민</div>
                  <div className="text-[14px] md:text-[15px] font-bold text-[#17251F] mb-2">{relatedConcerns.map(c => c.title).join(' · ') || '전반적 관리'}</div>
                  <div className="text-[12px] text-[#6F756F] leading-[1.5] break-keep">전반적인 컨디션을 세심하게 케어합니다.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 스토리 & Audit 통합 패널 */}
      <section className="mb-10 md:mb-12">
        <div className="mx-auto w-full max-w-[1120px] px-5 md:px-6 lg:px-8">
           <div className="flex flex-col overflow-hidden rounded-[20px] border border-[#E2DACD] bg-[#FFFEFB] shadow-[0_4px_24px_rgba(23,37,31,0.03)] lg:flex-row">
             
             {/* 스토리 */}
             <div className="flex-1 border-b border-[#E2DACD] p-5 md:p-6 lg:w-[48%] lg:border-r lg:border-b-0 lg:p-8">
               <div className="text-[11px] md:text-[12px] font-bold text-[#6F756F] tracking-wide mb-3">BRAND STORY</div>
               <h2 className="mb-3 break-keep text-[18px] font-bold leading-[1.3] tracking-tight text-[#17251F] md:text-[20px]">
                 {brand.name}의 브랜드 철학
               </h2>
               <p className="mb-6 whitespace-pre-line break-keep text-[13px] leading-[1.75] text-[#6F756F] md:text-[14px]">
                 {brand.philosophy || brand.description}
               </p>
               
               <div className="flex flex-wrap gap-2">
                 <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E2DACD] bg-[#F8F6F0] text-[12px] text-[#6F756F]">
                    <Check className="w-3.5 h-3.5 text-[#B58A4C]" /> 꼼꼼한 원료 선별
                 </div>
                 <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E2DACD] bg-[#F8F6F0] text-[12px] text-[#6F756F]">
                    <Check className="w-3.5 h-3.5 text-[#B58A4C]" /> 안전한 제조 공정
                 </div>
                 <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E2DACD] bg-[#F8F6F0] text-[12px] text-[#6F756F]">
                    <Check className="w-3.5 h-3.5 text-[#B58A4C]" /> 반려가족 중심 설계
                 </div>
               </div>
             </div>

             {/* Audit */}
             <div className="flex-1 lg:w-[52%]">
                <AuditAccordion
                  title="백조오브제 검토 상태"
                  subtitle="BAEKJO AUDIT"
                  statusLabel={auditStatusText}
                  theme="light"
                  density="compact"
                >
                  <p className="mb-4 break-keep text-[13px] leading-[1.7] text-[#6F756F] md:text-[14px]">
                    {hasPublishedAudit ? '아래 항목을 중심으로 꼼꼼히 확인하고 통과했습니다.' : '아래 항목을 중심으로 꼼꼼히 확인하고 있습니다.'}
                  </p>

                  <div className="mb-6 grid grid-cols-1 gap-x-4 gap-y-2.5 sm:grid-cols-2">
                    {brand.auditPoints?.length > 0 ? (
                      brand.auditPoints.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-[13px] md:text-[14px] text-[#17251F]">
                          <Check className="w-4 h-4 mt-0.5 text-[#B58A4C] shrink-0" />
                          <span className="break-keep">{point}</span>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-[13px] md:text-[14px] text-[#17251F]"><Check className="w-4 h-4 text-[#B58A4C] shrink-0" /> 공식 운영 주체 정보</div>
                        <div className="flex items-center gap-2 text-[13px] md:text-[14px] text-[#17251F]"><Check className="w-4 h-4 text-[#B58A4C] shrink-0" /> 제품 기능 및 안전성</div>
                        <div className="flex items-center gap-2 text-[13px] md:text-[14px] text-[#17251F]"><Check className="w-4 h-4 text-[#B58A4C] shrink-0" /> 성분 및 원료 안정성</div>
                        <div className="flex items-center gap-2 text-[13px] md:text-[14px] text-[#17251F]"><Check className="w-4 h-4 text-[#B58A4C] shrink-0" /> 품질 및 사용성 검토</div>
                        <div className="flex items-center gap-2 text-[13px] md:text-[14px] text-[#17251F]"><Check className="w-4 h-4 text-[#B58A4C] shrink-0" /> 제조 및 품질 관리</div>
                        <div className="flex items-center gap-2 text-[13px] md:text-[14px] text-[#17251F]"><Check className="w-4 h-4 text-[#B58A4C] shrink-0" /> 보호자 가치 및 경험</div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <Link href="/audit" className="text-[13px] font-bold text-[#17251F] hover:text-[#6F756F] flex items-center gap-1 transition-colors">
                      검증 기준 자세히 보기 <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    {hasPublishedAudit && brand.auditReport && (
                      <button className="text-[13px] font-bold text-[#17251F] hover:text-[#6F756F] flex items-center gap-1 transition-colors">
                        브랜드 자료 더 보기 <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </AuditAccordion>
             </div>

           </div>
        </div>
      </section>

      {/* 4. 대표 상품 */}
      <section className="mb-10 md:mb-12">
        <div className="mx-auto w-full max-w-[1120px] px-5 md:px-6 lg:px-8">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end md:mb-6">
             <div>
               <h2 className="mb-1 break-keep text-[18px] font-bold leading-[1.3] text-[#17251F] md:text-[21px]">이 브랜드에서 먼저 보여드리고 싶은 것들</h2>
               <p className="text-[13px] leading-[1.7] text-[#6F756F] md:text-[14px]">{shortBrandName}의 대표 제품을 소개합니다.</p>
             </div>
             {brandProducts.length > 0 && (
               <Link href={`/shop?brandId=${brand.id}`} className="inline-flex items-center justify-center h-[36px] md:h-[40px] px-4 md:px-5 bg-[#FFFEFB] border border-[#E2DACD] rounded-full text-[13px] font-semibold text-[#17251F] transition-colors hover:bg-[#F8F6F0]">
                 전체 상품 보기 <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
               </Link>
             )}
          </div>

          {displayProducts.length > 0 ? (
            <div className={`grid gap-3 md:gap-5 ${
              displayProducts.length >= 4 ? 'md:grid-cols-3 lg:grid-cols-4' :
              displayProducts.length === 3 ? 'md:max-w-[1040px] md:grid-cols-3' :
              displayProducts.length === 2 ? 'md:max-w-[660px] md:grid-cols-2' :
              'md:max-w-[320px] md:grid-cols-1'
            }`}>
              {displayProducts.map((product) => (
                <div key={product.id} className="w-full md:w-auto md:min-w-0">
                   <ProductCard product={product} density="compact" mobileLayout="horizontal" />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[20px] border border-dashed border-[#E2DACD] bg-[#FFFEFB] px-6 py-12 md:py-16 text-center">
              <p className="text-[15px] md:text-[16px] font-semibold text-[#17251F]">먼저 소개할 상품을 고르고 있어요.</p>
              <p className="mt-2 text-[13px] md:text-[14px] text-[#6F756F]">상품 정보가 준비되는 대로 차근차근 채워둘게요.</p>
            </div>
          )}
        </div>
      </section>

      {/* 5. 반려가족 후기 */}
      <section className="mb-10 md:mb-12">
        <div className="mx-auto w-full max-w-[1120px] px-5 md:px-6 lg:px-8">
          <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end md:mb-6">
             <div>
               <h2 className="mb-1 text-[18px] font-bold text-[#17251F] md:text-[21px]">반려가족 후기</h2>
               <p className="break-keep text-[13px] leading-[1.7] text-[#6F756F] md:text-[14px]">{shortBrandName}을 사용한 보호자들의 솔직한 후기를 확인해보세요.</p>
             </div>
             {brandReviews.length > 0 && (
               <Link href="/reviews" className="inline-flex items-center justify-center h-[36px] md:h-[40px] px-4 md:px-5 bg-[#FFFEFB] border border-[#E2DACD] rounded-full text-[13px] font-semibold text-[#17251F] transition-colors hover:bg-[#F8F6F0]">
                 전체 후기 보기 <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
               </Link>
             )}
          </div>

          {brandReviews.length > 0 ? (
            <div className="horizontal-snap-rail pb-4">
              {brandReviews.map((review) => (
                <div key={review.id} className="horizontal-snap-item md:basis-[calc(50%-0.5rem)] lg:basis-[calc(33.333%-0.667rem)]">
                  <ReviewCard
                    review={review}
                    productName={brandProducts.find((product) => product.id === review.productId)?.name}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex min-h-[120px] flex-col items-center justify-center rounded-[16px] border border-[#E2DACD] bg-[#FFFEFB] px-6 py-6 text-center md:min-h-[136px]">
              <MessageSquare className="w-8 h-8 text-[#D8C4A3] mb-3 opacity-60" />
              <p className="text-[14px] md:text-[15px] font-semibold text-[#17251F]">아직 도착한 후기가 없어요.</p>
              <p className="mt-1 text-[12px] md:text-[13px] text-[#6F756F]">이 브랜드의 첫 번째 후기를 남겨주세요.</p>
            </div>
          )}
        </div>
      </section>

      {/* 6. 다른 검증 브랜드 탐색 CTA */}
      <section className="mb-0">
         <div className="mx-auto w-full max-w-[1120px] px-5 md:px-6 lg:px-8">
            <div className="relative flex h-[168px] w-full flex-col items-center overflow-hidden rounded-[20px] border border-[#E2DACD] bg-[#F1EDE5] md:h-[176px] md:flex-row">
               
               {/* 텍스트 영역 */}
               <div className="z-10 flex flex-1 flex-col justify-center p-5 md:w-[55%] md:p-8">
                  <h2 className="mb-2 break-keep text-[18px] font-bold tracking-tight text-[#17251F] md:text-[21px]">
                    다른 검증 브랜드도 살펴보세요.
                  </h2>
                  <p className="mb-4 break-keep text-[13px] leading-[1.7] text-[#6F756F] md:text-[14px]">
                    백조오브제가 까다롭게 검토한 다양한 브랜드를 만나보세요.
                  </p>
                  <Link href="/brands" className="inline-flex h-[38px] self-start items-center justify-center rounded-md bg-[#16382D] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#10291F]">
                    전체 브랜드 보기 <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
               </div>

               {/* 비주얼 영역 (식물/화분 패턴 대신 브랜드관 히어로 이미지의 일부 사용) */}
               <div className="absolute right-0 bottom-0 top-0 w-[45%] hidden md:block opacity-70">
                  <Image src="/images/brand-curation-hero.webp" alt="Background pattern" fill className="object-cover object-left-bottom" />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#F1EDE5] to-transparent"></div>
               </div>
            </div>
         </div>
      </section>
    </main>
  );
}
