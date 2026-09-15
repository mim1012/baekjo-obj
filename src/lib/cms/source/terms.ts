// terms(이용약관) 페이지의 소스 매퍼 — TERMS_CONTENT(legalContent.ts)를 원본으로, page-texts
// (site_settings id='page-texts')의 'terms.*' 관리자 덮어쓰기를 적용해 현재 화면과 동일한
// 콘텐츠를 계산한다(D3/D4).
//
// terms 조항 본문은 회사명을 COMPANY.name의 실시간 참조가 아니라 고정 문구('백조 오브제')로
// 직접 적어둔다(legalContent.ts TERMS_CONTENT 원문도 마찬가지) — 계약 문서 문구를 회사 정보
// 변경에 따라 조용히 바꾸지 않기 위해서다. 그래서 {{company.*}} 토큰화를 하지 않는다(privacy의
// 12번 조항처럼 화면이 실제로 COMPANY.tel/email을 실시간 참조하는 경우만 토큰화 대상이다).
//
// 'server-only'를 import하지 않는다 — cms-source-mapper-contract.spec.ts가 이 파일을 그대로
// 로드해 normalize(build(...))를 검증한다.
import { TERMS_CONTENT } from '@/data/legalContent';
import {
  defaultPageTextSettings,
  normalizePageTextSettings,
  type PageTextSettings,
} from '@/data/pageTextContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

export interface TermsArticle {
  readonly title: string;
  readonly body: string;
  readonly visible: boolean;
}

export interface TermsContent extends Record<string, unknown> {
  readonly visible: boolean;
  readonly eyebrow: string;
  readonly title: string;
  readonly effectiveDate: string;
  readonly introduction: string;
  readonly articles: readonly TermsArticle[];
  readonly footerNote: string;
  readonly companyBoxVisible: boolean;
  readonly companyBoxTitle: string;
}

/**
 * page-texts 저장값이 그 필드의 '자체 기본값'과 같으면(=관리자가 아직 손대지 않음) currentValue를
 * 쓰고, 다르면(=관리자가 실제로 고침) 저장값을 그대로 쓴다. defaultPageTextSettings의 기본값은
 * TERMS_CONTENT 원문(토큰화 이전)이라, 단순히 "비어있지 않으면 저장값 사용"으로 판단하면 기본
 * 설정에서도 항상 저장값(토큰화되지 않은 원문)이 선택되어 defaultContent와 어긋난다.
 */
function overridden(settings: PageTextSettings, key: string, currentValue: string): string {
  const stored = settings.values[key];
  if (typeof stored !== 'string' || stored.length === 0) return currentValue;
  const pristineDefault = defaultPageTextSettings.values[key];
  if (pristineDefault !== undefined && stored === pristineDefault) return currentValue;
  return stored;
}

export function termsContentFromSettings(settings: PageTextSettings): TermsContent {
  return {
    visible: true,
    eyebrow: 'Legal',
    title: overridden(settings, 'terms.title', TERMS_CONTENT.title),
    effectiveDate: TERMS_CONTENT.effectiveDate,
    introduction: TERMS_CONTENT.introduction,
    articles: TERMS_CONTENT.articles.map((article, index) => ({
      title: overridden(settings, `terms.article${index + 1}Title`, article.title),
      body: overridden(settings, `terms.article${index + 1}Body`, article.body),
      visible: article.visible,
    })),
    footerNote: '',
    companyBoxVisible: true,
    companyBoxTitle: overridden(settings, 'terms.companyTitle', '사업자 정보'),
  };
}

export function selectTermsContent(published: TermsContent | null, settings: PageTextSettings): TermsContent {
  return published ?? termsContentFromSettings(settings);
}

export const termsSourceMapper: CmsSourceMapper = {
  siteSettingIds: ['page-texts'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('terms');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:terms');
    const rawPageTexts = sources['page-texts']?.value ?? defaultPageTextSettings;
    return normalizeCmsPageContent(
      definition,
      termsContentFromSettings(normalizePageTextSettings(rawPageTexts)),
    );
  },
};
