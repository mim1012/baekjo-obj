// brands(/brands) 페이지의 소스 매퍼 — page-texts(site_settings id='page-texts') 하나를 원본으로
// 삼는다. audit(source/audit.ts)과 같은 D3 패턴: 부트스트랩(활성화)과 공개 페이지 소비가 같은
// 순수 매퍼 buildBrandsContent를 쓴다. brands는 legacy 매퍼 파일이 없었으므로 build/select를
// 이 파일에서 직접 정의한다.
//
// page-texts 'brands' 블록(src/data/pageTextContent.ts)에 있는 필드(eyebrow/titleLine1/2/
// description/valueTitle/spotlight/detailLink/emptyTitle/emptyDescription/partnerTitle/
// partnerDescription1/2/partnerButton)만 site_settings에서 읽는다. 나머지(선정 기준 카드 5건,
// 이미지 경로, 필터 탭 이름 등)는 현재 화면 그대로의 리터럴이다 — 이 값들은 pageDefinitions.ts의
// brands defaultContent와 반드시 같은 값을 유지한다(cms-source-mapper-contract.spec.ts가 검증).
//
// 'server-only'를 import하지 않는다 — cms-source-mapper-contract.spec.ts가 이 파일을 그대로
// 로드해 normalize(build(...))를 검증한다.
import { defaultPageTextSettings, normalizePageTextSettings, type PageTextSettings } from '@/data/pageTextContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

type BrandStandardItem = { readonly title: string; readonly description: string; readonly visible: boolean };

export type BrandsContentData = Record<string, unknown> & {
  readonly hero: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly image: string;
    readonly imageAlt: string;
    readonly countSuffix: string;
  };
  readonly standards: { readonly visible: boolean; readonly title: string; readonly items: readonly BrandStandardItem[] };
  readonly spotlight: {
    readonly visible: boolean;
    readonly label: string;
    readonly buttonLabel: string;
    readonly fallbackText: string;
  };
  readonly catalog: {
    readonly sortDefaultLabel: string;
    readonly sortAzLabel: string;
    readonly loadMoreLabel: string;
    readonly filterAllLabel: string;
    readonly filterRecommendedLabel: string;
    readonly filterNewLabel: string;
  };
  readonly empty: { readonly title: string; readonly description: string; readonly buttonLabel: string };
  readonly partnership: {
    readonly visible: boolean;
    readonly title: string;
    readonly description: string;
    readonly image: string;
    readonly imageAlt: string;
    readonly buttonLabel: string;
    readonly buttonHref: string;
  };
};

/** Pure mapping from page-text settings (+ 현재 화면 리터럴) to the brands CMS definition shape. */
export function buildBrandsContent(settings: PageTextSettings): BrandsContentData {
  const text = (id: string) => settings.values[`brands.${id}`] ?? defaultPageTextSettings.values[`brands.${id}`];
  return {
    hero: {
      eyebrow: text('eyebrow'),
      title: [text('titleLine1'), text('titleLine2')].join('\n'),
      description: text('description'),
      image: '/images/brands-hero-cat-architectural.png',
      imageAlt: '햇살이 드는 공간에 앉아 있는 고양이',
      countSuffix: '곳의 큐레이션 브랜드',
    },
    standards: {
      visible: true,
      title: text('valueTitle'),
      items: [
        { title: 'WHO', description: '반려동물의 행복을 가장 먼저 생각하는 브랜드', visible: true },
        { title: 'VALUE', description: '제품 하나에도 브랜드의 철학과 진심을 담는 브랜드', visible: true },
        { title: 'PRINCIPLE', description: '제품이 만들어지는 과정에서도 타협하지 않는 브랜드', visible: true },
        { title: 'SAFETY', description: '안전 관련 표시·인증 자료와 사용상 주의사항을 확인합니다', visible: true },
        { title: 'BELIEF', description: '시간이 지나도 흔들리지 않는 가치를 지키는 브랜드', visible: true },
      ],
    },
    spotlight: {
      visible: true,
      label: text('spotlight'),
      buttonLabel: text('detailLink'),
      fallbackText: '브랜드 스토리 확인하기',
    },
    catalog: {
      sortDefaultLabel: '기본순',
      sortAzLabel: '브랜드 A-Z',
      loadMoreLabel: '더 보기',
      filterAllLabel: '전체',
      filterRecommendedLabel: '백조오브제 추천',
      filterNewLabel: '새로 만난 브랜드',
    },
    empty: {
      title: text('emptyTitle'),
      description: text('emptyDescription'),
      buttonLabel: '전체 브랜드 보기',
    },
    partnership: {
      visible: true,
      title: text('partnerTitle'),
      description: [text('partnerDescription1'), text('partnerDescription2')].join('\n'),
      image: '/images/poodle-pet-food.png',
      imageAlt: '프리미엄 펫푸드 제안',
      buttonLabel: text('partnerButton'),
      buttonHref: '/landing/care-kit',
    },
  };
}

export function selectBrandsContent(published: BrandsContentData | null, settings: PageTextSettings): BrandsContentData {
  return published ?? buildBrandsContent(settings);
}

export const brandsSourceMapper: CmsSourceMapper = {
  siteSettingIds: ['page-texts'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('brands');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:brands');
    const rawPageTexts = sources['page-texts']?.value ?? defaultPageTextSettings;
    return normalizeCmsPageContent(definition, buildBrandsContent(normalizePageTextSettings(rawPageTexts)));
  },
};
