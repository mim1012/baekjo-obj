import { reviews } from '@/data/reviews';
import { listProducts } from '@/lib/products/repo';
import ReviewCard from '@/components/common/ReviewCard';
import EmptyState from '@/components/common/EmptyState';
import { Star, Camera, MessageSquare, ArrowRight, ChevronRight, ChevronLeft, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: '리얼 후기 | 백조오브제',
  description: '백조오브제와 함께하는 반려가족의 생생한 이야기를 확인하세요.',
};

export const dynamic = 'force-dynamic';

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sort?: string }>;
}) {
  const { filter = 'all', sort = 'recent' } = await searchParams;
  const products = await listProducts();
  
  const filteredReviews = reviews.filter((review) => {
    if (filter === 'photo') return review.isPhotoReview;
    if (filter === 'all') return true;
    return products.find((product) => product.id === review.productId)?.concernTags.includes(filter);
  }).sort((a, b) => {
    if (sort === 'rating') return b.rating - a.rating;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  
  const avgRating = (reviews.reduce((acc, cur) => acc + cur.rating, 0) / reviews.length).toFixed(1);
  const photoReviewsCount = reviews.filter(r => r.isPhotoReview).length;
  
  // 사진 후기 모아보기 용도 (최근 6개)
  const recentPhotoReviews = [...reviews].filter(r => r.isPhotoReview).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 6);

  return (
    <div className="bg-[#FAF9F5] min-h-dvh pb-24 text-[#1A1D1B]" style={{ wordBreak: 'keep-all' }}>
      {/* 1. 인트로 (박스 없음) */}
      <section className="pt-16 pb-10">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12 flex flex-col md:flex-row items-start md:items-center justify-between">
          <div>
            <p className="font-editorial text-[12px] tracking-widest text-[#A8742E] font-semibold uppercase mb-4">
              Family Stories
            </p>
            <h1 className="text-[34px] md:text-[42px] font-bold text-[#1A1D1B] leading-[1.25] tracking-[-0.035em] break-keep mb-4">
              반려가족의 리얼 후기
            </h1>
            <p className="text-[14px] md:text-[15px] text-[#5F6761] leading-[1.65]">
              백조오브제와 함께한 우리 아이들의 이야기를 확인하세요.
            </p>
          </div>
          <div className="mt-6 md:mt-0">
             <Link href="/mypage/reviews/write" className="flex items-center justify-center rounded-full bg-[#1A1D1B] px-6 py-3 text-[14px] font-bold text-white transition-colors hover:bg-black shadow-lg">
                후기 작성하기
                <ArrowRight className="ml-2 size-4" />
             </Link>
          </div>
        </div>
      </section>

      {/* 2. 대시보드 통계 */}
      <section className="mb-12">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          <div className="flex flex-col md:flex-row bg-white rounded-[24px] border border-[#EBE8E1] py-8 shadow-sm">
             {/* 전체 리뷰 수 */}
             <div className="flex-1 flex flex-row md:flex-col items-center justify-between md:justify-center px-8 border-b md:border-b-0 md:border-r border-[#EBE8E1] pb-6 md:pb-0">
                <div className="flex flex-col md:items-center md:text-center order-2 md:order-1">
                   <p className="text-[12px] font-semibold text-[#5F6761] uppercase tracking-wider mb-2">Total Reviews</p>
                   <div className="flex items-baseline gap-1">
                      <span className="text-[32px] md:text-[38px] font-bold text-[#1A1D1B]">{reviews.length.toLocaleString()}</span>
                      <span className="text-[16px] text-[#1A1D1B] font-bold">개</span>
                   </div>
                </div>
                <div className="order-1 md:order-2 flex size-[48px] items-center justify-center rounded-full bg-[#FAF9F5] border border-[#F4F2EC] md:mt-4">
                   <MessageSquare className="size-5 text-[#A8742E]" />
                </div>
             </div>

             {/* 평균 평점 */}
             <div className="flex-1 flex flex-row md:flex-col items-center justify-between md:justify-center px-8 border-b md:border-b-0 md:border-r border-[#EBE8E1] py-6 md:py-0">
                <div className="flex flex-col md:items-center md:text-center order-2 md:order-1">
                   <p className="text-[12px] font-semibold text-[#5F6761] uppercase tracking-wider mb-2">Average Rating</p>
                   <div className="flex items-center gap-2">
                      <Star className="size-7 text-[#A8742E] fill-[#A8742E]" />
                      <span className="text-[32px] md:text-[38px] font-bold text-[#1A1D1B]">{avgRating}</span>
                      <span className="text-[16px] text-[#5F6761] font-semibold mt-2">/ 5</span>
                   </div>
                </div>
             </div>

             {/* 포토 리뷰 수 */}
             <div className="flex-1 flex flex-row md:flex-col items-center justify-between md:justify-center px-8 pt-6 md:pt-0">
                <div className="flex flex-col md:items-center md:text-center order-2 md:order-1">
                   <p className="text-[12px] font-semibold text-[#5F6761] uppercase tracking-wider mb-2">Photo Reviews</p>
                   <div className="flex items-baseline gap-1">
                      <span className="text-[32px] md:text-[38px] font-bold text-[#1A1D1B]">{photoReviewsCount.toLocaleString()}</span>
                      <span className="text-[16px] text-[#1A1D1B] font-bold">개</span>
                   </div>
                </div>
                <div className="order-1 md:order-2 flex size-[48px] items-center justify-center rounded-full bg-[#FAF9F5] border border-[#F4F2EC] md:mt-4">
                   <Camera className="size-5 text-[#A8742E]" />
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* 3. 리스트 필터 및 정렬 */}
      <section className="mb-8">
         <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 scrollbar-hide">
               {[
                 ['all', '전체'],
                 ['photo', '사진 후기'],
                 ['tear', '눈물'],
                 ['skin', '피부'],
                 ['joint', '관절'],
                 ['picky', '편식'],
                 ['senior', '노령'],
               ].map(([id, label]) => {
                 const isSelected = filter === id;
                 return (
                    <Link 
                       key={id} 
                       href={id === 'all' ? '/reviews' : `/reviews?filter=${id}`}
                       scroll={false}
                       className={`shrink-0 flex items-center h-[36px] px-5 rounded-full text-[14px] font-medium transition-colors ${isSelected ? 'bg-[#1A1D1B] text-white border border-[#1A1D1B]' : 'bg-white border border-[#EBE8E1] text-[#5F6761] hover:text-[#1A1D1B] hover:border-[#D8D6CE]'}`}
                    >
                       {label}
                    </Link>
                 );
               })}
            </div>
            
            <div className="flex items-center gap-6 self-end md:self-auto text-[14px]">
               <Link href={`/reviews?filter=${filter}&sort=${sort === 'recent' ? 'rating' : 'recent'}`} className="flex items-center gap-1 text-[#5F6761] font-medium hover:text-[#1A1D1B]">
                  {sort === 'recent' ? '최신순' : '평점순'} <ChevronDown className="size-4" />
               </Link>
               <Link href={filter === 'photo' ? '/reviews' : '/reviews?filter=photo'} className="flex items-center gap-2 cursor-pointer text-[#5F6761] font-medium hover:text-[#1A1D1B]">
                  <div className={`w-4 h-4 rounded border ${filter === 'photo' ? 'border-[#1A1D1B] bg-[#1A1D1B]' : 'border-[#D8D6CE] bg-white'} flex items-center justify-center transition-colors`}>
                     {filter === 'photo' && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  사진 후기만 보기
               </Link>
            </div>
         </div>
      </section>

      {/* 4. 사진 후기 모아보기 */}
      {recentPhotoReviews.length > 0 && filter === 'all' && (
        <section className="mb-10">
          <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
            <h2 className="text-[18px] font-bold text-[#1A1D1B] mb-5">사진 후기 모아보기</h2>
            <div className="relative group">
              <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4">
                {recentPhotoReviews.map((item) => (
                  <div key={item.id} className="relative w-[140px] md:w-[160px] lg:w-[180px] aspect-square shrink-0 snap-start rounded-[16px] overflow-hidden border border-[#EBE8E1] cursor-pointer bg-white">
                    {item.image && (
                      <Image src={item.image} alt={`리뷰 사진 ${item.id}`} fill className="object-cover transition-transform duration-500 hover:scale-105" />
                    )}
                  </div>
                ))}
              </div>
              {/* 스크롤 버튼 (데스크탑) */}
              <button className="hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 size-10 items-center justify-center rounded-full bg-white/90 shadow-md border border-[#EBE8E1] text-[#1A1D1B] opacity-0 group-hover:opacity-100 transition-opacity">
                 <ChevronRight className="size-5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* 5. 리뷰 리스트 */}
      <section className="mb-16">
        <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
          {filteredReviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredReviews.map(review => {
                const product = products.find(p => p.id === review.productId);
                return (
                  <ReviewCard key={review.id} review={review} productName={product?.name} />
                );
              })}
            </div>
          ) : (
            <EmptyState title="후기가 없습니다." description="아직 등록된 후기가 없습니다." />
          )}

          {/* 페이지네이션 */}
          {filteredReviews.length > 0 && (
            <div className="mt-12 flex justify-center items-center gap-1">
              <button className="flex size-8 items-center justify-center rounded border border-[#EBE8E1] text-[#8C938F] hover:text-[#1A1D1B]">
                <ChevronLeft className="size-4" />
              </button>
              {[1, 2, 3, 4, 5].map((page) => (
                <button key={page} className={`flex size-8 items-center justify-center rounded text-[14px] font-medium transition-colors ${page === 1 ? 'bg-[#1A1D1B] text-white' : 'text-[#5F6761] hover:text-[#1A1D1B]'}`}>
                  {page}
                </button>
              ))}
              <span className="flex size-8 items-center justify-center text-[#8C938F]">...</span>
              <button className="flex size-8 items-center justify-center rounded text-[14px] font-medium text-[#5F6761] hover:text-[#1A1D1B]">
                64
              </button>
              <button className="flex size-8 items-center justify-center rounded border border-[#EBE8E1] text-[#8C938F] hover:text-[#1A1D1B]">
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 6. Bottom CTA */}
      <section>
         <div className="mx-auto w-full max-w-[1280px] px-5 md:px-7 lg:px-10 xl:px-12">
            <div className="bg-[#F4F2EC] rounded-[24px] border border-[#EBE8E1] p-8 md:p-12 flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
               <div className="relative z-10 w-full md:w-1/2 text-center md:text-left mb-8 md:mb-0">
                  <h2 className="text-[24px] md:text-[28px] font-bold text-[#1A1D1B] mb-3 break-keep">우리 아이에게 맞는 상품을<br />먼저 살펴보세요.</h2>
                  <p className="text-[14px] md:text-[15px] text-[#5F6761] break-keep">
                     전문가의 기준과 실제 후기를 바탕으로<br />더 좋은 선택을 도와드릴게요.
                  </p>
               </div>
               
               <div className="relative z-10 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                  <Link href="/shop" className="flex h-[48px] items-center justify-center rounded-full bg-[#1A1D1B] px-8 text-[14px] font-bold text-white transition-colors hover:bg-black">
                     전체 상품 보기
                     <ArrowRight className="ml-2 size-4" />
                  </Link>
                  <Link href="/mypage/reviews/write" className="flex h-[48px] items-center justify-center rounded-full bg-white border border-[#EBE8E1] px-8 text-[14px] font-bold text-[#1A1D1B] transition-colors hover:bg-[#FAF9F5]">
                     후기 작성하기
                     <ArrowRight className="ml-2 size-4" />
                  </Link>
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}
