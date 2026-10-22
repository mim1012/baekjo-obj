import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/data/site';

// robots.ts는 빌드 시 캐시되는 Route Handler라 VERCEL_ENV도 빌드 시점 값으로 고정된다.
// Production 배포만 색인을 허용하고, Preview·로컬 빌드는 전면 차단한다.
// (2026-10 Preview /shop 필터 URL을 GoogleOther가 약 420만 회 크롤링해 Vercel 함수·Observability
//  비용과 staging Supabase egress가 급증한 사고 재발 방지.)
const IS_PRODUCTION_DEPLOYMENT = process.env.VERCEL_ENV === 'production';

export default function robots(): MetadataRoute.Robots {
  if (!IS_PRODUCTION_DEPLOYMENT) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  return {
    rules: [
      {
        userAgent: [
          'meta-externalagent',
          'Meta-ExternalFetcher',
          'Meta-WebIndexer',
          'GPTBot',
          'Amazonbot',
          // GoogleOther 계열은 검색 색인(Googlebot)과 별개인 수집용 크롤러라 막아도 검색 노출에 영향이 없다.
          'GoogleOther',
          'GoogleOther-Image',
          'GoogleOther-Video',
        ],
        disallow: '/',
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin/',
          '/api/',
          '/mypage/',
          '/checkout/',
          '/order-complete/',
          '/auth/',
          // /shop 필터·정렬 조합(?petType=…&sort=…)은 같은 HTML을 무한히 만든다. canonical은 /shop이고
          // 매 요청이 force-dynamic 함수 실행이라, 쿼리 붙은 목록 URL은 크롤링에서 제외한다.
          '/shop?',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
