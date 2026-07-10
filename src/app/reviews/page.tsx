import { reviews } from '@/data/reviews';
import { listProducts } from '@/lib/products/repo';
import ReviewCard from '@/components/common/ReviewCard';
import EmptyState from '@/components/common/EmptyState';
import { Star } from 'lucide-react';

export const metadata = {
  title: '구매후기 | 백조오브제',
  description: '백조오브제를 경험한 반려가족들의 진솔한 후기를 만나보세요.',
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = 'all' } = await searchParams;
  const products = await listProducts();
  const filteredReviews = reviews.filter((review) => {
    if (filter === 'photo') return review.isPhotoReview;
    if (filter === 'all') return true;
    return products.find((product) => product.id === review.productId)?.concernTags.includes(filter);
  });
  const avgRating = (reviews.reduce((acc, cur) => acc + cur.rating, 0) / reviews.length).toFixed(1);
  const photoReviewsCount = reviews.filter(r => r.isPhotoReview).length;

  return (
    <div className="bg-[#F4F2EC] min-h-dvh py-16">
      <div className="site-container">
        <div className="mb-12 text-center">
          <h1 className="text-3xl font-bold text-[#202521] md:text-4xl">반려가족의 리얼 후기</h1>
          <p className="mt-4 text-gray-500">백조오브제와 함께한 우리 아이들의 이야기를 확인하세요.</p>
        </div>

        {/* 요약 대시보드 */}
        <div className="mb-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-sm p-6 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="text-gray-500 text-sm font-medium mb-2">총 리뷰 수</div>
            <div className="text-3xl font-bold text-[#202521]">{reviews.length}개</div>
          </div>
          <div className="bg-white rounded-sm p-6 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="text-gray-500 text-sm font-medium mb-2">평균 별점</div>
            <div className="flex items-center gap-2">
              <Star className="h-8 w-8 fill-[#8A6D3B] text-[#8A6D3B]" />
              <span className="text-3xl font-bold text-[#202521]">{avgRating}</span>
            </div>
          </div>
          <div className="bg-white rounded-sm p-6 flex flex-col items-center justify-center text-center shadow-sm">
            <div className="text-gray-500 text-sm font-medium mb-2">포토 리뷰</div>
            <div className="text-3xl font-bold text-[#2F3B34]">{photoReviewsCount}개</div>
          </div>
        </div>
        
        {/* 필터 */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
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
              className={`border px-4 py-2.5 text-sm ${filter === id ? 'border-[#2F3B34] bg-[#2F3B34] text-white' : 'border-[#D8D6CE] bg-[#FAF9F5] text-[#626A64]'}`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* 리뷰 그리드 */}
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

      </div>
    </div>
  );
}
import Link from 'next/link';
