import 'server-only';
import type { Brand, Concern, Product } from '@/types';
import type { ProductListFilter } from '@/lib/products/repo';
import { logServerWarn } from '@/lib/logServerError';
import { normalizeHomeSettings, type HomeSettings } from '@/data/homeContent';
import type { ConcernsConfig } from '@/lib/concerns/config';
import type { NoticesConfig } from '@/lib/notices/config';
import { isNoticeShape, normalizeNotice } from '@/lib/notices/validate';
import type { ShowcaseReviewsConfig } from '@/lib/reviews/showcaseConfig';
import {
  isShowcaseReviewShape,
  normalizeShowcaseReview,
} from '@/lib/reviews/showcaseValidate';
import type { CategorySettings } from '@/lib/categorySettings/config';

// 로컬에 Supabase 자격증명이 없을 때 공개 화면을 확인하기 위한 읽기 전용 원본.
// 공개 GET API만 사용하며 관리자·주문·회원 API에는 절대 연결하지 않는다.
const CANONICAL_PUBLIC_ORIGIN = 'https://www.baekjo-objet.com';
const SNAPSHOT_TTL_MS = 60_000;

type Snapshot<T> = { value: T; expiresAt: number };

let productSnapshot: Snapshot<Product[]> | null = null;
let productRequest: Promise<Product[]> | null = null;
let brandSnapshot: Snapshot<Brand[]> | null = null;
let brandRequest: Promise<Brand[]> | null = null;
const payloadSnapshots = new Map<string, Snapshot<unknown>>();
const payloadRequests = new Map<string, Promise<unknown>>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPublicProduct(value: unknown): value is Product {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.brandId === 'string' &&
    typeof value.name === 'string' &&
    (value.price === null || isFiniteNumber(value.price)) &&
    isFiniteNumber(value.rating) &&
    isFiniteNumber(value.reviewCount) &&
    typeof value.category === 'string' &&
    typeof value.lifestyleCategory === 'string' &&
    Array.isArray(value.concernTags) &&
    ['dog', 'cat', 'small', 'both'].includes(String(value.petType)) &&
    typeof value.ageGroup === 'string' &&
    typeof value.image === 'string' &&
    isFiniteNumber(value.stock) &&
    typeof value.description === 'string' &&
    typeof value.isBest === 'boolean' &&
    typeof value.isRecommended === 'boolean'
  );
}

function isPublicBrand(value: unknown): value is Brand {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.slug === 'string' &&
    typeof value.name === 'string' &&
    typeof value.logo === 'string' &&
    typeof value.description === 'string' &&
    typeof value.philosophy === 'string' &&
    Array.isArray(value.auditPoints) &&
    Array.isArray(value.representativeProductIds) &&
    Array.isArray(value.relatedConcernSlugs) &&
    typeof value.isRecommended === 'boolean'
  );
}

async function fetchPublicCollection<T>(
  path: string,
  key: 'products' | 'brands',
  isItem: (value: unknown) => value is T,
): Promise<T[]> {
  const response = await fetch(`${CANONICAL_PUBLIC_ORIGIN}${path}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`canonical public API ${path} returned ${response.status}`);
  const payload: unknown = await response.json();
  if (!isRecord(payload) || !Array.isArray(payload[key])) {
    throw new Error(`canonical public API ${path} returned malformed data`);
  }
  const validItems = payload[key].filter(isItem);
  if (validItems.length !== payload[key].length) {
    logServerWarn(`[public-dev-fallback] ${path} 일부 항목 형식 불일치 — 제외`, {
      message: `${payload[key].length - validItems.length} invalid items`,
    });
  }
  return validItems;
}

async function fetchPublicPayload(path: string): Promise<unknown> {
  const cached = payloadSnapshots.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let request = payloadRequests.get(path);
  if (!request) {
    request = fetch(`${CANONICAL_PUBLIC_ORIGIN}${path}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`canonical public API ${path} returned ${response.status}`);
      return response.json() as Promise<unknown>;
    });
    payloadRequests.set(path, request);
  }

  try {
    const value = await request;
    payloadSnapshots.set(path, { value, expiresAt: Date.now() + SNAPSHOT_TTL_MS });
    return value;
  } finally {
    payloadRequests.delete(path);
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isPublicConcern(value: unknown): value is Concern {
  if (!isRecord(value)) return false;
  return (
    typeof value.slug === 'string' &&
    typeof value.title === 'string' &&
    typeof value.icon === 'string' &&
    typeof value.shortDescription === 'string' &&
    typeof value.description === 'string' &&
    isStringArray(value.symptoms) &&
    isStringArray(value.causes) &&
    isStringArray(value.recommendedProductIds) &&
    isStringArray(value.recommendedBrandIds) &&
    typeof value.insuranceCta === 'string' &&
    Array.isArray(value.faq) &&
    value.faq.every(
      (faq) =>
        isRecord(faq) && typeof faq.question === 'string' && typeof faq.answer === 'string',
    )
  );
}

export async function getCanonicalPublicNoticesConfig(): Promise<NoticesConfig | null> {
  try {
    const payload = await fetchPublicPayload('/api/notices');
    if (!isRecord(payload) || !Array.isArray(payload.items)) return null;
    const items = payload.items.filter(isNoticeShape).map(normalizeNotice);
    return items.length === payload.items.length ? { items } : null;
  } catch (error) {
    logServerWarn('[public-dev-fallback] 운영 공개 공지 조회 실패', error);
    return null;
  }
}

export async function getCanonicalPublicShowcaseReviewsConfig(): Promise<ShowcaseReviewsConfig | null> {
  try {
    const payload = await fetchPublicPayload('/api/showcase-reviews');
    if (!isRecord(payload) || !Array.isArray(payload.items)) return null;
    const items = payload.items.filter(isShowcaseReviewShape).map(normalizeShowcaseReview);
    return items.length === payload.items.length ? { items } : null;
  } catch (error) {
    logServerWarn('[public-dev-fallback] 운영 공개 전시 후기 조회 실패', error);
    return null;
  }
}

export async function getCanonicalPublicHomeSettings(): Promise<HomeSettings | null> {
  try {
    const payload = await fetchPublicPayload('/api/settings');
    return isRecord(payload) && isRecord(payload.settings)
      ? normalizeHomeSettings(payload.settings)
      : null;
  } catch (error) {
    logServerWarn('[public-dev-fallback] 운영 공개 홈 설정 조회 실패', error);
    return null;
  }
}

export async function getCanonicalPublicConcernsConfig(): Promise<ConcernsConfig | null> {
  try {
    const payload = await fetchPublicPayload('/api/concerns');
    if (!isRecord(payload) || !Array.isArray(payload.items)) return null;
    const items = payload.items.filter(isPublicConcern);
    return items.length === payload.items.length && items.length > 0 ? { items } : null;
  } catch (error) {
    logServerWarn('[public-dev-fallback] 운영 공개 고민 조회 실패', error);
    return null;
  }
}

export async function getCanonicalPublicCategorySettings(): Promise<CategorySettings | null> {
  try {
    const payload = await fetchPublicPayload('/api/category-settings');
    if (!isRecord(payload) || !isRecord(payload.settings)) return null;
    const settings = payload.settings;
    if (
      !isStringArray(settings.productCategories) ||
      !isStringArray(settings.lifestyleCategories) ||
      !Array.isArray(settings.brandFilters) ||
      !settings.brandFilters.every(
        (filter) =>
          isRecord(filter) && typeof filter.id === 'string' && typeof filter.label === 'string',
      )
    ) return null;
    return settings as unknown as CategorySettings;
  } catch (error) {
    logServerWarn('[public-dev-fallback] 운영 공개 카테고리 설정 조회 실패', error);
    return null;
  }
}

export async function listCanonicalPublicProducts(
  filter: Omit<ProductListFilter, 'visibleOnly'> = {},
): Promise<Product[]> {
  const now = Date.now();
  if (!productSnapshot || productSnapshot.expiresAt <= now) {
    productRequest ??= fetchPublicCollection('/api/products', 'products', isPublicProduct);
    try {
      productSnapshot = { value: await productRequest, expiresAt: now + SNAPSHOT_TTL_MS };
    } catch (error) {
      logServerWarn('[public-dev-fallback] 운영 공개 상품 조회 실패 — 빈 목록 사용', error);
      return [];
    } finally {
      productRequest = null;
    }
  }

  return productSnapshot.value.filter((product) => {
    if (filter.brandId && product.brandId !== filter.brandId) return false;
    if (filter.petType && product.petType !== filter.petType) return false;
    if (filter.categorySlug && product.categorySlug !== filter.categorySlug) return false;
    return true;
  });
}

export async function getCanonicalPublicProductById(id: string): Promise<Product | null> {
  return (await listCanonicalPublicProducts()).find((product) => product.id === id) ?? null;
}

export async function listCanonicalPublicBrands(): Promise<Brand[]> {
  const now = Date.now();
  if (!brandSnapshot || brandSnapshot.expiresAt <= now) {
    brandRequest ??= fetchPublicCollection('/api/brands', 'brands', isPublicBrand);
    try {
      brandSnapshot = { value: await brandRequest, expiresAt: now + SNAPSHOT_TTL_MS };
    } catch (error) {
      logServerWarn('[public-dev-fallback] 운영 공개 브랜드 조회 실패 — 빈 목록 사용', error);
      return [];
    } finally {
      brandRequest = null;
    }
  }
  return brandSnapshot.value;
}

export async function getCanonicalPublicBrandById(id: string): Promise<Brand | null> {
  return (await listCanonicalPublicBrands()).find((brand) => brand.id === id) ?? null;
}

export async function getCanonicalPublicBrandBySlug(slug: string): Promise<Brand | null> {
  return (await listCanonicalPublicBrands()).find((brand) => brand.slug === slug) ?? null;
}

export async function getCanonicalPublicProductCountsByBrand(
  brandIds: string[],
): Promise<Record<string, number>> {
  const wanted = new Set(brandIds);
  const counts: Record<string, number> = {};
  for (const product of await listCanonicalPublicProducts()) {
    if (wanted.has(product.brandId)) counts[product.brandId] = (counts[product.brandId] ?? 0) + 1;
  }
  return counts;
}
