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

const PRODUCTS_LIST_CAP = 1000;

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
 * 관리자 상품 수정. jsonb detail은 supabase update가 부분 병합을 지원하지 않으므로,
 * 기존 행을 Product로 읽어 patch를 얹은 뒤 컬럼/디테일을 통째로 다시 나눠 쓴다
 * (read-modify-write, upsertSocialMember와 동일 패턴). 존재하지 않으면 null.
 */
export async function updateProduct(id: string, patch: ProductPatchInput): Promise<Product | null> {
  const existing = await getProductById(id, { includeHidden: true });
  if (!existing) return null;

  const merged: Product = { ...existing, ...patch, id: existing.id };
  const { columns, detail } = splitProductInput(merged);
  const { data, error } = await getSupabase()
    .from('products')
    .update({ ...columns, detail })
    .eq('id', id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return rowToProduct(data as ProductRow);
}

/** 삭제된 상품이 실제로 존재했는지 반환한다(라우트에서 404 판정에 사용). */
export async function deleteProduct(id: string): Promise<boolean> {
  const { data, error } = await getSupabase().from('products').delete().eq('id', id).select('id');
  if (error) throw error;
  return Array.isArray(data) && data.length > 0;
}
