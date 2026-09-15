// experts(/experts) 페이지의 "현재 값 가져오기(최초 활성화)" 소스 매퍼.
//
// 이 화면은 page-texts에 자기 그룹(예: 'experts.*')이 없다 — 히어로 문구, 관점 카드,
// 선정 단계, 추천 상품 안내 문구가 전부 src/app/experts/page.tsx 안에 리터럴로 박혀 있다.
// 그래도 다른 페이지와 동일한 부트스트랩 배선(siteSettingIds:['page-texts'])을 유지해
// 추후 page-texts로 승격하더라도 import 라우트·관리자 "가져오기" 버튼을 다시 짤 필요가 없게 한다.
// settings 인자는 지금은 실질적으로 쓰이지 않는다(현재 화면이 page-texts를 전혀 읽지 않으므로) —
// 이 매퍼가 반환하는 값은 CmsPageDefinition('experts').defaultContent와 항상 같아야 한다
// (cms-source-mapper-contract.spec.ts, cms-experts-consumer.spec.ts가 이 불변식을 고정한다).
import { defaultPageTextSettings, normalizePageTextSettings, type PageTextSettings } from '@/data/pageTextContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

export interface ExpertsPerspectiveItem {
  readonly filterValue: string;
  readonly productRule: string;
  readonly title: string;
  readonly description: string;
  readonly bullets: string;
  readonly linkLabel: string;
  readonly visible: boolean;
}

export interface ExpertsProcessItem {
  readonly title: string;
  readonly description: string;
  readonly visible: boolean;
}

export type ExpertsContent = Record<string, unknown> & {
  readonly __managedVersion?: number;
  readonly hero: {
    readonly visible: boolean;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly image: string;
    readonly imageAlt: string;
    readonly secondaryCtaLabel: string;
    readonly secondaryCtaHref: string;
  };
  readonly body: {
    readonly visible: boolean;
    readonly title: string;
    readonly perspectiveItems: readonly ExpertsPerspectiveItem[];
    readonly processItems: readonly ExpertsProcessItem[];
    readonly productsTitle: string;
    readonly allFilterLabel: string;
    readonly emptyText: string;
    readonly noticeTitle: string;
    readonly noticeDescription: string;
    readonly noticeLinkLabel: string;
    readonly noticeLinkHref: string;
  };
};

/** Pure — 오늘의 src/app/experts/page.tsx 리터럴을 그대로 반영한다. */
export function buildExpertsContent(_settings: PageTextSettings): ExpertsContent {
  return {
    hero: {
      visible: true,
      eyebrow: "Expert's View",
      title: '전문가 관점으로 살펴보는\n상품 선택 기준',
      description: '백조오브제가 수의·영양·행동 전문가의 관점을 바탕으로 우리 아이에게 맞는 상품 선택 기준을 정리했습니다.',
      image: '/images/poodle-pet-food.png',
      imageAlt: '전문가 추천 강아지',
      secondaryCtaLabel: '',
      secondaryCtaHref: '',
    },
    body: {
      visible: true,
      title: '상품은 이렇게 살펴봅니다.',
      perspectiveItems: [
        { filterValue: '수의 관점', productRule: 'veterinary', title: '수의 관점', description: '건강 상태와 안전성을 중심으로 확인합니다.', bullets: '대상 연령과 건강 상태\n성분과 사용상 주의사항\n질환·복용약과의 관계', linkLabel: '수의 관점 상품 보기', visible: true },
        { filterValue: '영양 관점', productRule: 'nutrition', title: '영양 관점', description: '원료와 영양 균형을 꼼꼼하게 확인합니다.', bullets: '주요 원료, 영양 성분\n알레르기 유발 가능성\n급여 목적과 영양 균형', linkLabel: '영양 관점 상품 보기', visible: true },
        { filterValue: '행동·생활 관점', productRule: 'lifestyle', title: '행동·생활 관점', description: '생활 환경과 습관을 함께 고려합니다.', bullets: '스트레스 완화에 도움\n활동량과 생활 패턴\n관리의 편의성과 지속성', linkLabel: '행동·생활 관점 상품 보기', visible: true },
      ],
      processItems: [
        { title: '반려동물 상태 확인', description: '', visible: true },
        { title: '성분·원료 확인', description: '', visible: true },
        { title: '제조·사용 기준 확인', description: '', visible: true },
        { title: '실제 사용 목적과 적합성 정리', description: '', visible: true },
      ],
      productsTitle: '전문가 기준으로 엄선한 추천 상품',
      allFilterLabel: '전체',
      emptyText: '선택한 관점의 추천 상품이 없습니다.',
      noticeTitle: '추천 결과는 반려동물의 상태와 사용 목적에 따라 달라질 수 있습니다.',
      noticeDescription: '질환·복용 약·알레르기 등이 있는 경우 전문가 상담이 필요합니다.',
      noticeLinkLabel: '케어 가이드 더 보기',
      noticeLinkHref: '/concerns',
    },
  };
}

export function selectExpertsContent(published: ExpertsContent | null, settings: PageTextSettings): ExpertsContent {
  return published ?? buildExpertsContent(settings);
}

export const expertsSourceMapper: CmsSourceMapper = {
  siteSettingIds: ['page-texts'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('experts');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:experts');
    const rawPageTexts = sources['page-texts']?.value ?? defaultPageTextSettings;
    return normalizeCmsPageContent(definition, buildExpertsContent(normalizePageTextSettings(rawPageTexts)));
  },
};
