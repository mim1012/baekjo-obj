import { listProducts } from '@/lib/products/repo';
import { listBrands } from '@/lib/brands/repo';
import { getConcernsConfigWithFallback } from '@/lib/concerns/repo';
import ShopContent from '@/components/shop/ShopContent';

// 필터 UI(useSearchParams)는 클라이언트 컴포넌트로 유지하고, 데이터는 서버에서
// repo 로 읽어 props 로 내려준다(콘센트 — 컴포넌트에서 fetch/DB 직접 접근 금지).
// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  const [products, brands, concernsConfig] = await Promise.all([
    listProducts(),
    listBrands(),
    getConcernsConfigWithFallback(),
  ]);
  return <ShopContent products={products} brands={brands} concerns={concernsConfig.items} />;
}
