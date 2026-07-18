import { listProducts } from '@/lib/products/repo';
import { listBrands } from '@/lib/brands/repo';
import { getSiteSettings } from '@/lib/settings/repo';
import { getNoticesConfigWithFallback } from '@/lib/notices/repo';
import { getShowcaseReviewsConfigWithFallback } from '@/lib/reviews/repo';
import { defaultHomeSettings } from '@/data/homeContent';
import HomeClient from '@/components/home/HomeClient';

// 서버 컴포넌트이므로 storage(클라용 fetch 콘센트)를 거치지 않고 DB repo 를 직접 읽는다
// (자기 /api 로의 HTTP 왕복·셀프콜 타임아웃 제거). 필터는 /api/products·/api/brands 의
// 공개 목록과 동일하게 맞춘다(visibleOnly). 요청 시점 DB 조회라 정적 프리렌더 대상에서 제외.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [products, brands, settings, noticesConfig, reviewsConfig] = await Promise.all([
    listProducts({ visibleOnly: true }),
    listBrands(true),
    // 홈 문구의 정본은 관리자 설정(site_settings)이다. 저장 행이 없거나 조회 실패 시엔
    // defaultHomeSettings 로 폴백한다 — 공개 홈은 어떤 경우에도 문구가 비면 안 된다.
    getSiteSettings().catch(() => null),
    // 공지도 DB 가 정본(notices_config) — 미저장·실패는 repo 가 default 로 접는다.
    getNoticesConfigWithFallback(),
    // 전시용 후기도 DB 가 정본(showcase_reviews_config) — 미저장·실패는 repo 가 default 로 접는다.
    getShowcaseReviewsConfigWithFallback(),
  ]);
  // 공지 config 는 append 순서로 저장된다 — 공개 화면은 최신순 정렬(2026-07-18 CRUD e2e 구축 중
  // 발견: 새 공지가 홈 소식에 절대 안 뜨던 버그. HomeClient 가 notices.slice(0, 4)로 앞 4건만 취해
  // append 순서 그대로면 항상 가장 오래된 4건만 보였다). date 는 YYYY-MM-DD 문자열이라 localeCompare
  // 로 비교하고, JS sort 는 안정 정렬이라 같은 날짜는 admin 저장 순서를 유지한다.
  const sortedNotices = [...noticesConfig.items].sort((a, b) => b.date.localeCompare(a.date));
  return <HomeClient products={products} brands={brands} notices={sortedNotices} reviews={reviewsConfig.items.filter((review) => review.isVisible !== false)} settings={settings ?? defaultHomeSettings} />;
}
