import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/data/site';
import { getConcernsConfigWithFallback } from '@/lib/concerns/repo';
import { getNoticesConfigWithFallback } from '@/lib/notices/repo';
import { listCachedPublicBrands, listCachedPublicProducts } from '@/lib/public-read-cache';

const PUBLIC_ROUTES = [
  '',
  '/shop',
  '/brands',
  '/concerns',
  '/audit',
  '/experts',
  '/reviews',
  '/notices',
  '/insurance',
  '/b2b',
  '/landing/care-kit',
  '/landing/insurance',
  '/terms',
  '/privacy',
  '/refund-policy',
];

/** DB 조회 실패(예: Supabase env 없는 CI 빌드의 프리렌더) 시 던지지 않고 빈 목록으로 폴백한다 —
 *  concerns/notices repo의 WithFallback 패턴과 동일한 사상. 정적 경로만으로도 sitemap은 유효하다. */
function safeList<T>(promise: Promise<T[]>, label: string): Promise<T[]> {
  return promise.catch((error: unknown) => {
    console.warn(`[sitemap] ${label} 조회 실패 — 정적 경로만 포함`, {
      message: error instanceof Error ? error.message : String(error),
    });
    return [];
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, brands, concerns, notices] = await Promise.all([
    safeList(listCachedPublicProducts(), 'products'),
    safeList(listCachedPublicBrands(), 'brands'),
    getConcernsConfigWithFallback(),
    getNoticesConfigWithFallback(),
  ]);

  return [
    ...PUBLIC_ROUTES.map((route, index) => ({
      url: `${SITE_URL}${route}`,
      changeFrequency: index === 0 ? ('daily' as const) : ('weekly' as const),
      priority: index === 0 ? 1 : route === '/shop' || route === '/brands' ? 0.9 : 0.7,
    })),
    ...products.map((product) => ({
      url: `${SITE_URL}/shop/${encodeURIComponent(product.id)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...brands.map((brand) => ({
      url: `${SITE_URL}/brands/${encodeURIComponent(brand.slug)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...concerns.items.map((concern) => ({
      url: `${SITE_URL}/concerns/${encodeURIComponent(concern.slug)}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...notices.items.map((notice) => ({
      url: `${SITE_URL}/notices/${encodeURIComponent(notice.id)}`,
      lastModified: notice.date,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
