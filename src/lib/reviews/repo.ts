// product_reviews 테이블(구매평 CRUD) + showcase_reviews_config 싱글턴(전시용 후기) 접근 계층.
// 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
import { getSupabase } from '@/lib/supabase/server';
import type { ProductReview } from '@/types';
import { defaultShowcaseReviewsConfig, type ShowcaseReviewsConfig } from '@/lib/reviews/showcaseConfig';
import { isShowcaseReviewShape, normalizeShowcaseReview } from '@/lib/reviews/showcaseValidate';
import { logServerError } from '@/lib/logServerError';

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

/* ── 전시용 후기(showcase reviews) ─────────────────────────────
 * 구매 기반 product_reviews 와 별개인 큐레이션 콘텐츠. { items: Review[] } 를 한 행(id='default')에
 * jsonb 로 통째로 저장/조회한다(notices/repo.ts 미러).
 */

const SHOWCASE_CONFIG_ROW_ID = 'default';

/**
 * value jsonb 가 저장 시점의 ShowcaseReviewsConfig 모양({ items: [...] })인지 검사한다.
 * notices 와 달리 items 빈 배열을 허용한다 — 관리자가 실제 구매평이 쌓인 뒤 전시 후기를
 * 전부 지우는 것도 정당한 상태이기 때문이다(notices 의 최소 1건 요구를 이 도메인엔 두지 않는다).
 */
function isShowcaseReviewsConfigShape(value: unknown): value is ShowcaseReviewsConfig {
  if (typeof value !== 'object' || value === null) return false;
  const items = (value as { items?: unknown }).items;
  return Array.isArray(items) && items.every(isShowcaseReviewShape);
}

/**
 * 저장된 전시 후기 config 를 반환한다. 행이 없거나 value 가 config 모양이 아니면
 * null(→ 호출부가 defaultShowcaseReviewsConfig 로 폴백).
 */
export async function getShowcaseReviewsConfig(): Promise<ShowcaseReviewsConfig | null> {
  const { data, error } = await getSupabase()
    .from('showcase_reviews_config')
    .select('value')
    .eq('id', SHOWCASE_CONFIG_ROW_ID)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (!isShowcaseReviewsConfigShape(data.value)) {
    logServerError(
      '[reviews/repo] value 가 ShowcaseReviewsConfig 모양이 아님 — null(default 폴백) 처리',
      'malformed showcase_reviews_config.value',
    );
    return null;
  }
  return { items: data.value.items.map(normalizeShowcaseReview) };
}

/**
 * 공개 서버 페이지(/reviews·홈·브랜드/고민 상세)용 폴백 조회.
 * 미저장·조회 실패를 defaultShowcaseReviewsConfig 로 접어 공개 화면이 절대 빈 목록으로 깨지지 않게 한다.
 */
export async function getShowcaseReviewsConfigWithFallback(): Promise<ShowcaseReviewsConfig> {
  try {
    return (await getShowcaseReviewsConfig()) ?? defaultShowcaseReviewsConfig;
  } catch (error) {
    logServerError('[reviews/repo] 조회 실패 — defaultShowcaseReviewsConfig 로 폴백', error);
    return defaultShowcaseReviewsConfig;
  }
}

/** 전시 후기 config 를 통째로 upsert(id='default') 한다. 없으면 생성, 있으면 덮어쓴다. */
export async function saveShowcaseReviewsConfig(value: ShowcaseReviewsConfig): Promise<void> {
  const { error } = await getSupabase()
    .from('showcase_reviews_config')
    .upsert({ id: SHOWCASE_CONFIG_ROW_ID, value, updated_at: new Date().toISOString() });
  if (error) throw error;
}
