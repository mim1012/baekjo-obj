// concerns(/concerns) 목록 페이지의 소스 매퍼 — page-texts(site_settings id='page-texts') 하나를
// 원본으로 삼는다. audit(source/audit.ts)와 같은 패턴: 부트스트랩(활성화)과 화면 소비가 같은 순수
// 매퍼를 쓴다(D3). concerns.* page-texts 필드는 지금까지 어떤 화면에도 연결되지 않은 채 존재했다 —
// 이 매퍼가 처음으로 연결한다. 고민 카드 자체(6+6개)는 concerns 저장소가 정본이라 이 매퍼의
// 대상이 아니다 — 첫 화면·보험 배너·FAQ 문구만 다룬다. 보험 배너 표시 여부는 FEATURES.insurance
// 플래그가 정본이며 이 매퍼는 그 게이트를 건드리지 않는다(D6).
//
// 'server-only'를 import하지 않는다 — cms-source-mapper-contract.spec.ts 등 순수 계약 테스트가
// 이 파일을 그대로 로드해 normalize(build(...))를 검증한다.
import { defaultPageTextSettings, normalizePageTextSettings, type PageTextSettings } from '@/data/pageTextContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

type FaqItem = { readonly title: string; readonly description: string; readonly visible: boolean };

export type ConcernsContent = Record<string, unknown> & {
  readonly hero: {
    readonly visible: boolean;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly image: string;
    readonly imageAlt: string;
    readonly imagePosition: string;
    readonly indexLabel: string;
    readonly indexSuffix: string;
  };
  readonly secondary: {
    readonly visible: boolean;
    readonly title: string;
    readonly description: string;
  };
  readonly insurance: {
    readonly title: string;
    readonly description: string;
    readonly buttonLabel: string;
    readonly buttonHref: string;
    readonly image: string;
    readonly imageAlt: string;
  };
  readonly faq: {
    readonly visible: boolean;
    readonly title: string;
    readonly items: readonly FaqItem[];
  };
};

/** Pure import mapping. Activation is a separate, explicitly verified migration step. */
export function buildConcernsContent(settings: PageTextSettings): ConcernsContent {
  const text = (id: string) => settings.values[`concerns.${id}`] ?? defaultPageTextSettings.values[`concerns.${id}`];
  return {
    hero: {
      visible: true,
      eyebrow: 'CARE GUIDE',
      title: '요즘, 우리 아이에게\n어떤 변화가 보이나요?',
      description: '우리 아이가 보내는 작은 신호부터 살펴보세요.\n일상에서 알아두면 좋은 케어 기준을 정리했습니다.',
      image: '/images/care-guide-hero-pet-family.png',
      imageAlt: '보호자와 함께 생활하는 강아지와 고양이',
      imagePosition: '52% center',
      indexLabel: 'INDEX',
      indexSuffix: 'CARE',
    },
    secondary: {
      visible: true,
      title: text('moreCareTitle'),
      description: text('moreCareDescription'),
    },
    insurance: {
      title: '우리 아이에게 필요한 보장은 무엇일까요?',
      description: '나이와 건강 상태를 바탕으로 우리 아이에게 맞는 보험을 살펴보세요.',
      buttonLabel: '보험 분석하기',
      buttonHref: '/insurance',
      image: '/images/insurance-dog.webp',
      imageAlt: '펫보험 분석',
    },
    faq: {
      visible: true,
      title: text('faqTitle'),
      items: [
        { title: '이 정보는 어떻게 활용하면 되나요?', description: '평소 우리 아이의 모습과 비교해 몸이나 행동에 달라진 점이 있는지 살펴보는 데 참고해 주세요. 작은 변화도 평소와 비교해 알아차리는 것이 중요합니다.', visible: true },
        { title: '여러 고민이 함께 보이면 어떻게 살펴봐야 하나요?', description: '하나의 변화가 여러 원인과 관련될 수 있고, 여러 변화가 함께 나타나기도 합니다. 한 가지 증상만 따로 보기보다 우리 아이에게 함께 나타나는 변화를 살펴보세요.', visible: true },
        { title: '언제 진료가 필요한가요?', description: '각 상세의 병원 진료를 고려해야 할 신호를 참고해 주세요. 해당하지 않더라도 평소와 다른 변화가 걱정되거나 판단하기 어렵다면 수의사에게 확인해보는 것이 좋습니다.', visible: true },
        { title: '이 정보만으로 건강 상태를 판단해도 되나요?', description: '이 내용은 보호자가 일상에서 변화를 알아차리는 데 도움을 주기 위한 참고 정보입니다. 같은 변화도 원인이 다를 수 있으므로 특정 질환을 판단하거나 진단하는 기준으로 사용하지 않습니다.', visible: true },
      ],
    },
  };
}

export function selectConcernsContent(published: ConcernsContent | null, settings: PageTextSettings): ConcernsContent {
  return published ?? buildConcernsContent(settings);
}

export const concernsSourceMapper: CmsSourceMapper = {
  siteSettingIds: ['page-texts'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('concerns');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:concerns');
    const rawPageTexts = sources['page-texts']?.value ?? defaultPageTextSettings;
    return normalizeCmsPageContent(
      definition,
      buildConcernsContent(normalizePageTextSettings(rawPageTexts)),
    );
  },
};
