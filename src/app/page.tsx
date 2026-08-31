import {
  getCachedSiteSettings,
  listCachedPublicBrands,
  listCachedPublicProducts,
} from '@/lib/public-read-cache';
import { getNoticesConfigWithFallback } from '@/lib/notices/repo';
import { getShowcaseReviewsConfigWithFallback } from '@/lib/reviews/repo';
import { defaultHomeSettings } from '@/data/homeContent';
import HomeClient from '@/components/home/HomeClient';
import { getPublicNotices } from '@/lib/notices/publicVisibility';
import { getPublishedPageContent } from '@/lib/cms/content';
import type { SiteShellContent } from '@/components/providers/PublicSiteContentProvider';

export const metadata = {
  alternates: { canonical: '/' },
};

// 서버 컴포넌트이므로 storage(클라용 fetch 콘센트)를 거치지 않고 DB repo 를 직접 읽는다
// (자기 /api 로의 HTTP 왕복·셀프콜 타임아웃 제거). 필터는 /api/products·/api/brands 의
// 공개 목록과 동일하게 맞춘다(visibleOnly). 요청 시점 DB 조회라 정적 프리렌더 대상에서 제외.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [products, brands, settings, noticesConfig, reviewsConfig, shell] = await Promise.all([
    listCachedPublicProducts(),
    listCachedPublicBrands(),
    // 홈 문구의 정본은 관리자 설정(site_settings)이다. 저장 행이 없거나 조회 실패 시엔
    // defaultHomeSettings 로 폴백한다 — 공개 홈은 어떤 경우에도 문구가 비면 안 된다.
    getCachedSiteSettings().catch(() => null),
    // 공지도 DB 가 정본(notices_config) — 미저장·실패는 repo 가 default 로 접는다.
    getNoticesConfigWithFallback(),
    // 전시용 후기도 DB 가 정본(showcase_reviews_config) — 미저장·실패는 repo 가 default 로 접는다.
    getShowcaseReviewsConfigWithFallback(),
    getPublishedPageContent<SiteShellContent & Record<string, unknown>>('site-shell'),
  ]);
  // 공지 config 는 append 순서로 저장된다 — 공개 화면은 최신순 정렬(2026-07-18 CRUD e2e 구축 중
  // 발견: 새 공지가 홈 소식에 절대 안 뜨던 버그. HomeClient 가 notices.slice(0, 4)로 앞 4건만 취해
  // append 순서 그대로면 항상 가장 오래된 4건만 보였다). date 는 YYYY-MM-DD 문자열이라 localeCompare
  // 로 비교하고, JS sort 는 안정 정렬이라 같은 날짜는 admin 저장 순서를 유지한다.
  const sortedNotices = getPublicNotices(noticesConfig.items, shell.features.insurance)
    .sort((a, b) => b.date.localeCompare(a.date));
  const { insuranceBanner, ...publicHomeSettings } = settings ?? defaultHomeSettings;
  // 보험 기능을 다시 켤 때는 저장된 설정을 그대로 복원한다. 비활성 중에는 클라이언트
  // props에서도 제외해 화면뿐 아니라 공개 HTML/RSC payload에도 보험 문구가 노출되지 않게 한다.
  const visibleHomeSettings = shell.features.insurance
    ? { ...publicHomeSettings, insuranceBanner }
    : {
        ...publicHomeSettings,
        solutions: {
          ...publicHomeSettings.solutions,
          cards: publicHomeSettings.solutions.cards.filter((card) => !card.href.startsWith('/insurance')),
        },
      };
  return <HomeClient products={products} brands={brands} notices={sortedNotices} reviews={reviewsConfig.items.filter((review) => review.isVisible !== false)} settings={visibleHomeSettings} />;
}
