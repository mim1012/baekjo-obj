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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, brands, concerns, notices] = await Promise.all([
    listCachedPublicProducts(),
    listCachedPublicBrands(),
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
      url: `${SITE_URL}/brands/${encodeURIComponent(brand.id)}`,
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
