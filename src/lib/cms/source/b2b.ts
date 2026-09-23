// b2b 페이지의 소스 매퍼 — page-texts(site_settings id='page-texts') 하나를 원본으로 삼는다.
// audit(source/audit.ts)와 같은 패턴: 부트스트랩(활성화)과 화면 소비가 같은 순수 매퍼를 쓴다(D3).
// b2b.* page-texts 필드는 지금까지 어떤 화면에도 연결되지 않은 채 존재했다 — 이 매퍼가 처음으로
// 연결한다. 나머지(카드 목록, 이미지 등)는 현재 화면에 하드코딩된 문구를 그대로 옮긴다.
//
// 'server-only'를 import하지 않는다 — cms-source-mapper-contract.spec.ts 등 순수 계약 테스트가
// 이 파일을 그대로 로드해 normalize(build(...))를 검증한다.
import { defaultPageTextSettings, normalizePageTextSettings, type PageTextSettings } from '@/data/pageTextContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

export type B2bContent = Record<string, unknown> & {
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
  readonly partners: {
    readonly visible: boolean;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly items: readonly { readonly title: string; readonly description: string; readonly visible: boolean }[];
  };
  readonly programs: {
    readonly visible: boolean;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly notice: string;
    readonly items: readonly {
      readonly eyebrow: string;
      readonly title: string;
      readonly description: string;
      readonly bullets: string;
      readonly href: string;
      readonly linkLabel: string;
      readonly image: string;
      readonly imageAlt: string;
      readonly visible: boolean;
    }[];
  };
  readonly process: {
    readonly visible: boolean;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly notice: string;
    readonly items: readonly { readonly title: string; readonly description: string; readonly visible: boolean }[];
  };
  readonly closing: {
    readonly visible: boolean;
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly links: readonly { readonly label: string; readonly href: string; readonly visible: boolean }[];
  };
};

/** Pure import mapping. Activation is a separate, explicitly verified migration step. */
export function buildB2bContent(settings: PageTextSettings): B2bContent {
  const text = (id: string) => settings.values[`b2b.${id}`] ?? defaultPageTextSettings.values[`b2b.${id}`];
  return {
    hero: {
      visible: true,
      eyebrow: 'BAEKJO OBJET FOR BUSINESS',
      title: [text('heroTitleLine1'), text('heroTitleLine2')].join('\n'),
      description: '백조오브제 B2B는 기관과 브랜드의 목적에 맞춰 상품과 콘텐츠, 필요한 구성을 함께 제안합니다.',
      image: '/images/b2b-partnership-hero-v1.webp',
      imageAlt: '반려생활 기관을 위한 백조오브제 B2B 파트너십',
      primaryCtaLabel: text('inquiryButton'),
      primaryCtaHref: '/landing/care-kit#partner',
      secondaryCtaLabel: text('programButton'),
      secondaryCtaHref: '#programs',
      overlayEyebrow: 'Care in every touchpoint',
      overlayText: '기관의 목적과 보호자의 필요가 만나는 구성을 제안합니다.',
    },
    partners: {
      visible: true,
      eyebrow: 'FOR PARTNERS',
      title: text('typeTitle'),
      description: text('typeDescription'),
      items: [
        { title: '동물병원', description: '보호자와 반려동물이 필요한 상황에 맞춰 상품과 구성을 제안합니다.', visible: true },
        { title: '기업·단체', description: '임직원 복지, 고객 선물, 캠페인 등 목적에 맞춰 상품과 구성을 제안합니다.', visible: true },
        { title: '반려생활 공간', description: '호텔, 유치원, 장례식장·추모 공간 등 공간의 성격과 이용 목적에 맞는 구성을 제안합니다.', visible: true },
        { title: '브랜드 파트너', description: '입점부터 공동 기획까지 브랜드의 방향과 목적에 맞는 협업 방식을 함께 찾습니다.', visible: true },
      ],
    },
    programs: {
      visible: true,
      eyebrow: 'PARTNERSHIP PROGRAMS',
      title: text('proposalTitle'),
      description: text('proposalDescription'),
      notice: '※ 프로젝트는 충분한 협의와 준비를 거쳐 공개하며, 기획·진행 단계의 내용은 노출을 지양합니다. 일부 프로젝트는 파트너사와의 협의에 따라 공개되지 않을 수 있습니다.',
      items: [
        { eyebrow: 'CARE KIT', title: '상황별 케어키트', description: '웰컴, 위로 등 필요한 순간과 목적에 맞춰 상품과 안내 구성을 제안합니다.', bullets: '목적에 맞는 상품 구성\n수량·예산에 따른 제안\n필요한 안내 구성', href: '/landing/care-kit', linkLabel: '케어키트 안내', image: '', imageAlt: '', visible: true },
        { eyebrow: 'SUPPLY', title: '대량 구매·정기 공급', description: '기업과 기관에 필요한 상품을 수량, 예산, 일정에 맞춰 제안합니다.', bullets: '대량 구매 협의\n정기 공급 협의\n구성 및 납품 일정 조율', href: '/signup', linkLabel: 'B2B 회원가입', image: '', imageAlt: '', visible: true },
        { eyebrow: 'PARTNERSHIP', title: '입점·공동 기획', description: '브랜드의 방향과 제품을 살펴보고, 입점부터 필요한 협업 방식을 함께 논의합니다.', bullets: '입점 및 운영 협의\n브랜드·제품에 맞는 협업 검토\n필요 시 공동 기획 진행', href: '/signup', linkLabel: '브랜드 회원가입', image: '', imageAlt: '', visible: true },
      ],
    },
    process: {
      visible: true,
      eyebrow: 'HOW IT WORKS',
      title: text('processTitle'),
      description: text('processDescription'),
      notice: '※ 진행 중인 프로젝트와 검토 일정에 따라 기획 및 제안까지 다소 시간이 소요될 수 있습니다. 충분한 검토가 필요한 협업은 일정에 여유를 두고 문의해 주세요.',
      items: [
        { title: '문의 접수', description: '기관·브랜드 유형과 원하는 협업 내용을 남겨주세요.', visible: true },
        { title: '내용 확인', description: '문의 내용을 바탕으로 필요한 사항과 협업 방향을 확인합니다.', visible: true },
        { title: '제안 및 협의', description: '협업 범위와 세부 내용, 일정 등을 정리해 함께 협의합니다.', visible: true },
        { title: '진행', description: '협의된 내용과 일정에 따라 협업을 진행합니다.', visible: true },
      ],
    },
    closing: {
      visible: true,
      eyebrow: 'START A PARTNERSHIP',
      title: text('closingTitle'),
      description: text('closingDescription'),
      links: [
        { label: text('inquiryButton'), href: '/landing/care-kit#partner', visible: true },
        { label: text('signupButton'), href: '/signup', visible: true },
      ],
    },
  };
}

export function selectB2bContent(published: B2bContent | null, settings: PageTextSettings): B2bContent {
  return published ?? buildB2bContent(settings);
}

export const b2bSourceMapper: CmsSourceMapper = {
  siteSettingIds: ['page-texts'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('b2b');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:b2b');
    const rawPageTexts = sources['page-texts']?.value ?? defaultPageTextSettings;
    return normalizeCmsPageContent(
      definition,
      buildB2bContent(normalizePageTextSettings(rawPageTexts)),
    );
  },
};
