// care-kit(/landing/care-kit) 페이지의 소스 매퍼 — page-texts(site_settings id='page-texts') 하나를
// 원본으로 삼는다. audit(source/audit.ts)와 같은 패턴: 부트스트랩(활성화)과 화면 소비가 같은 순수
// 매퍼를 쓴다(D3). careKit.* page-texts 필드는 지금까지 어떤 화면에도 연결되지 않은 채 존재했다 —
// 이 매퍼가 처음으로 연결한다. 케어키트 카드 목록 자체(이름/구성품/추천 대상)는 kits 저장소가
// 정본이라 이 매퍼의 대상이 아니다 — 라벨 문구(kitItemsLabel/kitTargetLabel)만 다룬다.
//
// 'server-only'를 import하지 않는다 — cms-source-mapper-contract.spec.ts 등 순수 계약 테스트가
// 이 파일을 그대로 로드해 normalize(build(...))를 검증한다.
import { defaultPageTextSettings, normalizePageTextSettings, type PageTextSettings } from '@/data/pageTextContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

export type CareKitContent = Record<string, unknown> & {
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
    readonly overlayEyebrow: string;
    readonly overlayText: string;
  };
  readonly body: {
    readonly visible: boolean;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly partnerVisible: boolean;
    readonly partnerEyebrow: string;
    readonly partnerLogo: string;
    readonly partnerLogoAlt: string;
    readonly partnerTitle: string;
    readonly partnerDescription: string;
    readonly disclosure: string;
    readonly inquiryVisible: boolean;
    readonly inquiryEyebrow: string;
    readonly inquiryTitle: string;
    readonly inquiryDescription: string;
    readonly kitItemsLabel: string;
    readonly kitTargetLabel: string;
  };
};

/** Pure import mapping. Activation is a separate, explicitly verified migration step. */
export function buildCareKitContent(settings: PageTextSettings): CareKitContent {
  const text = (id: string) => settings.values[`careKit.${id}`] ?? defaultPageTextSettings.values[`careKit.${id}`];
  return {
    hero: {
      visible: true,
      eyebrow: 'CARE KIT',
      title: '필요한 순간에 맞는\n케어를 담습니다.',
      description: '파트너의 목적과 상황에 맞춰 상품과 안내를 구성하고, 필요한 협업 방식을 함께 고민합니다.',
      image: '/images/care_guide_hero.png',
      imageAlt: '보호자에게 필요한 순간을 위한 백조오브제 케어 키트',
      primaryCtaLabel: text('partnerButton'),
      primaryCtaHref: '#partner',
      secondaryCtaLabel: '',
      secondaryCtaHref: '',
      overlayEyebrow: 'MOMENTS OF CARE',
      overlayText: '각 순간을 생각하며 상품과 안내를 구성합니다.',
    },
    body: {
      visible: true,
      eyebrow: 'CARE KIT PROJECT',
      title: text('partnerTitle'),
      description: text('partnerDescription'),
      partnerVisible: true,
      partnerEyebrow: 'CARE KIT PARTNER',
      partnerLogo: '/brands/penefit-official.png',
      partnerLogoAlt: '페네핏 로고',
      partnerTitle: '첫 케어키트 프로젝트는 페네핏과 함께 기획하고 제작합니다.',
      partnerDescription: '현재 상세 구성 및 디자인 이미지는 공개하지 않습니다.',
      disclosure: '※ 공개 가능한 파트너 및 협업 내용에 한해 소개하며, 비공개로 진행되는 프로젝트는 노출하지 않습니다.',
      inquiryVisible: true,
      inquiryEyebrow: 'PARTNERSHIP INQUIRY',
      inquiryTitle: text('inquiryTitle'),
      inquiryDescription: text('inquiryDescription'),
      kitItemsLabel: '주요 구성품',
      kitTargetLabel: '추천 대상',
    },
  };
}

export function selectCareKitContent(published: CareKitContent | null, settings: PageTextSettings): CareKitContent {
  return published ?? buildCareKitContent(settings);
}

export const careKitSourceMapper: CmsSourceMapper = {
  siteSettingIds: ['page-texts'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('care-kit');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:care-kit');
    const rawPageTexts = sources['page-texts']?.value ?? defaultPageTextSettings;
    return normalizeCmsPageContent(
      definition,
      buildCareKitContent(normalizePageTextSettings(rawPageTexts)),
    );
  },
};
