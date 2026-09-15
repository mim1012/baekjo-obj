import { getCachedPageTextSettings, listCachedPublicBrands, listCachedPublicProducts } from '@/lib/public-read-cache';
import { getConcernsConfigWithFallback } from '@/lib/concerns/repo';
import { getPublishedPageContent } from '@/lib/cms/content';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { logServerError } from '@/lib/logServerError';
import { selectShopContent, type ShopContentData } from '@/lib/cms/source/shop';
import ShopContent from '@/components/shop/ShopContent';

export const metadata = {
  title: '검증 상품 셀렉션',
  description: '백조오브제가 기준에 따라 살펴본 반려동물 상품을 카테고리와 브랜드별로 만나보세요.',
  alternates: { canonical: '/shop' },
  openGraph: { url: '/shop' },
};

// 필터 UI(useSearchParams)는 클라이언트 컴포넌트로 유지하고, 데이터는 서버에서
// repo 로 읽어 props 로 내려준다(콘센트 — 컴포넌트에서 fetch/DB 직접 접근 금지).
// DB를 읽는 서버 컴포넌트라 빌드타임 프리렌더 대신 요청 시 렌더한다(관리자 편집 즉시 반영).
export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  const [products, brands, concernsConfig] = await Promise.all([
    listCachedPublicProducts(),
    listCachedPublicBrands(),
    getConcernsConfigWithFallback(),
  ]);

  // D3: 소비자는 항상 getPublishedPageContent(key) ?? mapper(현재 소스) 2단으로 콘텐츠를 얻는다.
  const published = await getPublishedPageContent<ShopContentData>('shop').catch((error: unknown) => {
    logServerError('[Shop] CMS 조회 실패', error);
    return null;
  });
  const managed = published !== null;
  let settings = defaultPageTextSettings;
  if (!managed) {
    try {
      settings = await getCachedPageTextSettings() ?? defaultPageTextSettings;
    } catch (error) {
      logServerError('[Shop] 기존 페이지 문구 조회 실패', error);
    }
  }
  const content = selectShopContent(published, settings);

  return <ShopContent products={products} brands={brands} concerns={concernsConfig.items} content={content} managed={managed} />;
}
