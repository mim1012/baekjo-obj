// products 테이블 접근 계층. 이 파일 밖에서는 Supabase를 직접 호출하지 않는다.
import { randomUUID } from 'node:crypto';
import { getSupabase } from '@/lib/supabase/server';
import type { Product, ProductOption, ProductDetailBlock } from '@/types';

const PET_TYPES = new Set(['dog', 'cat', 'both']);

/** DB pet_type 은 자유 text 라 유니온 밖 값이 들어올 수 있다. 미지값은 'both'로 정규화해
 *  admin select/필터가 조용히 깨지지 않게 한다. */
function normalizePetType(raw: string): Product['petType'] {
  return PET_TYPES.has(raw) ? (raw as Product['petType']) : 'both';
}

interface ProductRow {
  id: string;
  brand_id: string | null;
  name: string;
  price: number | null;
  sale_price: number | null;
  category: string;
  category_slug: string | null;
  lifestyle_category: string;
  pet_type: string;
  stock: number;
  rating: number;
  review_count: number;
  is_visible: boolean;
  is_best: boolean;
  is_recommended: boolean;
  detail: unknown;
  created_at: string;
}

const SELECT_COLUMNS =
  'id, brand_id, name, price, sale_price, category, category_slug, lifestyle_category, pet_type, stock, rating, review_count, is_visible, is_best, is_recommended, detail, created_at';

/** jsonb detail을 안전하게 객체로 취급한다. 객체가 아니면 빈 객체로 방어한다. */
function detailOf(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

function rowToProduct(row: ProductRow): Product {
  const d = detailOf(row.detail);
  return {
    id: row.id,
    brandId: row.brand_id ?? '',
    name: row.name,
    price: row.price,
    salePrice: row.sale_price,
    rating: row.rating,
    reviewCount: row.review_count,
    category: row.category,
    categorySlug: row.category_slug ?? undefined,
    categoryName: typeof d.categoryName === 'string' ? d.categoryName : undefined,
    lifestyleCategory: row.lifestyle_category,
    concernTags: Array.isArray(d.concernTags) ? (d.concernTags as string[]) : [],
    relatedConcernSlugs: Array.isArray(d.relatedConcernSlugs) ? (d.relatedConcernSlugs as string[]) : undefined,
    petType: normalizePetType(row.pet_type),
    ageGroup: typeof d.ageGroup === 'string' ? d.ageGroup : 'all',
    image: typeof d.image === 'string' ? d.image : '',
    images: Array.isArray(d.images) ? (d.images as string[]) : undefined,
    detailBlocks: Array.isArray(d.detailBlocks) ? (d.detailBlocks as ProductDetailBlock[]) : undefined,
    options: Array.isArray(d.options) ? (d.options as ProductOption[]) : undefined,
    stock: row.stock,
    summary: typeof d.summary === 'string' ? d.summary : undefined,
    description: typeof d.description === 'string' ? d.description : '',
    shippingNotice: typeof d.shippingNotice === 'string' ? d.shippingNotice : undefined,
    // 구매 정보 3종. validate 화이트리스트에도 없고 여기서 되읽지도 않아, 저장 경로와 조회
    // 경로가 동시에 끊겨 있었다 → 상세 페이지가 항상 기본 문구만 렌더했다.
    deliveryEstimate: typeof d.deliveryEstimate === 'string' ? d.deliveryEstimate : undefined,
    returnNotice: typeof d.returnNotice === 'string' ? d.returnNotice : undefined,
    sellerName: typeof d.sellerName === 'string' ? d.sellerName : undefined,
    tags: Array.isArray(d.tags) ? (d.tags as string[]) : undefined,
    brandName: typeof d.brandName === 'string' ? d.brandName : undefined,
    isMembersOnlyPrice: typeof d.isMembersOnlyPrice === 'boolean' ? d.isMembersOnlyPrice : undefined,
    auditPoints: Array.isArray(d.auditPoints) ? (d.auditPoints as string[]) : undefined,
    recommendedFor: Array.isArray(d.recommendedFor) ? (d.recommendedFor as string[]) : undefined,
    caution: Array.isArray(d.caution) ? (d.caution as string[]) : undefined,
    ingredients: typeof d.ingredients === 'string' ? d.ingredients : undefined,
    howToUse: typeof d.howToUse === 'string' ? d.howToUse : undefined,
    shippingFee: typeof d.shippingFee === 'number' ? d.shippingFee : undefined,
    isVisible: row.is_visible,
    isBest: row.is_best,
    isRecommended: row.is_recommended,
  };
}

/** camelCase Product 키 → snake_case 컬럼명. 여기 없는 키는 전부 detail jsonb로 들어간다. */
const PRODUCT_COLUMN_MAP: Partial<Record<keyof Product, string>> = {
  brandId: 'brand_id',
  name: 'name',
  price: 'price',
  salePrice: 'sale_price',
  rating: 'rating',
  reviewCount: 'review_count',
  category: 'category',
  categorySlug: 'category_slug',
  lifestyleCategory: 'lifestyle_category',
  petType: 'pet_type',
  stock: 'stock',
  isVisible: 'is_visible',
  isBest: 'is_best',
  isRecommended: 'is_recommended',
};

/** Product(전체 또는 일부)를 컬럼 값과 detail jsonb 조각으로 분리한다. */
function splitProductInput(input: Partial<Product>): {
  columns: Record<string, unknown>;
  detail: Record<string, unknown>;
} {
  const columns: Record<string, unknown> = {};
  const detail: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || key === 'id') continue;
    const columnName = PRODUCT_COLUMN_MAP[key as keyof Product];
    if (columnName) {
      columns[columnName] = value;
    } else {
      detail[key] = value;
    }
  }
  return { columns, detail };
}

export interface ProductListFilter {
  categorySlug?: string;
  brandId?: string;
  petType?: string;
  /** 기본 true(공개 노출 상품만). admin 목록에서는 false로 넘겨 비노출 상품도 포함한다. */
  visibleOnly?: boolean;
}

/** 상품 목록 조회 상한. 집계 호출부의 절삭 감지(truncated)용으로 export한다. */
export const PRODUCTS_LIST_CAP = 1000;

export async function listProducts(filter: ProductListFilter = {}): Promise<Product[]> {
  let query = getSupabase().from('products').select(SELECT_COLUMNS);
  if (filter.categorySlug) query = query.eq('category_slug', filter.categorySlug);
  if (filter.brandId) query = query.eq('brand_id', filter.brandId);
  if (filter.petType) query = query.eq('pet_type', filter.petType);
  if (filter.visibleOnly ?? true) query = query.eq('is_visible', true);

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(PRODUCTS_LIST_CAP);
  if (error) throw error;
  return (data as ProductRow[]).map(rowToProduct);
}

export async function listProductsByBrand(brandId: string): Promise<Product[]> {
  return listProducts({ brandId });
}

/** 공개 경로는 includeHidden 없이 호출해 비노출(is_visible: false) 상품이 단건 URL로도
 *  새 나가지 않게 한다. 관리자 수정 폼처럼 비노출 상품도 봐야 하는 곳만 includeHidden: true. */
export async function getProductById(id: string, opts: { includeHidden?: boolean } = {}): Promise<Product | null> {
  let query = getSupabase().from('products').select(SELECT_COLUMNS).eq('id', id);
  if (!opts.includeHidden) query = query.eq('is_visible', true);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data ? rowToProduct(data as ProductRow) : null;
}

export async function listAllProductsForAdmin(): Promise<Product[]> {
  return listProducts({ visibleOnly: false });
}

/**
 * 다건 조회. 기본은 공개 상품만(주문 검증용). 존재하지 않는 id는 결과에서 빠지므로
 * 호출부가 개수를 대조한다. includeHidden: true 는 "본인 소유 주문에 등장한 상품"처럼
 * 인가가 이미 다른 기준(소유권)으로 확보된 곳에서만 사용한다 — 비노출 상품을 일반
 * 공개 목록에 노출하는 용도가 아니다.
 */
export async function listProductsByIds(
  ids: string[],
  opts: { includeHidden?: boolean } = {},
): Promise<Product[]> {
  if (ids.length === 0) return [];
  let query = getSupabase().from('products').select(SELECT_COLUMNS).in('id', ids);
  if (!opts.includeHidden) query = query.eq('is_visible', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data as ProductRow[]).map(rowToProduct);
}

/** 상품 생성 입력. id는 서버가 생성한다(mass-assignment 차단, seed 'p1' 스타일과 충돌 방지). */
export type ProductInsertInput = Omit<Product, 'id'>;
export type ProductPatchInput = Partial<Omit<Product, 'id'>>;

export async function insertProduct(input: ProductInsertInput): Promise<Product> {
  const id = `product_${randomUUID()}`;
  const { columns, detail } = splitProductInput(input);
  const { data, error } = await getSupabase()
    .from('products')
    .insert({ id, ...columns, detail })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return rowToProduct(data as ProductRow);
}

/**
 * 가격 불변식: salePrice는 정가(price)가 있어야만 의미가 있고, 정가를 넘을 수 없다.
 * validate.ts는 "같은 body에 함께 넘어온" 두 값만 볼 수 있으므로(예: {price: null} 단독 patch),
 * DB의 기존 값과 합쳐진 merged 기준의 최종 검사는 여기가 유일한 방어선이다.
 * price=null + salePrice=null(가격 미정)은 모순이 아니다 — 통과.
 */
export function assertPriceInvariant(merged: Pick<Product, 'price' | 'salePrice'>): boolean {
  if (merged.salePrice == null) return true;
  if (merged.price == null) return false;
  return merged.salePrice <= merged.price;
}

/**
 * 관리자 상품 수정. jsonb detail은 supabase update가 부분 병합을 지원하지 않으므로,
 * 기존 행을 Product로 읽어 patch를 얹은 뒤 컬럼/디테일을 통째로 다시 나눠 쓴다
 * (read-modify-write, upsertSocialMember와 동일 패턴).
 * 결과는 updateProductScoped와 같은 ScopedMutationResult로 돌려 라우트가 not-found(404)와
 * invalid(400, 가격 불변식 위반)를 구분할 수 있게 한다. 'conflict'는 이 경로에선 나오지 않는다.
 */
export async function updateProduct(
  id: string,
  patch: ProductPatchInput,
): Promise<ScopedMutationResult<Product>> {
  const existing = await getProductById(id, { includeHidden: true });
  if (!existing) return { status: 'not-found' };

  const merged: Product = { ...existing, ...patch, id: existing.id };
  if (!assertPriceInvariant(merged)) return { status: 'invalid' };

  const { columns, detail } = splitProductInput(merged);
  const { data, error } = await getSupabase()
    .from('products')
    .update({ ...columns, detail })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return { status: 'ok', data: rowToProduct(data as ProductRow) };
}

/** 삭제된 상품이 실제로 존재했는지 반환한다(라우트에서 404 판정에 사용). */
export async function deleteProduct(id: string): Promise<boolean> {
  const { data, error } = await getSupabase().from('products').delete().eq('id', id).select('id');
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}

/**
 * 브랜드-스코프 쓰기(파트너 전용)의 공용 결과. 'conflict'는 인가 확인 시점과 쓰기 시점 사이에
 * 상품이 다른 브랜드로 옮겨져(TOCTOU) authorizedBrandId 조건에 0행이 걸린 경우 — 호출부는
 * 409로 매핑해 재인가를 요구한다. 'invalid'는 merge 후 salePrice > price 같은 불변식 위반.
 */
export type ScopedMutationResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'not-found' }
  | { status: 'conflict' }
  | { status: 'invalid' };

/**
 * 파트너 브랜드-스코프 상품 수정. authorizedBrandId를 UPDATE의 WHERE 절에 그대로 실어
 * "이 상품이 지금도 그 브랜드 소속인지" 확인과 실제 쓰기를 한 원자적 쿼리로 묶는다 —
 * 호출부가 먼저 getProductById로 brandId를 읽어 requireBrandScoped를 통과시킨 뒤 이 함수를
 * 부르는 구조라, 그 사이 다른 요청이 브랜드를 바꿔치기해도 이 UPDATE 자체는 0행에 적용되어
 * 절대 다른 브랜드의 상품을 건드리지 않는다(애플리케이션 레이어의 두 단계 검사/쓰기가 아니라
 * DB 조건절이 최종 방어선).
 */
export async function updateProductScoped(
  id: string,
  patch: ProductPatchInput,
  authorizedBrandId: string,
): Promise<ScopedMutationResult<Product>> {
  const existing = await getProductById(id, { includeHidden: true });
  if (!existing) return { status: 'not-found' };

  const merged: Product = { ...existing, ...patch, id: existing.id };
  if (!assertPriceInvariant(merged)) return { status: 'invalid' };

  const { columns, detail } = splitProductInput(merged);
  const { data, error } = await getSupabase()
    .from('products')
    .update({ ...columns, detail })
    .eq('id', id)
    .eq('brand_id', authorizedBrandId)
    .select(SELECT_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { status: 'conflict' };
  return { status: 'ok', data: rowToProduct(data as ProductRow) };
}

/**
 * 파트너 브랜드-스코프 상품 삭제. updateProductScoped와 동일한 이유로 DELETE의 WHERE에
 * authorizedBrandId를 실어 조건과 삭제를 원자적으로 묶는다. 0행이면 id 자체가 없는 것인지
 * (TOCTOU로 브랜드가 바뀐 것인지) 구분하기 위해 존재 여부를 한 번 더 확인한다.
 */
export async function deleteProductScoped(
  id: string,
  authorizedBrandId: string,
): Promise<ScopedMutationResult<true>> {
  const { data, error } = await getSupabase()
    .from('products')
    .delete()
    .eq('id', id)
    .eq('brand_id', authorizedBrandId)
    .select('id');
  if (error) throw error;
  if (Array.isArray(data) && data.length > 0) return { status: 'ok', data: true };

  const stillExists = await getProductById(id, { includeHidden: true });
  return stillExists ? { status: 'conflict' } : { status: 'not-found' };
}
