import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/data/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: [
          'meta-externalagent',
          'Meta-ExternalFetcher',
          'Meta-WebIndexer',
          'GPTBot',
          'Amazonbot',
        ],
        disallow: '/',
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/mypage/', '/checkout/', '/order-complete/', '/auth/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
