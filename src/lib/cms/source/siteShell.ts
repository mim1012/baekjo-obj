// site-shell 페이지의 소스 매퍼 — Header/Footer/MobileBottomNav가 오늘 렌더링하는 로고·메뉴·회사
// 정보·SNS 링크를 그대로 옮긴 상수 기반 매퍼다. DB site_settings 소스가 없으므로(siteSettingIds: [])
// build()는 sources 인자를 쓰지 않고 항상 같은 값을 계산한다(순수 함수, D3).
//
// features.insurance/experts는 정보 표시 전용이다(D6) — Header/Footer/MobileBottomNav는 이 값을
// 절대 읽지 않고 항상 src/config/features.ts(FEATURES)만 신뢰해 메뉴 노출을 결정한다. 여기 값은
// pageDefinitions.ts의 'features' 섹션(fields: [])이 관리자에게 "현재 배포 설정"을 보여주기 위한
// 참고용 스냅샷일 뿐이다 — 편집 필드가 없어 CMS로는 바꿀 수 없다.
//
// resolveGatedNavLinks는 Header.tsx가 쓰는 공용 필터다. CMS content.visible이 무엇이든 펫보험·
// 전문가 칼럼(FEATURE_GATED_HREFS)은 오직 FEATURES로만 노출을 결정한다 — 관리자가 CMS에서 그
// 항목을 visible:true로 바꿔도 FEATURES가 꺼져 있으면 메뉴에 나타나지 않는다.
//
// 'server-only'를 import하지 않는다 — cms-source-mapper-contract.spec.ts, tests/products/
// cms-site-shell-consumer.spec.ts가 이 파일을 그대로 로드해 normalize(build(...))와
// resolveGatedNavLinks를 순수 함수로 검증한다.
import { COMPANY } from '@/data/company';
import { FEATURES } from '@/config/features';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition, type CmsLinkItem } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper } from '@/lib/cms/source/registry';

export type SiteShellContent = Record<string, unknown> & {
  readonly branding: {
    readonly headerLogo: string;
    readonly logoAlt: string;
  };
  /** 참고용 스냅샷 — 소비자는 절대 이 값을 읽지 않는다(D6). 항상 FEATURES를 신뢰한다. */
  readonly features: {
    readonly insurance: boolean;
    readonly experts: boolean;
  };
  readonly navigation: {
    readonly mainLinks: readonly CmsLinkItem[];
    readonly storyLinks: readonly CmsLinkItem[];
    readonly footerLinks: readonly CmsLinkItem[];
  };
  readonly company: typeof COMPANY;
  readonly social: {
    readonly instagramUrl: string;
    readonly instagramLabel: string;
    readonly kakaoTalkUrl: string;
  };
};

/** 오늘 Header.tsx/Footer.tsx가 렌더링하는 값 그대로(순수 함수) — 어떤 site_settings 행도 읽지 않는다. */
export function buildSiteShellContent(): SiteShellContent {
  return {
    branding: {
      headerLogo: '/images/baekjo-objet-header-logo-v2.png',
      logoAlt: 'Baekjo Objet',
    },
    features: { insurance: FEATURES.insurance, experts: FEATURES.experts },
    navigation: {
      mainLinks: [
        { label: '브랜드', href: '/brands', visible: true },
        { label: '케어', href: '/concerns', visible: true },
        { label: '펫보험', href: '/insurance', visible: false },
        { label: 'B2B', href: '/b2b', visible: true },
      ],
      storyLinks: [
        { label: '백조오브제 Audit의 검토 기준', href: '/audit', visible: true },
        { label: '전문가 칼럼', href: '/experts', visible: false },
        { label: '보호자 후기', href: '/reviews', visible: true },
        { label: '소식', href: '/notices', visible: true },
      ],
      footerLinks: [
        { label: '1:1 문의', href: '/mypage?tab=inquiries', visible: true },
        { label: '이용약관', href: '/terms', visible: true },
        { label: '개인정보처리방침', href: '/privacy', visible: true },
        { label: '배송·교환·환불', href: '/refund-policy', visible: true },
      ],
    },
    company: { ...COMPANY },
    social: {
      instagramUrl: 'https://www.instagram.com/baekjo.objet/',
      instagramLabel: '@BAEKJO OBJET',
      kakaoTalkUrl: COMPANY.kakaoTalkUrl,
    },
  };
}

export function selectSiteShellContent(published: SiteShellContent | null): SiteShellContent {
  return published ?? buildSiteShellContent();
}

export const siteShellSourceMapper: CmsSourceMapper = {
  siteSettingIds: [],
  bootstrapReady: true,
  // 잠글 site_settings 행이 없다(siteSettingIds: []) — sources 인자를 받지 않는다.
  build(): Record<string, unknown> {
    const definition = getCmsPageDefinition('site-shell');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:site-shell');
    return normalizeCmsPageContent(definition, buildSiteShellContent());
  },
};

/** '/insurance', '/experts' 처럼 FEATURES 플래그로만 노출을 결정하는 href ↔ 플래그 키 맵. */
export const FEATURE_GATED_HREFS: Partial<Record<string, keyof typeof FEATURES>> = {
  '/insurance': 'insurance',
  '/experts': 'experts',
};

/**
 * CMS(site-shell)가 활성화되면 그 라벨/링크를 쓰지만, FEATURE_GATED_HREFS에 해당하는 href는
 * CMS의 visible 값과 무관하게 항상 FEATURES만 신뢰한다(D6) — 관리자가 CMS에서 실수로 펫보험·
 * 전문가 칼럼을 visible:true로 바꿔도 FEATURES.insurance/experts가 false면 메뉴에 나타나지 않는다.
 */
export function resolveGatedNavLinks(
  cmsLinks: readonly CmsLinkItem[] | undefined,
  fallback: readonly { readonly label: string; readonly href: string }[],
): { label: string; href: string }[] {
  const source: readonly { label: string; href: string; visible?: boolean }[] = cmsLinks ?? fallback;
  return source
    .filter((link) => {
      const featureKey = FEATURE_GATED_HREFS[link.href];
      if (featureKey) return FEATURES[featureKey];
      return link.visible !== false;
    })
    .map((link) => ({ label: link.label, href: link.href }));
}
