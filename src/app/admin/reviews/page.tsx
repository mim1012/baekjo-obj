import AdminResourcePage from '@/components/admin/AdminResourcePage';
import { reviews } from '@/data/reviews';
import { products } from '@/data/products';
import { formatDate } from '@/lib/format';

export default function AdminReviewsPage() {
  return (
    <AdminResourcePage
      title="후기 관리"
      description="사진과 별점, 후기 내용을 확인하고 노출 및 베스트 상태를 관리합니다."
      actionLabel="후기 등록"
      searchPlaceholder="상품명, 견종, 후기 내용 검색"
      filters={['전체 후기', '사진 후기', '베스트 후기', '숨김']}
      columns={[
        { key: 'product', label: '상품' },
        { key: 'pet', label: '반려동물' },
        { key: 'rating', label: '별점' },
        { key: 'photo', label: '사진' },
        { key: 'content', label: '후기 내용' },
        { key: 'status', label: '노출 상태' },
        { key: 'date', label: '작성일' },
      ]}
      rows={reviews.map((review) => ({
        id: review.id,
        product: products.find((product) => product.id === review.productId)?.name ?? review.productId,
        pet: `${review.breed} / ${review.age}`,
        rating: review.rating,
        photo: review.isPhotoReview ? '있음' : '없음',
        content: review.content,
        status: review.isVisible === false ? '숨김' : review.isBest ? '노출중 · BEST' : '노출중',
        date: formatDate(review.createdAt),
      }))}
      createFields={['상품', '반려동물 종류', '견종/묘종', '나이', '사용기간', '별점', '후기 내용', '사진', '노출 상태', '베스트 설정']}
    />
  );
}
