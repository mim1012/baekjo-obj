import { listProducts } from '@/lib/products/repo';
import { listBrands } from '@/lib/brands/repo';
import HomeClient from '@/components/home/HomeClient';

// 서버 컴포넌트이므로 storage(클라용 fetch 콘센트)를 거치지 않고 DB repo 를 직접 읽는다
// (자기 /api 로의 HTTP 왕복·셀프콜 타임아웃 제거). 필터는 /api/products·/api/brands 의
// 공개 목록과 동일하게 맞춘다(visibleOnly). 요청 시점 DB 조회라 정적 프리렌더 대상에서 제외.
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [products, brands] = await Promise.all([
    listProducts({ visibleOnly: true }),
    listBrands(true),
  ]);
  return <HomeClient products={products} brands={brands} />;
}
