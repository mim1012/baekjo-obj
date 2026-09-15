// privacy(개인정보 처리방침) 페이지의 소스 매퍼 — PRIVACY_CONTENT(legalContent.ts)의 평평한
// articles[] 16개를 원본으로, page-texts(site_settings id='page-texts')의 'privacy.*' 관리자
// 덮어쓰기를 적용해 현재 화면과 동일한 콘텐츠를 계산한다(D3/D4). PR311의 표 스키마
// (purposeTable 등, pageDefinitions.ts에 남아있는 legacy 필드)는 범위 밖 — 이 매퍼가 반환하지
// 않는 필드는 normalizeCmsPageContent가 definition.defaultContent 값으로 채운다.
//
// 'server-only'를 import하지 않는다 — cms-source-mapper-contract.spec.ts가 이 파일을 그대로
// 로드해 normalize(build(...))를 검증한다.
import { PRIVACY_CONTENT } from '@/data/legalContent';
import {
  defaultPageTextSettings,
  normalizePageTextSettings,
  type PageTextSettings,
} from '@/data/pageTextContent';
import { tokenizeCompanyValues } from '@/lib/cms/companyTokens';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

export interface PrivacyArticle {
  readonly title: string;
  readonly body: string;
  readonly visible: boolean;
}

export interface PrivacyContent extends Record<string, unknown> {
  readonly visible: boolean;
  readonly eyebrow: string;
  readonly title: string;
  readonly effectiveDate: string;
  readonly introduction: string;
  readonly articles: readonly PrivacyArticle[];
  readonly footerNote: string;
  readonly companyBoxVisible: boolean;
  readonly companyBoxTitle: string;
}

/** terms.ts와 동일한 이유(주석 참조)로, page-texts 자체 기본값과 같으면 currentValue를 쓴다. */
function overridden(settings: PageTextSettings, key: string, currentValue: string): string {
  const stored = settings.values[key];
  if (typeof stored !== 'string' || stored.length === 0) return currentValue;
  const pristineDefault = defaultPageTextSettings.values[key];
  if (pristineDefault !== undefined && stored === pristineDefault) return currentValue;
  return stored;
}

export function privacyContentFromSettings(settings: PageTextSettings): PrivacyContent {
  return {
    visible: true,
    eyebrow: 'Legal',
    title: overridden(settings, 'privacy.title', PRIVACY_CONTENT.title),
    effectiveDate: PRIVACY_CONTENT.effectiveDate,
    introduction: overridden(settings, 'privacy.introduction', PRIVACY_CONTENT.introduction),
    // "12. 개인정보 보호책임자 및 열람청구 접수처"만 화면이 COMPANY.tel/email을 실시간 참조한다
    // (legalContent.ts PRIVACY_CONTENT의 다른 15개 조항은 고정 문구라 토큰화하면 안 된다 — 예:
    // 회사명이 우연히 COMPANY.name과 같은 문자열이어도 그건 실시간 참조가 아니다).
    articles: PRIVACY_CONTENT.articles.map((article, index) => {
      const body = article.title.startsWith('12.')
        ? tokenizeCompanyValues(article.body, ['tel', 'email'])
        : article.body;
      return {
        title: overridden(settings, `privacy.article${index + 1}Title`, article.title),
        body: overridden(settings, `privacy.article${index + 1}Body`, body),
        visible: article.visible,
      };
    }),
    footerNote: '',
    companyBoxVisible: false,
    companyBoxTitle: overridden(settings, 'privacy.companyTitle', '사업자 정보'),
  };
}

export function selectPrivacyContent(
  published: PrivacyContent | null,
  settings: PageTextSettings,
): PrivacyContent {
  return published ?? privacyContentFromSettings(settings);
}

export const privacySourceMapper: CmsSourceMapper = {
  siteSettingIds: ['page-texts'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('privacy');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:privacy');
    const rawPageTexts = sources['page-texts']?.value ?? defaultPageTextSettings;
    return normalizeCmsPageContent(
      definition,
      privacyContentFromSettings(normalizePageTextSettings(rawPageTexts)),
    );
  },
};
