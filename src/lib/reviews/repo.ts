// product_reviews 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
import { getSupabase } from '@/lib/supabase/server';
import type { ProductReview } from '@/types';

interface ReviewRow {
  id: string;
  member_id: string;
  order_id: string;
  order_item_id: string | null;
  review_target_key: string;
  product_id: string;
  brand_id: string | null;
  rating: number;
  title: string | null;
  content: string;
  status: 'published' | 'hidden';
  created_at: string;
  updated_at: string;
}

const SELECT_COLUMNS =
  'id, member_id, order_id, order_item_id, review_target_key, product_id, brand_id, rating, title, content, status, created_at, updated_at';

function rowToReview(row: ReviewRow): ProductReview {
  return {
    id: row.id,
    userId: row.member_id,
    orderId: row.order_id,
    orderItemId: row.order_item_id ?? undefined,
    reviewTargetKey: row.review_target_key,
    productId: row.product_id,
    brandId: row.brand_id ?? '',
    rating: row.rating,
    title: row.title ?? undefined,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** review_target_key unique 제약(23505) 위반 시 던지는 전용 에러 — 라우트가 409로 구분 응답한다. */
export class DuplicateReviewError extends Error {
  constructor() {
    super('duplicate-review');
    this.name = 'DuplicateReviewError';
  }
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === '23505';
}

/** 공개 상품상세용 — 노출(published) 구매평만. */
export async function listPublishedReviewsByProduct(productId: string): Promise<ProductReview[]> {
  const { data, error } = await getSupabase()
    .from('product_reviews')
    .select(SELECT_COLUMNS)
    .eq('product_id', productId)
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as ReviewRow[]).map(rowToReview);
}

/** 마이페이지용 — 본인 구매평 전체(hidden 포함). */
export async function listReviewsByMember(memberId: string): Promise<ProductReview[]> {
  const { data, error } = await getSupabase()
    .from('product_reviews')
    .select(SELECT_COLUMNS)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as ReviewRow[]).map(rowToReview);
}

export type InsertReviewInput = Pick<
  ProductReview,
  'orderId' | 'orderItemId' | 'reviewTargetKey' | 'productId' | 'brandId' | 'rating' | 'title' | 'content'
>;

export async function insertReview(memberId: string, input: InsertReviewInput): Promise<ProductReview> {
  const { data, error } = await getSupabase()
    .from('product_reviews')
    .insert({
      member_id: memberId,
      order_id: input.orderId,
      order_item_id: input.orderItemId ?? null,
      review_target_key: input.reviewTargetKey,
      product_id: input.productId,
      brand_id: input.brandId || null,
      rating: input.rating,
      title: input.title ?? null,
      content: input.content,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) {
    if (isUniqueViolation(error)) throw new DuplicateReviewError();
    throw error;
  }
  return rowToReview(data as ReviewRow);
}

export type ReviewPatch = Partial<Pick<ProductReview, 'rating' | 'title' | 'content'>>;

/** 소유자 본인 것만 수정. 대상 없음/소유자 불일치 시 null. */
export async function updateReviewByOwner(
  id: string,
  memberId: string,
  patch: ReviewPatch,
): Promise<ProductReview | null> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.rating !== undefined) update.rating = patch.rating;
  if (patch.title !== undefined) update.title = patch.title ?? null;
  if (patch.content !== undefined) update.content = patch.content;

  const { data, error } = await getSupabase()
    .from('product_reviews')
    .update(update)
    .eq('id', id)
    .eq('member_id', memberId)
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToReview(data as ReviewRow) : null;
}

/** 소유자 본인 것만 삭제. 반환값 = 실제로 삭제됐는지. */
export async function deleteReviewByOwner(id: string, memberId: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('product_reviews')
    .delete()
    .eq('id', id)
    .eq('member_id', memberId)
    .select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/** 관리자 전용 — 노출 상태 변경. 대상 없으면 null. */
export async function setReviewStatus(
  id: string,
  status: 'published' | 'hidden',
): Promise<ProductReview | null> {
  const { data, error } = await getSupabase()
    .from('product_reviews')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToReview(data as ReviewRow) : null;
}

export async function getReviewById(id: string): Promise<ProductReview | null> {
  const { data, error } = await getSupabase()
    .from('product_reviews')
    .select(SELECT_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToReview(data as ReviewRow) : null;
}
