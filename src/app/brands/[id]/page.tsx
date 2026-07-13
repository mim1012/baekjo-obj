import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, ShieldCheck, Check, Box, Leaf, Heart, MessageSquare } from 'lucide-react';
import ProductCard from '@/components/common/ProductCard';
import ReviewCard from '@/components/common/ReviewCard';
import { getBrandById } from '@/lib/brands/repo';
import { listProductsByBrand } from '@/lib/products/repo';
import { concerns } from '@/data/concerns';
import { reviews } from '@/data/reviews';

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
    <main className="bg-[#F8F6F0] pb-12 md:pb-20">
      {/* 1. 브랜드 상세 히어로 */}
      <section className="pt-8 md:pt-12 pb-10 md:pb-14">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12 flex flex-col md:flex-row items-center gap-10 lg:gap-16">
          {/* 좌측 브랜드 정보 */}
          <div className="flex-1 w-full md:w-[43%] flex flex-col">
            <Link
              href="/brands"
              className="inline-flex items-center gap-2 text-[13px] md:text-[14px] font-semibold text-[#6F756F] transition-colors hover:text-[#17251F] mb-6 md:mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              모든 브랜드 보기
            </Link>
            
            <div className="inline-flex self-start items-center justify-center h-[32px] md:h-[36px] px-3 md:px-4 bg-[#FFFEFB] border border-[#E2DACD] rounded-full text-[12px] md:text-[13px] font-semibold text-[#6F756F] mb-4 md:mb-5">
              {auditStatusText}
            </div>

            <h1 className="text-[32px] sm:text-[38px] md:text-[44px] lg:text-[52px] font-bold leading-[1.14] tracking-[-0.035em] text-[#17251F] break-keep">
              {brand.name}
            </h1>
            
            <p className="mt-4 md:mt-5 text-[15px] md:text-[16px] leading-[1.65] text-[#6F756F] break-keep max-w-[480px]">
              {brand.description}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {relatedConcerns.map((concern) => (
                <span key={concern.slug} className="inline-flex items-center justify-center h-[30px] md:h-[34px] px-3 bg-[#F1EDE5] rounded-full text-[12px] md:text-[13px] font-medium text-[#17251F]">
                  {concern.title}
                </span>
              ))}
              <span className="inline-flex items-center justify-center h-[30px] md:h-[34px] px-3 bg-[#F1EDE5] rounded-full text-[12px] md:text-[13px] font-medium text-[#17251F]">
                상품 {brandProducts.length}개
              </span>
            </div>
          </div>

          {/* 우측 브랜드 비주얼 */}
          <div className="flex-1 w-full md:w-[57%]">
            <div className="relative w-full aspect-[4/3] max-h-[360px] md:max-h-[400px] rounded-[24px] overflow-hidden bg-[#F1EDE5]">
               {displayProducts[0] ? (
                 <Image src={displayProducts[0].image} alt={displayProducts[0].name} fill className="object-cover md:object-contain mix-blend-multiply p-0 md:p-8" sizes="(max-width: 768px) 100vw, 57vw" priority />
               ) : (
                 <Image src={brand.logo} alt={brand.name} fill className="object-contain p-12 mix-blend-multiply" sizes="(max-width: 768px) 100vw, 57vw" priority />
               )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. 핵심 정보 요약 바 */}
      <section className="mb-8 md:mb-12">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="bg-[#FFFEFB] rounded-[20px] shadow-[0_4px_24px_rgba(23,37,31,0.03)] border border-[#E2DACD] p-5 md:p-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E2DACD]">
              {/* 카테고리 */}
              <div className="flex items-start gap-4 p-4 md:p-6 lg:p-7">
                <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#F8F6F0] border border-[#E2DACD] flex items-center justify-center text-[#B58A4C]">
                  <Leaf className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[12px] md:text-[13px] font-bold text-[#6F756F] mb-1">카테고리</div>
                  <div className="text-[14px] md:text-[15px] font-bold text-[#17251F] mb-2">{categoryNames || '종합 케어'}</div>
                  <div className="text-[12px] text-[#6F756F] leading-[1.5] break-keep">아이의 건강한 습관을 돕는 제품을 소개합니다.</div>
                </div>
              </div>
              
              {/* 관련 고민 */}
              <div className="flex items-start gap-4 p-4 md:p-6 lg:p-7">
                <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#F8F6F0] border border-[#E2DACD] flex items-center justify-center text-[#17251F]">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[12px] md:text-[13px] font-bold text-[#6F756F] mb-1">관련 고민</div>
                  <div className="text-[14px] md:text-[15px] font-bold text-[#17251F] mb-2">{relatedConcerns.map(c => c.title).join(' · ') || '전반적 관리'}</div>
                  <div className="text-[12px] text-[#6F756F] leading-[1.5] break-keep">전반적인 컨디션을 세심하게 케어합니다.</div>
                </div>
              </div>

              {/* 등록 상품 */}
              <div className="flex items-start gap-4 p-4 md:p-6 lg:p-7">
                <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#F8F6F0] border border-[#E2DACD] flex items-center justify-center text-[#17251F]">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[12px] md:text-[13px] font-bold text-[#6F756F] mb-1">등록 상품</div>
                  <div className="text-[14px] md:text-[15px] font-bold text-[#17251F] mb-2">{brandProducts.length}개</div>
                  <div className="text-[12px] text-[#6F756F] leading-[1.5] break-keep">오직 백조오브제에서 만날 수 있는 브랜드입니다.</div>
                </div>
              </div>

              {/* 검토 상태 */}
              <div className="flex items-start gap-4 p-4 md:p-6 lg:p-7">
                <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#F8F6F0] border border-[#E2DACD] flex items-center justify-center text-[#17251F]">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[12px] md:text-[13px] font-bold text-[#6F756F] mb-1">백조오브제 검토 상태</div>
                  <div className="text-[14px] md:text-[15px] font-bold text-[#17251F] mb-2">{auditStatusText}</div>
                  <div className="text-[12px] text-[#6F756F] leading-[1.5] break-keep">신뢰할 수 있는 브랜드만 소개하기 위해 검토 중입니다.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. 스토리 & Audit 통합 패널 */}
      <section className="mb-12 md:mb-16">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
           <div className="bg-[#FFFEFB] rounded-[20px] md:rounded-[24px] border border-[#E2DACD] flex flex-col lg:flex-row overflow-hidden shadow-[0_4px_24px_rgba(23,37,31,0.03)]">
             
             {/* 스토리 */}
             <div className="flex-1 lg:w-[48%] p-6 md:p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-[#E2DACD]">
               <div className="text-[11px] md:text-[12px] font-bold text-[#6F756F] tracking-wide mb-3">BRAND STORY</div>
               <h2 className="text-[20px] md:text-[24px] font-bold text-[#17251F] leading-[1.3] tracking-tight mb-4 break-keep">
                 {brand.name}의 브랜드 철학
               </h2>
               <p className="text-[14px] md:text-[15px] text-[#6F756F] leading-[1.7] whitespace-pre-line break-keep mb-8">
                 {brand.philosophy || brand.description}
               </p>
               
               <div className="flex flex-wrap gap-3">
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
             <div className="flex-1 lg:w-[52%] p-6 md:p-8 lg:p-10 bg-[#FFFEFB]">
                <div className="text-[11px] md:text-[12px] font-bold text-[#6F756F] tracking-wide mb-3">BAEKJO AUDIT</div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                  <h2 className="text-[20px] md:text-[24px] font-bold text-[#17251F] leading-[1.3] tracking-tight">
                    백조오브제 검토 상태
                  </h2>
                  <span className="inline-flex items-center justify-center h-[28px] px-3 bg-[#F8F6F0] border border-[#E2DACD] rounded-full text-[12px] font-semibold text-[#6F756F]">
                    {auditStatusText}
                  </span>
                </div>
                
                <p className="text-[13px] md:text-[14px] text-[#6F756F] mb-6 break-keep">
                  {hasPublishedAudit ? '아래 항목을 중심으로 꼼꼼히 확인하고 통과했습니다.' : '아래 항목을 중심으로 꼼꼼히 확인하고 있습니다.'}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 mb-8">
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

                <div className="flex items-center gap-6">
                  <Link href="/notices" className="text-[13px] font-bold text-[#17251F] hover:text-[#6F756F] flex items-center gap-1 transition-colors">
                    감사 기준 자세히 보기 <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  {hasPublishedAudit && brand.auditReport && (
                    <button className="text-[13px] font-bold text-[#17251F] hover:text-[#6F756F] flex items-center gap-1 transition-colors">
                      브랜드 자료 더 보기 <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
             </div>

           </div>
        </div>
      </section>

      {/* 4. 대표 상품 */}
      <section className="mb-12 md:mb-16">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 md:mb-8">
             <div>
               <h2 className="text-[20px] md:text-[24px] font-bold text-[#17251F] mb-1">이 브랜드에서 먼저 보여드리고 싶은 것들</h2>
               <p className="text-[14px] text-[#6F756F]">{shortBrandName}의 대표 제품을 소개합니다.</p>
             </div>
             {brandProducts.length > 0 && (
               <Link href={`/shop?brandId=${brand.id}`} className="inline-flex items-center justify-center h-[36px] md:h-[40px] px-4 md:px-5 bg-[#FFFEFB] border border-[#E2DACD] rounded-full text-[13px] font-semibold text-[#17251F] transition-colors hover:bg-[#F8F6F0]">
                 전체 상품 보기 <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
               </Link>
             )}
          </div>

          {displayProducts.length > 0 ? (
            <div className={`grid gap-4 md:gap-6 ${
              displayProducts.length >= 4 ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 
              displayProducts.length === 3 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 
              displayProducts.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 
              'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            }`}>
              {displayProducts.map((product) => (
                <div key={product.id} className={displayProducts.length === 2 ? "w-full" : ""}>
                   <ProductCard product={product} />
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
      <section className="mb-12 md:mb-16">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 md:mb-8">
             <div>
               <h2 className="text-[20px] md:text-[24px] font-bold text-[#17251F] mb-1">반려가족 후기</h2>
               <p className="text-[14px] text-[#6F756F]">{shortBrandName}을 사용한 보호자들의 솔직한 후기를 확인해보세요.</p>
             </div>
             {brandReviews.length > 0 && (
               <Link href="/reviews" className="inline-flex items-center justify-center h-[36px] md:h-[40px] px-4 md:px-5 bg-[#FFFEFB] border border-[#E2DACD] rounded-full text-[13px] font-semibold text-[#17251F] transition-colors hover:bg-[#F8F6F0]">
                 전체 후기 보기 <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
               </Link>
             )}
          </div>

          {brandReviews.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {brandReviews.slice(0, 3).map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  productName={brandProducts.find((product) => product.id === review.productId)?.name}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-[16px] border border-[#E2DACD] bg-[#FFFEFB] px-6 py-8 flex flex-col items-center justify-center min-h-[140px] md:min-h-[160px] text-center">
              <MessageSquare className="w-8 h-8 text-[#D8C4A3] mb-3 opacity-60" />
              <p className="text-[14px] md:text-[15px] font-semibold text-[#17251F]">아직 도착한 후기가 없어요.</p>
              <p className="mt-1 text-[12px] md:text-[13px] text-[#6F756F]">이 브랜드의 첫 번째 후기를 남겨주세요.</p>
            </div>
          )}
        </div>
      </section>

      {/* 6. 다른 검증 브랜드 탐색 CTA */}
      <section className="mb-0">
         <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
            <div className="relative w-full h-[180px] md:h-[200px] bg-[#F1EDE5] rounded-[20px] md:rounded-[22px] border border-[#E2DACD] overflow-hidden flex flex-col md:flex-row items-center">
               
               {/* 텍스트 영역 */}
               <div className="flex-1 md:w-[55%] z-10 p-6 md:p-10 flex flex-col justify-center">
                  <h2 className="text-[20px] md:text-[24px] font-bold text-[#17251F] mb-2 tracking-tight break-keep">
                    다른 검증 브랜드도 살펴보세요.
                  </h2>
                  <p className="text-[13px] md:text-[14px] text-[#6F756F] mb-6 break-keep">
                    백조오브제가 까다롭게 검토한 다양한 브랜드를 만나보세요.
                  </p>
                  <Link href="/brands" className="self-start inline-flex items-center justify-center h-[42px] px-6 bg-[#16382D] text-white text-[13px] md:text-[14px] font-semibold rounded-md transition-colors hover:bg-[#10291F]">
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
