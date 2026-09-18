import {
  listCachedPublicBrands,
  listCachedPublicProducts,
} from '@/lib/public-read-cache';
import { getSiteSettings } from '@/lib/settings/repo';
import { getNoticesConfigWithFallback } from '@/lib/notices/repo';
import { getShowcaseReviewsConfigWithFallback } from '@/lib/reviews/repo';
import { selectHomeContent, type HomeCmsContent } from '@/lib/cms/source/home';
import { getPublishedPageContent } from '@/lib/cms/content';
import HomeClient from '@/components/home/HomeClient';
import { FEATURES } from '@/config/features';
import { getPublicNotices } from '@/lib/notices/publicVisibility';
import { logServerError } from '@/lib/logServerError';

export const metadata = {
  alternates: { canonical: '/' },
};

// 서버 컴포넌트이므로 storage(클라용 fetch 콘센트)를 거치지 않고 DB repo 를 직접 읽는다
// (자기 /api 로의 HTTP 왕복·셀프콜 타임아웃 제거). 필터는 /api/products·/api/brands 의
// 공개 목록과 동일하게 맞춘다(visibleOnly). 요청 시점 DB 조회라 정적 프리렌더 대상에서 제외.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [products, brands, settings, cmsHome, noticesConfig, reviewsConfig] = await Promise.all([
    listCachedPublicProducts(),
    listCachedPublicBrands(),
    // 홈 문구의 기존 정본은 관리자 설정(site_settings). 저장 행이 없거나 조회 실패 시엔
    // defaultHomeSettings 로 폴백한다 — 공개 홈은 어떤 경우에도 문구가 비면 안 된다.
    getSiteSettings().catch(() => null),
    // 홈이 페이지 관리(CMS)에서 "현재 값 가져오기"로 활성화되어 게시본을 가지면 그것이 새 정본이
    // 된다(D3) — 없으면(null) 아래 selectHomeContent가 위 settings 경로로 그대로 폴백한다
    // (소비자 이중화 없음, 기존 동작 불변). audit/b2b 등 다른 CMS 소비자 페이지와 동일하게 조회
    // 실패도 null로 접어 홈이 통째로 죽지 않게 한다(src/app/audit/page.tsx 패턴).
    getPublishedPageContent<HomeCmsContent>('home').catch((error: unknown) => {
      logServerError('[Home] CMS 조회 실패', error);
      return null;
    }),
    getNoticesConfigWithFallback(),
    // 전시용 후기도 DB 가 정본(showcase_reviews_config) — 미저장·실패는 repo 가 default 로 접는다.
    getShowcaseReviewsConfigWithFallback(),
  ]);
  // 공지 config 는 append 순서로 저장된다 — 공개 화면은 최신순 정렬(2026-07-18 CRUD e2e 구축 중
  // 발견: 새 공지가 홈 소식에 절대 안 뜨던 버그. HomeClient 가 notices.slice(0, 4)로 앞 4건만 취해
  // append 순서 그대로면 항상 가장 오래된 4건만 보였다). date 는 YYYY-MM-DD 문자열이라 localeCompare
  // 로 비교하고, JS sort 는 안정 정렬이라 같은 날짜는 admin 저장 순서를 유지한다.
  const sortedNotices = getPublicNotices(noticesConfig.items)
    .sort((a, b) => b.date.localeCompare(a.date));
  const resolvedSettings = selectHomeContent(cmsHome, settings);
  const { insuranceBanner, ...publicHomeSettings } = resolvedSettings;
  // 보험 기능을 다시 켤 때는 저장된 설정을 그대로 복원한다. 비활성 중에는 클라이언트
  // props에서도 제외해 화면뿐 아니라 공개 HTML/RSC payload에도 보험 문구가 노출되지 않게 한다.
  const visibleHomeSettings = FEATURES.insurance
    ? { ...publicHomeSettings, insuranceBanner }
    : publicHomeSettings;
  return (
    <HomeClient
      products={products}
      brands={brands}
      notices={sortedNotices}
      reviews={reviewsConfig.items.filter((review) => review.isVisible !== false)}
      settings={visibleHomeSettings}
      cmsManaged={cmsHome !== null}
    />
  );
}
