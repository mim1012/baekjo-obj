import { getShowcaseReviewsConfigWithFallback } from '@/lib/reviews/repo';
import ReviewCard from '@/components/common/ReviewCard';
import EmptyState from '@/components/common/EmptyState';
import { Image as ImageIcon, MessageCircle, Star } from 'lucide-react';

export const metadata = {
  title: '구매후기 | 백조오브제',
  description: '백조오브제를 경험한 반려가족들의 진솔한 후기를 만나보세요.',
};

// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

// 후기 콘텐츠는 showcase_reviews_config 가 정본이다. 상품 DB readback 없이 review metadata 로 필터링한다.
const reviewConcernTagsByProductId: Record<string, string[]> = {
  p1: ['picky'],
  p2: ['picky'],
  p3: ['picky'],
  p6: ['skin'],
  p8: ['tear'],
  p11: ['skin'],
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = 'all' } = await searchParams;
  const { items } = await getShowcaseReviewsConfigWithFallback();
  const reviews = items.filter((review) => review.isVisible !== false);
  const filteredReviews = reviews.filter((review) => {
    if (filter === 'photo') return review.isPhotoReview;
    if (filter === 'all') return true;
    return reviewConcernTagsByProductId[review.productId]?.includes(filter) ?? false;
  });
  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, cur) => acc + cur.rating, 0) / reviews.length).toFixed(1)
    : '0.0';
  const photoReviewsCount = reviews.filter(r => r.isPhotoReview).length;

  return (
    <div className="min-h-dvh bg-[#F4F2EC] bg-noise py-10 lg:py-12">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-8 lg:px-10">
        <div className="mb-5 flex flex-col gap-4 border-b border-[#D8D6CE] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-editorial text-[13px] italic text-[#A8742E]">Voices from the home</p>
            <h1 className="mt-2 text-[30px] font-bold leading-[1.15] tracking-tight text-[#17211D] md:text-[42px]">반려가족의 리얼 후기</h1>
            <p className="mt-2 text-[15px] text-[#6F766F] break-keep">백조오브제와 함께한 우리 아이들의 이야기를 확인하세요.</p>
          </div>
          <div className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#59615B]">
            <MessageCircle className="size-4 text-[#A8742E]" strokeWidth={1.6} aria-hidden="true" />
            실제 구매 후기를 모았습니다
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 divide-x divide-[#E7E0D5] border-b border-[#E7E0D5] bg-white">
          <div className="flex min-h-[88px] flex-col justify-center px-3 py-3 sm:px-5">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6F766F] sm:text-[11px]">Total voices</div>
            <div className="text-[24px] font-bold leading-none tracking-tight text-[#17211D] sm:text-[28px]">{reviews.length}<span className="ml-1 text-[12px] font-medium text-[#6F766F]">개</span></div>
          </div>
          <div className="flex min-h-[88px] flex-col justify-center px-3 py-3 sm:px-5">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6F766F] sm:text-[11px]">Average rating</div>
            <div className="flex items-center gap-1.5">
              <Star className="size-4 fill-[#A8742E] text-[#A8742E] sm:size-[18px]" aria-hidden="true" />
              <span className="text-[24px] font-bold leading-none tracking-tight text-[#17211D] sm:text-[28px]">{avgRating}</span>
            </div>
          </div>
          <div className="flex min-h-[88px] flex-col justify-center px-3 py-3 sm:px-5">
            <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6F766F] sm:text-[11px]"><ImageIcon className="size-3.5 text-[#A8742E]" aria-hidden="true" />Photo reviews</div>
            <div className="text-[24px] font-bold leading-none tracking-tight text-[#17211D] sm:text-[28px]">{photoReviewsCount}<span className="ml-1 text-[12px] font-medium text-[#6F766F]">개</span></div>
          </div>
        </div>
        
        {/* 필터 */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="후기 필터">
          {[
            ['all', '전체'],
            ['photo', '사진 후기'],
            ['tear', '눈물'],
            ['skin', '피부'],
            ['joint', '관절'],
            ['picky', '편식'],
            ['senior', '노령'],
          ].map(([id, label]) => (
            <Link
              key={id}
              href={id === 'all' ? '/reviews' : `/reviews?filter=${id}`}
              className={`flex h-9 shrink-0 items-center rounded-md border px-4 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A8742E] focus-visible:ring-offset-2 ${filter === id ? 'border-[#17211D] bg-[#17211D] text-[#FBFAF7]' : 'border-[#D8D6CE] bg-white text-[#59615B] hover:border-[#A8742E] hover:bg-[#F3EEE6] hover:text-[#17211D]'}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* 리뷰 그리드 */}
        {filteredReviews.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredReviews.map(review => {
              return (
                <ReviewCard key={review.id} review={review} productName={review.productId} />
              );
            })}
          </div>
        ) : (
          <EmptyState title="후기가 없습니다." description="아직 등록된 후기가 없습니다." />
        )}

      </div>
    </div>
  );
}
import Link from 'next/link';
