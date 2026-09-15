// insurance-landing(/landing/insurance) 페이지의 "현재 값 가져오기(최초 활성화)" 소스 매퍼.
//
// page-texts에 'insuranceLanding' 그룹이 존재하지만(whyTitle/whyDescription/processTitle/
// closingTitle) src/app/landing/insurance/page.tsx는 이 값을 전혀 읽지 않는다(완전 정적 컴포넌트) —
// 즉 지금 고객이 보는 문구의 정본은 page.tsx 리터럴이며, page-texts 쪽 값은 이미 죽은 값이다.
// 이 매퍼는 "현재 화면"을 그대로 복제해야 하므로 page-texts 값을 읽지 않는다(읽으면 고객이 실제로
// 본 적 없는 문구가 활성화될 위험). siteSettingIds는 다른 페이지와 배선을 통일하려고 남겨둔다.
import { defaultPageTextSettings, normalizePageTextSettings, type PageTextSettings } from '@/data/pageTextContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

export interface InsuranceLandingTitleDescriptionItem {
  readonly title: string;
  readonly description: string;
  readonly visible: boolean;
}

export type InsuranceLandingContent = Record<string, unknown> & {
  readonly __managedVersion?: number;
  readonly hero: {
    readonly visible: boolean;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly image: string;
    readonly imageAlt: string;
    readonly primaryCtaLabel: string;
    readonly primaryCtaHref: string;
    readonly secondaryCtaLabel: string;
    readonly secondaryCtaHref: string;
  };
  readonly body: {
    readonly visible: boolean;
    readonly title: string;
    readonly description: string;
    readonly benefitItems: readonly InsuranceLandingTitleDescriptionItem[];
    readonly processVisible: boolean;
    readonly processTitle: string;
    readonly processItems: readonly InsuranceLandingTitleDescriptionItem[];
    readonly ctaVisible: boolean;
    readonly ctaTitle: string;
    readonly ctaDescription: string;
    readonly ctaLabel: string;
    readonly ctaHref: string;
  };
};

/** Pure — 오늘의 src/app/landing/insurance/page.tsx 리터럴을 그대로 반영한다. */
export function buildInsuranceLandingContent(_settings: PageTextSettings): InsuranceLandingContent {
  return {
    hero: {
      visible: true,
      // 화면 원문은 'Free Insurance Review'(타이틀케이스)이고 CSS uppercase로 시각적으로만 대문자다.
      eyebrow: 'Free Insurance Review',
      title: '옆집 아이의 정답이\n우리 아이의 정답일까요?',
      description: '매달 바뀌는 수많은 약관과 보장 조건, 보호자님이 모두 비교하기는 벅찹니다. 백조오브제가 객관적인 시선으로 우리 아이에게 진짜 유리한 선택지를 정리해 드립니다.',
      image: '',
      imageAlt: '',
      primaryCtaLabel: '무료 분석 신청하기',
      primaryCtaHref: '/insurance/apply',
      secondaryCtaLabel: '',
      secondaryCtaHref: '',
    },
    body: {
      visible: true,
      title: '왜 백조오브제의 분석일까요?',
      description: '판매가 목적이 아닌, 아이의 생애 주기와 리스크를 먼저 봅니다.',
      benefitItems: [
        { title: '가입 강요 없는 투명함', description: '지금 가입하신 보험이 최선이라면, 유지하시라고 정직하게 말씀드립니다.', visible: true },
        { title: '집요한 약관 분석', description: '눈에 띄는 보장 금액 뒤에 숨은 세부 약관과 면책 조항까지 꼼꼼히 살핍니다.', visible: true },
        { title: '종특과 병력 맞춤 매칭', description: '우리 아이의 품종 특이성과 과거 병력에 꼭 필요한 특약을 찾아냅니다.', visible: true },
      ],
      processVisible: true,
      processTitle: '분석은 이렇게 진행됩니다',
      processItems: [
        { title: '간단한 정보 입력', description: '아이의 정보와 고민을 남겨주세요.', visible: true },
        { title: '전담 분석가 배정', description: '입력하신 내용을 바탕으로 분석가가 배정됩니다.', visible: true },
        { title: '맞춤 약관 시뮬레이션', description: '여러 조건들을 시뮬레이션하며 비교합니다.', visible: true },
        { title: '상세 리포트 도착', description: '정리된 결과를 카카오톡이나 이메일로 받습니다.', visible: true },
      ],
      ctaVisible: true,
      ctaTitle: '1분이면 충분합니다.',
      ctaDescription: '무료 분석 신청 시 어떤 비용이나 가입 의무도 발생하지 않습니다.\n우리 아이를 위한 똑똑한 첫걸음, 지금 시작해보세요.',
      ctaLabel: '무료 분석 신청하기',
      ctaHref: '/insurance/apply',
    },
  };
}

export function selectInsuranceLandingContent(
  published: InsuranceLandingContent | null,
  settings: PageTextSettings,
): InsuranceLandingContent {
  return published ?? buildInsuranceLandingContent(settings);
}

export const insuranceLandingSourceMapper: CmsSourceMapper = {
  siteSettingIds: ['page-texts'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('insurance-landing');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:insurance-landing');
    const rawPageTexts = sources['page-texts']?.value ?? defaultPageTextSettings;
    return normalizeCmsPageContent(definition, buildInsuranceLandingContent(normalizePageTextSettings(rawPageTexts)));
  },
};
