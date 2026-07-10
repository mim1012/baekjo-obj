import { listProducts } from '@/lib/products/repo';
import { listBrands } from '@/lib/brands/repo';
import HomeClient from '@/components/home/HomeClient';

// 홈은 useSiteSettings 등 클라이언트 훅이 많아 클라이언트 컴포넌트로 유지하고,
// 상품·브랜드 데이터만 서버에서 repo 로 읽어 props 로 내려준다(콘센트).
export default async function Home() {
  const [products, brands] = await Promise.all([listProducts(), listBrands()]);
  return <HomeClient products={products} brands={brands} />;
}
