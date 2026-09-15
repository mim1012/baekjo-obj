import { getCachedPublicProductCountsByBrand, getCachedPageTextSettings, listCachedPublicBrands } from '@/lib/public-read-cache';
import { getPublishedPageContent } from '@/lib/cms/content';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { logServerError } from '@/lib/logServerError';
import { selectBrandsContent, type BrandsContentData } from '@/lib/cms/source/brands';
import BrandsContent from '@/components/brands/BrandsContent';

export const metadata = {
  title: '큐레이션 브랜드',
  description: '공개 자료와 브랜드 제출 자료를 바탕으로 백조오브제의 자체 기준에 따라 살펴본 반려동물 브랜드를 소개합니다.',
  alternates: { canonical: '/brands' },
  openGraph: { url: '/brands' },
};

// 필터 탭(useSearchParams)은 클라이언트 컴포넌트로 유지하고, 브랜드 목록은 서버에서
// repo 로 읽어 props 로 내려준다(콘센트 — 컴포넌트에서 fetch/DB 직접 접근 금지).
// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export default async function BrandsPage() {
  const brands = await listCachedPublicBrands();
  const productCounts = await getCachedPublicProductCountsByBrand(brands.map((brand) => brand.id));

  // D3: 소비자는 항상 getPublishedPageContent(key) ?? mapper(현재 소스) 2단으로 콘텐츠를 얻는다.
  const published = await getPublishedPageContent<BrandsContentData>('brands').catch((error: unknown) => {
    logServerError('[Brands] CMS 조회 실패', error);
    return null;
  });
  const managed = published !== null;
  let settings = defaultPageTextSettings;
  if (!managed) {
    try {
      settings = await getCachedPageTextSettings() ?? defaultPageTextSettings;
    } catch (error) {
      logServerError('[Brands] 기존 페이지 문구 조회 실패', error);
    }
  }
  const content = selectBrandsContent(published, settings);

  return <BrandsContent brands={brands} productCounts={productCounts} content={content} managed={managed} />;
}
