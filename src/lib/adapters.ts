import { ReviewViewItem, InquiryViewItem } from '@/types';
import { qnaList as seedQna } from '@/data/qna';
import { getProductReviewsByProduct, getProductInquiriesByProduct, getShowcaseReviews } from './storage';

/**
 * 특정 상품의 통합 구매평 (전시용 후기 + 사용자 작성) 반환
 */
export async function getMergedReviews(productId: string): Promise<ReviewViewItem[]> {
  // 1. 전시용 후기(showcase_reviews_config — DB 정본, 관리자 /admin/reviews 가 편집).
  // ReviewViewItem.source 는 'seed' | 'user' 유니온을 그대로 쓴다 — 'seed' 는 이제 정적 파일이
  // 아니라 DB config 기반 전시용 후기를 뜻한다(구매 기반 사용자 후기와 구분하는 태그로 재해석).
  const showcase = (await getShowcaseReviews())
    .filter((r) => r.productId === productId && r.isVisible !== false)
    .map((r): ReviewViewItem => ({
      id: r.id,
      source: 'seed',
      productId: r.productId,
      rating: r.rating,
      content: r.content,
      createdAt: r.createdAt,
      editable: false,
      breed: r.breed,
      age: r.age,
      usePeriod: r.usePeriod,
      image: r.image,
      isPhotoReview: r.isPhotoReview,
      isBest: r.isBest,
    }));

  // 2. 사용자 작성 데이터(DB, 노출 상태만 — /api/products/[id]/reviews 가 이미 published 로 좁혀 반환)
  const userReviews = (await getProductReviewsByProduct(productId))
    .map((r): ReviewViewItem => ({
      id: r.id,
      source: 'user',
      productId: r.productId,
      brandId: r.brandId,
      userId: r.userId,
      rating: r.rating,
      title: r.title,
      content: r.content,
      createdAt: r.createdAt,
      status: r.status,
      editable: true,
    }));

  return [...userReviews, ...showcase].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * 특정 상품의 통합 문의 (시드 + 사용자 작성) 반환
 */
export async function getMergedInquiries(productId: string): Promise<InquiryViewItem[]> {
  // 1. 시드 데이터
  const seed = seedQna
    .filter((q) => q.productId === productId)
    .map((q): InquiryViewItem => ({
      id: q.id,
      source: 'seed',
      productId: q.productId,
      question: q.question,
      content: q.question, // 시드에는 content가 없으므로 question으로 대체
      answer: q.answer,
      status: q.status === '답변완료' ? 'answered' : 'waiting',
      isSecret: q.isSecret,
      writerName: q.writerName,
      createdAt: q.createdAt,
      answeredAt: q.answeredAt,
      editable: false,
    }));

  // 2. 사용자 작성 데이터(DB — 비밀글 content/answer 는 서버가 열람 권한에 따라 이미 redaction)
  const userInquiries = (await getProductInquiriesByProduct(productId))
    .map((i): InquiryViewItem => ({
      id: i.id,
      source: 'user',
      productId: i.productId,
      brandId: i.brandId,
      userId: i.userId,
      title: i.title,
      content: i.content,
      answer: i.answer,
      answeredBy: i.answeredBy,
      answeredAt: i.answeredAt,
      status: i.status,
      isSecret: i.isSecret,
      createdAt: i.createdAt,
      editable: true,
    }));

  return [...userInquiries, ...seed].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
