import { listProducts } from '@/lib/products/repo';
import { listBrands } from '@/lib/brands/repo';
import ShopContent from '@/components/shop/ShopContent';

// 필터 UI(useSearchParams)는 클라이언트 컴포넌트로 유지하고, 데이터는 서버에서
// repo 로 읽어 props 로 내려준다(콘센트 — 컴포넌트에서 fetch/DB 직접 접근 금지).
export default async function ShopPage() {
  const [products, brands] = await Promise.all([listProducts(), listBrands()]);
  return <ShopContent products={products} brands={brands} />;
}
