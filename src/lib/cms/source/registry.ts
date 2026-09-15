// 페이지별 "현재 값 가져오기(최초 활성화)" 소스 매퍼 레지스트리.
//
// 각 CMS 페이지는 하나 이상의 site_settings 행(siteSettingIds)을 원본으로 삼아 현재 화면 콘텐츠를
// CmsPageDefinition 구조로 변환하는 순수 매퍼(build)를 갖는다. 서버(import 라우트)는 이 매퍼로
// 계산한 값만 활성화 콘텐츠로 신뢰한다 — 클라이언트가 보낸 content는 절대 신뢰하지 않는다(D1).
//
// audit만 bootstrapReady:true인 실제 매퍼(auditContentFromPageTexts 포팅, source/audit.ts)를 쓰고,
// 나머지 14개는 U3~U9가 실제 소스 매퍼로 교체하기 전까지 defaultContent를 그대로 반환하는
// placeholder이며 bootstrapReady:false로 표시한다 — import 라우트가 이 표시를 보고 409로 막는다.
//
// 'server-only'를 포함한 서버 전용 의존성은 여기서 import하지 않는다 — cms-source-mapper-contract.spec.ts
// 등 순수 계약 테스트가 이 파일을 그대로 로드해 검증할 수 있어야 한다.
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { auditSourceMapper } from '@/lib/cms/source/audit';

/** CMS_PAGE_DEFINITIONS(15개)의 key 리터럴 합집합. pageDefinitions.ts는 key를 string으로만
 * 타이핑하므로(정의가 헬퍼 함수로 조립돼 리터럴 추론이 안 된다), 레지스트리가 전체 키를
 * 빠짐없이 다루도록 여기서 별도로 리터럴 유니언을 고정한다. */
export type CmsPageKey =
  | 'home'
  | 'site-shell'
  | 'shop'
  | 'brands'
  | 'reviews'
  | 'notices'
  | 'audit'
  | 'b2b'
  | 'concerns'
  | 'experts'
  | 'care-kit'
  | 'insurance-landing'
  | 'terms'
  | 'privacy'
  | 'refund-policy';

/** site_settings 한 행의 활성화 잠금 스냅샷 — 값과 갱신시각을 함께 잠가 소스가 바뀌면 충돌시킨다. */
export interface CmsSourceRow {
  readonly value: unknown;
  readonly updated_at: string;
}

export interface CmsSourceMapper {
  /** 이 매퍼가 잠글 site_settings 행 id 목록. import 라우트가 이 id들의 값/갱신시각을 읽어 잠근다. */
  readonly siteSettingIds: readonly string[];
  /** false면 아직 실제 소스 매퍼가 연결되지 않았다는 뜻 — import 라우트가 409로 거절한다. */
  readonly bootstrapReady: boolean;
  /** 잠근 소스 행으로부터 CmsPageDefinition 구조의 콘텐츠를 계산한다(순수 함수, 부작용 없음). */
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown>;
}

function placeholderMapper(pageKey: CmsPageKey): CmsSourceMapper {
  return {
    siteSettingIds: [],
    bootstrapReady: false,
    build(): Record<string, unknown> {
      const definition = getCmsPageDefinition(pageKey);
      if (!definition) throw new Error(`cms-source-mapper-definition-missing:${pageKey}`);
      return normalizeCmsPageContent(definition, definition.defaultContent);
    },
  };
}

export const CMS_SOURCE_REGISTRY: Record<CmsPageKey, CmsSourceMapper> = {
  audit: auditSourceMapper,
  home: placeholderMapper('home'),
  'site-shell': placeholderMapper('site-shell'),
  shop: placeholderMapper('shop'),
  brands: placeholderMapper('brands'),
  reviews: placeholderMapper('reviews'),
  notices: placeholderMapper('notices'),
  b2b: placeholderMapper('b2b'),
  concerns: placeholderMapper('concerns'),
  experts: placeholderMapper('experts'),
  'care-kit': placeholderMapper('care-kit'),
  'insurance-landing': placeholderMapper('insurance-landing'),
  terms: placeholderMapper('terms'),
  privacy: placeholderMapper('privacy'),
  'refund-policy': placeholderMapper('refund-policy'),
};

function isCmsPageKey(pageKey: string): pageKey is CmsPageKey {
  return Object.hasOwn(CMS_SOURCE_REGISTRY, pageKey);
}

export function getCmsSourceBuilder(pageKey: string): CmsSourceMapper | null {
  return isCmsPageKey(pageKey) ? CMS_SOURCE_REGISTRY[pageKey] : null;
}
