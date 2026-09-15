// shop(/shop) 페이지의 소스 매퍼 — page-texts(site_settings id='page-texts') 하나를 원본으로 삼는다.
// audit(source/audit.ts)과 같은 D3 패턴: 부트스트랩(활성화)과 공개 페이지 소비가 같은 순수 매퍼
// buildShopContent를 쓴다. shop은 audit과 달리 legacy 매퍼 파일이 없었으므로 build/select를
// 이 파일에서 직접 정의한다.
//
// page-texts 'shop' 블록(src/data/pageTextContent.ts)에 있는 필드(eyebrow/title/description/
// searchPlaceholder/dailyPick/filter/noResult)만 site_settings에서 읽고, 나머지(필터·정렬 이름,
// 가격대 라벨 등)는 현재 화면 그대로의 리터럴이다 — 이 값들은 pageDefinitions.ts의 shop
// defaultContent와 반드시 같은 값을 유지한다(cms-source-mapper-contract.spec.ts가 검증).
//
// 'server-only'를 import하지 않는다 — cms-source-mapper-contract.spec.ts가 이 파일을 그대로
// 로드해 normalize(build(...))를 검증한다.
import { defaultPageTextSettings, normalizePageTextSettings, type PageTextSettings } from '@/data/pageTextContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

export type ShopContentData = Record<string, unknown> & {
  readonly hero: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly searchPlaceholder: string;
    readonly searchButtonLabel: string;
  };
  readonly featured: { readonly visible: boolean; readonly title: string };
  readonly catalog: {
    readonly allLabel: string;
    readonly allProductsLabel: string;
    readonly filterLabel: string;
    readonly resetLabel: string;
    readonly countSuffix: string;
    readonly resultsButtonSuffix: string;
  };
  readonly filters: {
    readonly petTypeTitle: string;
    readonly categoryTitle: string;
    readonly lifestyleTitle: string;
    readonly brandTitle: string;
    readonly priceTitle: string;
    readonly detailLabel: string;
    readonly concernTitle: string;
    readonly ratingTitle: string;
    readonly allOptionLabel: string;
    readonly dogLabel: string;
    readonly catLabel: string;
    readonly smallLabel: string;
    readonly allRatingLabel: string;
    readonly ratingFourLabel: string;
    readonly ratingFourHalfLabel: string;
    readonly priceUnderLabel: string;
    readonly priceMidLabel: string;
    readonly priceHighLabel: string;
    readonly priceOverLabel: string;
    readonly sortRecommendedLabel: string;
    readonly sortPopularLabel: string;
    readonly sortNewestLabel: string;
    readonly sortReviewsLabel: string;
    readonly sortPriceLowLabel: string;
    readonly sortPriceHighLabel: string;
  };
  readonly empty: { readonly title: string; readonly buttonLabel: string };
};

/** Pure mapping from page-text settings (+ 현재 화면 리터럴) to the shop CMS definition shape. */
export function buildShopContent(settings: PageTextSettings): ShopContentData {
  const text = (id: string) => settings.values[`shop.${id}`] ?? defaultPageTextSettings.values[`shop.${id}`];
  return {
    hero: {
      eyebrow: text('eyebrow'),
      title: text('title'),
      description: text('description'),
      searchPlaceholder: text('searchPlaceholder'),
      searchButtonLabel: '검색',
    },
    featured: { visible: true, title: text('dailyPick') },
    catalog: {
      allLabel: '전체',
      allProductsLabel: '전체 상품',
      filterLabel: text('filter'),
      resetLabel: '필터 초기화',
      countSuffix: '개',
      resultsButtonSuffix: '개 상품 보기',
    },
    filters: {
      petTypeTitle: '반려동물', categoryTitle: '카테고리', lifestyleTitle: '라이프스타일', brandTitle: '브랜드', priceTitle: '가격',
      detailLabel: '상세 필터 +', concernTitle: '고민', ratingTitle: '평점', allOptionLabel: '전체',
      dogLabel: '강아지', catLabel: '고양이', smallLabel: '소동물', allRatingLabel: '전체 평점',
      ratingFourLabel: '4.0 이상', ratingFourHalfLabel: '4.5 이상',
      priceUnderLabel: '2만원 미만', priceMidLabel: '2-5만원', priceHighLabel: '5-10만원', priceOverLabel: '10만원 이상',
      sortRecommendedLabel: '기본순', sortPopularLabel: '인기순', sortNewestLabel: '최신순',
      sortReviewsLabel: '후기 많은 순', sortPriceLowLabel: '낮은 가격순', sortPriceHighLabel: '높은 가격순',
    },
    empty: { title: text('noResult'), buttonLabel: '필터 초기화' },
  };
}

export function selectShopContent(published: ShopContentData | null, settings: PageTextSettings): ShopContentData {
  return published ?? buildShopContent(settings);
}

export const shopSourceMapper: CmsSourceMapper = {
  siteSettingIds: ['page-texts'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('shop');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:shop');
    const rawPageTexts = sources['page-texts']?.value ?? defaultPageTextSettings;
    return normalizeCmsPageContent(definition, buildShopContent(normalizePageTextSettings(rawPageTexts)));
  },
};
