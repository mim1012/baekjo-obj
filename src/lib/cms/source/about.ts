// about 페이지의 소스 매퍼 — 다른 페이지와 달리 원문이 어느 site_settings 행에도 없다(2026-09
// CMS 승격 시점에 새로 생긴 페이지). 잠글 site_settings 행이 없으므로 siteSettingIds: [] 로 두고,
// 정본 기본값(definition.defaultContent, src/app/about/page.tsx의 하드코딩 원문을 그대로 옮긴 값)을
// 그대로 반환한다 — import 라우트는 siteSettingIds가 비어 있으면 소스 조회 루프를 건너뛰고 이
// build() 결과만으로 파생하므로 정상 동작한다.
//
// 'server-only'를 import하지 않는다 — cms-source-mapper-contract.spec.ts가 이 파일을 그대로
// 로드해 normalize(build(...))를 검증한다.
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

export const aboutSourceMapper: CmsSourceMapper = {
  siteSettingIds: [],
  bootstrapReady: true,
  build(_sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('about');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:about');
    return normalizeCmsPageContent(definition, definition.defaultContent);
  },
};
