import { unstable_cache } from 'next/cache';
import { getBrandById, getBrandBySlug, listBrands } from '@/lib/brands/repo';
import { getCategorySettings } from '@/lib/categorySettings/repo';
import {
  countVisibleProductsByBrand,
  getProductById,
  listAllVisibleProductsByBrand,
  listProducts,
  type ProductListFilter,
} from '@/lib/products/repo';
import { getSiteSettings } from '@/lib/settings/repo';

export const PUBLIC_READ_CACHE_TAGS = {
  products: 'public-products',
  brands: 'public-brands',
  categorySettings: 'public-category-settings',
  siteSettings: 'public-site-settings',
} as const;

export const EXPIRE_PUBLIC_READ_CACHE = { expire: 0 } as const;

export const PUBLIC_READ_CACHE_CONTROL = 'public, max-age=60, stale-while-revalidate=300';

type PublicProductListFilter = Omit<ProductListFilter, 'visibleOnly'>;

const PUBLIC_READ_REVALIDATE_SECONDS = 60;

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

export const getCachedSiteSettings = unstable_cache(
  async () => getSiteSettings(),
  ['public-site-settings-v2'],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS, tags: [PUBLIC_READ_CACHE_TAGS.siteSettings] },
);

export const getCachedCategorySettings = unstable_cache(
  async () => getCategorySettings(),
  ['public-category-settings-v3'],
  { revalidate: PUBLIC_READ_REVALIDATE_SECONDS, tags: [PUBLIC_READ_CACHE_TAGS.categorySettings] },
);

export function listCachedPublicProducts(filter: PublicProductListFilter = {}) {
  return cachedPublicProducts(filter.categorySlug, filter.brandId, filter.petType);
}

export function getCachedPublicProductById(id: string) {
  return cachedPublicProductById(id);
}

export function listCachedPublicProductsByBrand(brandId: string) {
  return cachedPublicProductsByBrand(brandId);
}

export function getCachedPublicProductCountsByBrand(brandIds: string[]) {
  const key = [...new Set(brandIds)].sort().join(',');
  return cachedPublicProductCountsByBrand(key);
}

export function listCachedPublicBrands() {
  return cachedPublicBrands();
}

export function getCachedPublicBrandById(id: string) {
  return cachedPublicBrandById(id);
}

export function getCachedPublicBrandBySlug(slug: string) {
  return cachedPublicBrandBySlug(slug);
}
