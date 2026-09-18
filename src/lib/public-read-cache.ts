import { unstable_cache } from 'next/cache';
import { getBrandById, getBrandBySlug, listBrands } from '@/lib/brands/repo';
import { getCategorySettings } from '@/lib/categorySettings/repo';
import { getPublishedCmsPage } from '@/lib/cms/repo';
import {
  countVisibleProductsByBrand,
  getProductById,
  listAllVisibleProductsByBrand,
  listProducts,
  type ProductListFilter,
} from '@/lib/products/repo';
import { getSiteSettings } from '@/lib/settings/repo';
import { getPageTextSettings } from '@/lib/page-texts/repo';
import {
  isMissingSupabaseEnvironmentError,
  logServerWarn,
} from '@/lib/logServerError';
import {
  getCanonicalPublicBrandById,
  getCanonicalPublicBrandBySlug,
  getCanonicalPublicCategorySettings,
  getCanonicalPublicHomeSettings,
  getCanonicalPublicProductById,
  getCanonicalPublicProductCountsByBrand,
  listCanonicalPublicBrands,
  listCanonicalPublicProducts,
} from '@/lib/public-dev-fallback';

export const PUBLIC_READ_CACHE_TAGS = {
  products: 'public-products',
  brands: 'public-brands',
  categorySettings: 'public-category-settings',
  siteSettings: 'public-site-settings',
  pageTexts: 'public-page-texts',
  // 리터럴 그대로 'cmsPages' — [pageKey]/route.ts, import/route.ts의 revalidateTag('cmsPages') 및
  // publish-cms-page-from-source 계약 문서(0166)와 문자열이 정확히 일치해야 무효화가 걸린다.
  cmsPages: 'cmsPages',
} as const;

export const EXPIRE_PUBLIC_READ_CACHE = { expire: 0 } as const;

export const PUBLIC_READ_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

type PublicProductListFilter = Omit<ProductListFilter, 'visibleOnly'>;

const PUBLIC_READ_REVALIDATE_SECONDS = 60;

async function withDevelopmentPublicReadFallback<T>(
  read: () => Promise<T>,
  fallback: () => Promise<T>,
  context: string,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    // 환경파일 없이 공개 UI의 정적 부분을 확인하는 로컬 개발만 빈 결과를 허용한다.
    // production의 설정 누락과 실제 DB 장애는 throw를 유지해 운영 장애를 숨기지 않는다.
    if (process.env.NODE_ENV !== 'development' || !isMissingSupabaseEnvironmentError(error)) {
      throw error;
    }
    logServerWarn(context, error);
    return fallback();
  }
}

const cachedPublicProducts = unstable_cache(
  async (categorySlug?: string, brandId?: string, petType?: string) =>
    listProducts({ categorySlug, brandId, petType, visibleOnly: true }),
  ['public-products'],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS, tags: [PUBLIC_READ_CACHE_TAGS.products] },
);

const cachedPublicProductById = unstable_cache(
  async (id: string) => getProductById(id),
  ['public-product-by-id'],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS, tags: [PUBLIC_READ_CACHE_TAGS.products] },
);

const cachedPublicProductsByBrand = unstable_cache(
  async (brandId: string) => listAllVisibleProductsByBrand(brandId),
  ['public-products-by-brand-v1'],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS, tags: [PUBLIC_READ_CACHE_TAGS.products] },
);

const cachedPublicProductCountsByBrand = unstable_cache(
  async (brandIdsKey: string) => countVisibleProductsByBrand(brandIdsKey ? brandIdsKey.split(',') : []),
  ['public-product-counts-by-brand-v1'],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS, tags: [PUBLIC_READ_CACHE_TAGS.products] },
);

const cachedPublicBrands = unstable_cache(
  async () => listBrands(true),
  ['public-brands-v20'],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS, tags: [PUBLIC_READ_CACHE_TAGS.brands] },
);

const cachedPublicBrandById = unstable_cache(
  async (id: string) => getBrandById(id),
  ['public-brand-by-id-v20'],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS, tags: [PUBLIC_READ_CACHE_TAGS.brands] },
);

const cachedPublicBrandBySlug = unstable_cache(
  async (slug: string) => getBrandBySlug(slug),
  ['public-brand-by-slug-v20'],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS, tags: [PUBLIC_READ_CACHE_TAGS.brands] },
);

const cachedSiteSettings = unstable_cache(
  async () => getSiteSettings(),
  ['public-site-settings-v2'],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS, tags: [PUBLIC_READ_CACHE_TAGS.siteSettings] },
);

const cachedPageTextSettings = unstable_cache(
  async () => getPageTextSettings(),
  ['public-page-texts-v1'],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS, tags: [PUBLIC_READ_CACHE_TAGS.pageTexts] },
);

const cachedCategorySettings = unstable_cache(
  async () => getCategorySettings(),
  ['public-category-settings-v3'],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS, tags: [PUBLIC_READ_CACHE_TAGS.categorySettings] },
);

const cachedPublishedCmsPageByKey = unstable_cache(
  async (pageKey: string) => getPublishedCmsPage<unknown>(pageKey),
  ['public-cms-page-by-key-v1'],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS, tags: [PUBLIC_READ_CACHE_TAGS.cmsPages] },
);

export function listCachedPublicProducts(filter: PublicProductListFilter = {}) {
  return withDevelopmentPublicReadFallback(
    () => cachedPublicProducts(filter.categorySlug, filter.brandId, filter.petType),
    () => listCanonicalPublicProducts(filter),
    '[public-read-cache] Supabase 개발환경 미설정 — 운영 공개 상품으로 렌더',
  );
}

export function getCachedSiteSettings() {
  return withDevelopmentPublicReadFallback(
    () => cachedSiteSettings(),
    () => getCanonicalPublicHomeSettings(),
    '[public-read-cache] Supabase 개발환경 미설정 — 운영 공개 홈 설정으로 렌더',
  );
}

export function getCachedPageTextSettings() {
  return withDevelopmentPublicReadFallback(
    () => cachedPageTextSettings(),
    async () => null,
    '[public-read-cache] Supabase 개발환경 미설정 — 기본 페이지 문구로 렌더',
  );
}

export function getCachedCategorySettings() {
  return withDevelopmentPublicReadFallback(
    () => cachedCategorySettings(),
    () => getCanonicalPublicCategorySettings(),
    '[public-read-cache] Supabase 개발환경 미설정 — 운영 공개 카테고리 설정으로 렌더',
  );
}

export function getCachedPublicProductById(id: string) {
  return withDevelopmentPublicReadFallback(
    () => cachedPublicProductById(id),
    () => getCanonicalPublicProductById(id),
    '[public-read-cache] Supabase 개발환경 미설정 — 운영 공개 상품 상세로 렌더',
  );
}

export function listCachedPublicProductsByBrand(brandId: string) {
  return withDevelopmentPublicReadFallback(
    () => cachedPublicProductsByBrand(brandId),
    () => listCanonicalPublicProducts({ brandId }),
    '[public-read-cache] Supabase 개발환경 미설정 — 운영 공개 브랜드 상품으로 렌더',
  );
}

export function getCachedPublicProductCountsByBrand(brandIds: string[]) {
  const key = [...new Set(brandIds)].sort().join(',');
  return withDevelopmentPublicReadFallback(
    () => cachedPublicProductCountsByBrand(key),
    () => getCanonicalPublicProductCountsByBrand(brandIds),
    '[public-read-cache] Supabase 개발환경 미설정 — 운영 공개 상품 수로 렌더',
  );
}

export function listCachedPublicBrands() {
  return withDevelopmentPublicReadFallback(
    () => cachedPublicBrands(),
    () => listCanonicalPublicBrands(),
    '[public-read-cache] Supabase 개발환경 미설정 — 운영 공개 브랜드로 렌더',
  );
}

export function getCachedPublicBrandById(id: string) {
  return withDevelopmentPublicReadFallback(
    () => cachedPublicBrandById(id),
    () => getCanonicalPublicBrandById(id),
    '[public-read-cache] Supabase 개발환경 미설정 — 운영 공개 브랜드 상세로 렌더',
  );
}

export function getCachedPublicBrandBySlug(slug: string) {
  return withDevelopmentPublicReadFallback(
    () => cachedPublicBrandBySlug(slug),
    () => getCanonicalPublicBrandBySlug(slug),
    '[public-read-cache] Supabase 개발환경 미설정 — 운영 공개 브랜드 상세로 렌더',
  );
}

/**
 * CMS 게시본 읽기 캐시. getPublishedCmsPage(repo.ts)는 __managedVersion 마커로 이미 게이트돼
 * 있으므로 여기서는 캐시 계층만 얹는다 — 개발환경 빈 폴백을 두지 않는 이유는 getPublishedPageContent
 * (lib/cms/content.ts)가 CmsSchemaUnavailable을 이미 null로 흡수하기 때문이다(이중 흡수 방지).
 */
export function cachedPublishedCmsPage(pageKey: string): Promise<unknown> {
  return cachedPublishedCmsPageByKey(pageKey);
}
