import { listProducts } from '@/lib/products/repo';
import { listBrands } from '@/lib/brands/repo';
import { getSiteSettings } from '@/lib/settings/repo';
import { defaultHomeSettings } from '@/data/homeContent';
import HomeClient from '@/components/home/HomeClient';

// 서버 컴포넌트이므로 storage(클라용 fetch 콘센트)를 거치지 않고 DB repo 를 직접 읽는다
// (자기 /api 로의 HTTP 왕복·셀프콜 타임아웃 제거). 필터는 /api/products·/api/brands 의
// 공개 목록과 동일하게 맞춘다(visibleOnly). 요청 시점 DB 조회라 정적 프리렌더 대상에서 제외.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [products, brands, settings] = await Promise.all([
    listProducts({ visibleOnly: true }),
    listBrands(true),
    // 홈 문구의 정본은 관리자 설정(site_settings)이다. 저장 행이 없거나 조회 실패 시엔
    // defaultHomeSettings 로 폴백한다 — 공개 홈은 어떤 경우에도 문구가 비면 안 된다.
    getSiteSettings().catch(() => null),
  ]);
  return <HomeClient products={products} brands={brands} settings={settings ?? defaultHomeSettings} />;
}
