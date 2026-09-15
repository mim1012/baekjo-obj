// reviews(/reviews) 페이지의 "현재 값 가져오기(최초 활성화)" 소스 매퍼.
//
// 목록 데이터(후기 자체)는 여전히 reviews repo(getShowcaseReviewsConfigWithFallback)가 정본이다 —
// 여기서 관리하는 건 화면 위쪽 제목·통계 이름·필터 이름·빈 목록 문구뿐이다. 이 화면은 page-texts에
// 자기 그룹이 없고 src/app/reviews/page.tsx는 전부 리터럴이라, 매퍼도 그 리터럴을 그대로 반환한다.
import { defaultPageTextSettings, normalizePageTextSettings, type PageTextSettings } from '@/data/pageTextContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

export interface ReviewsFilterItem {
  readonly value: string;
  readonly label: string;
  readonly visible: boolean;
}

export type ReviewsContent = Record<string, unknown> & {
  readonly __managedVersion?: number;
  readonly hero: {
    readonly eyebrow: string;
    readonly title: string;
  };
  readonly stats: {
    readonly totalLabel: string;
    readonly ratingLabel: string;
    readonly photoLabel: string;
    readonly countSuffix: string;
  };
  readonly filters: readonly ReviewsFilterItem[];
  readonly empty: {
    readonly title: string;
    readonly description: string;
  };
};

/** Pure — 오늘의 src/app/reviews/page.tsx 리터럴을 그대로 반영한다. */
export function buildReviewsContent(_settings: PageTextSettings): ReviewsContent {
  return {
    hero: { eyebrow: 'REAL EXPERIENCES', title: '보호자 후기' },
    stats: { totalLabel: 'Total voices', ratingLabel: 'Average rating', photoLabel: 'Photo reviews', countSuffix: '개' },
    filters: [
      { value: 'all', label: '전체', visible: true },
      { value: 'photo', label: '사진 후기', visible: true },
      { value: 'dog', label: '강아지', visible: true },
      { value: 'cat', label: '고양이', visible: true },
      { value: 'small', label: '소동물', visible: true },
      { value: 'other', label: '기타', visible: true },
    ],
    empty: { title: '후기가 없습니다.', description: '아직 등록된 후기가 없습니다.' },
  };
}

export function selectReviewsContent(published: ReviewsContent | null, settings: PageTextSettings): ReviewsContent {
  return published ?? buildReviewsContent(settings);
}

export const reviewsSourceMapper: CmsSourceMapper = {
  siteSettingIds: ['page-texts'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('reviews');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:reviews');
    const rawPageTexts = sources['page-texts']?.value ?? defaultPageTextSettings;
    return normalizeCmsPageContent(definition, buildReviewsContent(normalizePageTextSettings(rawPageTexts)));
  },
};
