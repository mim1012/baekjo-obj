// 전시용 후기(Review) item 단위 형상 검증 — 순수 모듈('use client' 없음, Supabase/Node 의존 없음).
// repo(getShowcaseReviewsConfig: DB에서 읽은 jsonb)와 관리자 API 라우트(PUT 본문)가 같은 규칙을
// 공유한다(notices/validate.ts 미러). jsonb 는 수동 조작·과거 버전 저장으로 기형 행이 존재할 수
// 있어, config 겉모양({ items: [...] }) 검사만으로는 소비부(ReviewCard·formatDate·ratingStars)가
// 깨질 수 있다.
import type { Review } from '@/types';

export const REVIEW_PET_TYPES = ['dog', 'cat'] as const;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** rating 은 별점 표시(ratingStars) 입력 — 1~5 범위의 유한한 숫자만 허용한다(반개 별점 소수 허용). */
export function isRating(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5;
}

/**
 * optional 문자열 필드(image)는 undefined 또는 null 도 통과시킨다 — JSON 왕복(jsonb 저장)에서
 * null 로 저장될 수 있어 null 을 기형으로 취급하면 정상 데이터가 default 폴백으로 밀려난다.
 * 대신 반환·저장 전에 normalizeShowcaseReview 가 null → undefined 로 정규화하는 것이 전제다.
 */
function isOptionalString(value: unknown): boolean {
  return value === undefined || value === null || isNonEmptyString(value);
}

/** optional boolean 필드(isVisible·isBest)도 같은 이유로 null 을 허용한다. */
function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'boolean';
}

/** item 이 소비부가 안전하게 렌더할 수 있는 Review 형상인지 검사한다(optional null 허용 — 위 주석). */
export function isShowcaseReviewShape(item: unknown): item is Review {
  if (!item || typeof item !== 'object') return false;
  const review = item as Partial<Record<keyof Review, unknown>>;
  return (
    isNonEmptyString(review.id) &&
    isNonEmptyString(review.productId) &&
    REVIEW_PET_TYPES.includes(review.petType as (typeof REVIEW_PET_TYPES)[number]) &&
    isNonEmptyString(review.breed) &&
    isNonEmptyString(review.age) &&
    isNonEmptyString(review.usePeriod) &&
    isRating(review.rating) &&
    isNonEmptyString(review.content) &&
    typeof review.isPhotoReview === 'boolean' &&
    isNonEmptyString(review.createdAt) &&
    isOptionalString(review.image) &&
    isOptionalBoolean(review.isVisible) &&
    isOptionalBoolean(review.isBest)
  );
}

/** 형상 검증이 optional null 을 허용하므로, 반환·저장 전 null → undefined 로 정규화한다. */
export function normalizeShowcaseReview(review: Review): Review {
  return {
    ...review,
    image: review.image ?? undefined,
    isVisible: review.isVisible ?? undefined,
    isBest: review.isBest ?? undefined,
  };
}
