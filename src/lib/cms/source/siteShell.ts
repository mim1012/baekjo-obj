// site-shell 페이지의 소스 매퍼 — Header/Footer/MobileBottomNav가 오늘 렌더링하는 로고·메뉴·회사
// 정보·SNS 링크를 그대로 옮긴 상수 기반 매퍼다.
//
// B3: siteSettingIds:[]였을 때는 이 매퍼가 page-texts(site_settings id='page-texts')를 전혀
// 읽지 않아, 활성화("현재 값 가져오기") 순간 관리자가 옛 환경설정(공통 메뉴·푸터) 편집기에서
// 저장해둔 'common.*' 덮어쓰기가 조용히 사라지고 이 파일의 하드코딩 라벨로 되돌아갔다.
// siteSettingIds:['page-texts']로 그 값을 읽어 mainLinks/storyLinks/footerLinks의 라벨과
// shopDropdown 두 라벨에 반영해야 활성화가 기존 문구를 보존한다(href·visible은 page-texts에
// 대응 필드가 없어 상수 그대로 — 옛 편집기도 라벨 문자열만 다뤘다).
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
import {
  defaultPageTextSettings,
  normalizePageTextSettings,
  type PageTextSettings,
} from '@/data/pageTextContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition, type CmsLinkItem } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

/** terms.ts/privacy.ts/refundPolicy.ts와 동일한 이유(주석 참조) — page-texts 자체 기본값과
 * 같으면(=관리자가 손댄 적 없음) currentValue(오늘 화면 상수)를 그대로 쓴다. */
function overridden(settings: PageTextSettings, key: string, currentValue: string): string {
  const stored = settings.values[key];
  if (typeof stored !== 'string' || stored.length === 0) return currentValue;
  const pristineDefault = defaultPageTextSettings.values[key];
  if (pristineDefault !== undefined && stored === pristineDefault) return currentValue;
  return stored;
}

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
    /** 데스크톱 헤더의 "셀렉션" 드롭다운 두 칼럼 제목(Header.tsx DropdownColumn) — page-texts
     * 'common.brandBrowse'/'common.needBrowse'가 여기로 매핑된다(B3). */
    readonly shopDropdown: {
      readonly brandBrowseLabel: string;
      readonly needBrowseLabel: string;
    };
  };
  readonly company: typeof COMPANY;
  readonly social: {
    readonly instagramUrl: string;
    readonly instagramLabel: string;
    readonly kakaoTalkUrl: string;
  };
};

/** 오늘 Header.tsx/Footer.tsx가 렌더링하는 값 그대로(순수 함수) + page-texts 'common.*' 덮어쓰기
 * (settings 인자, 기본값은 기본 page-texts라 인자를 생략하면 상수 그대로다 — 기존 호출부 불변). */
export function buildSiteShellContent(
  settings: PageTextSettings = defaultPageTextSettings,
): SiteShellContent {
  return {
    branding: {
      headerLogo: '/images/baekjo-objet-header-logo-v2.png',
      logoAlt: 'Baekjo Objet',
    },
    features: { insurance: FEATURES.insurance, experts: FEATURES.experts },
    navigation: {
      mainLinks: [
        { label: overridden(settings, 'common.navBrand', '브랜드'), href: '/brands', visible: true },
        { label: overridden(settings, 'common.navCare', '케어'), href: '/concerns', visible: true },
        { label: overridden(settings, 'common.navInsurance', '펫보험'), href: '/insurance', visible: false },
        { label: overridden(settings, 'common.navB2b', 'B2B'), href: '/b2b', visible: true },
      ],
      storyLinks: [
        { label: overridden(settings, 'common.navAudit', '백조오브제 Audit의 검토 기준'), href: '/audit', visible: true },
        { label: overridden(settings, 'common.navExperts', '전문가 칼럼'), href: '/experts', visible: false },
        { label: overridden(settings, 'common.navReviews', '보호자 후기'), href: '/reviews', visible: true },
        { label: overridden(settings, 'common.navNotices', '소식'), href: '/notices', visible: true },
      ],
      footerLinks: [
        { label: overridden(settings, 'common.footerInquiry', '1:1 문의'), href: '/mypage?tab=inquiries', visible: true },
        { label: overridden(settings, 'common.footerTerms', '이용약관'), href: '/terms', visible: true },
        { label: overridden(settings, 'common.footerPrivacy', '개인정보처리방침'), href: '/privacy', visible: true },
        { label: overridden(settings, 'common.footerRefund', '배송·교환·환불'), href: '/refund-policy', visible: true },
      ],
      shopDropdown: {
        brandBrowseLabel: overridden(settings, 'common.brandBrowse', '브랜드로 둘러보기'),
        needBrowseLabel: overridden(settings, 'common.needBrowse', '필요한 것으로 찾기'),
      },
    },
    company: { ...COMPANY },
    social: {
      instagramUrl: 'https://www.instagram.com/baekjo.objet/',
      instagramLabel: '@BAEKJO OBJET',
      kakaoTalkUrl: COMPANY.kakaoTalkUrl,
    },
  };
}

export function selectSiteShellContent(
  published: SiteShellContent | null,
  settings: PageTextSettings = defaultPageTextSettings,
): SiteShellContent {
  return published ?? buildSiteShellContent(settings);
}

export const siteShellSourceMapper: CmsSourceMapper = {
  siteSettingIds: ['page-texts'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('site-shell');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:site-shell');
    const rawPageTexts = sources['page-texts']?.value ?? defaultPageTextSettings;
    return normalizeCmsPageContent(
      definition,
      buildSiteShellContent(normalizePageTextSettings(rawPageTexts)),
    );
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
