import { getCachedPublicProductCountsByBrand, listCachedPublicBrands } from '@/lib/public-read-cache';
import BrandsContent, { type BrandsPageContent } from '@/components/brands/BrandsContent';
import { getPublishedPageContent } from '@/lib/cms/content';

export const metadata = {
  title: '검증 브랜드',
  description: '브랜드 철학부터 성분과 제조 과정까지 백조오브제가 살펴본 반려동물 브랜드를 소개합니다.',
  alternates: { canonical: '/brands' },
  openGraph: { url: '/brands' },
};

// 필터 탭(useSearchParams)은 클라이언트 컴포넌트로 유지하고, 브랜드 목록은 서버에서
// repo 로 읽어 props 로 내려준다(콘센트 — 컴포넌트에서 fetch/DB 직접 접근 금지).
// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export default async function BrandsPage() {
  const [brands, content] = await Promise.all([
    listCachedPublicBrands(),
    getPublishedPageContent<BrandsPageContent & Record<string, unknown>>('brands'),
  ]);
  const productCounts = await getCachedPublicProductCountsByBrand(brands.map((brand) => brand.id));
  return <BrandsContent brands={brands} productCounts={productCounts} content={content} />;
}
