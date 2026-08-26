import type { MetadataRoute } from 'next';

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
        disallow: ['/admin/', '/api/', '/mypage/', '/checkout/'],
      },
    ],
    host: 'https://www.baekjo-objet.com',
  };
}
