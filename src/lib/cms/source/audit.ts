// audit 페이지의 소스 매퍼 — page-texts(site_settings id='page-texts') 하나를 원본으로 삼는다.
// auditContentFromPageTexts(components/admin-new/pages/auditContent.ts)를 그대로 재사용해
// 부트스트랩(활성화)과 기존 audit 전용 import-publish 경로가 같은 순수 매퍼를 쓰도록 한다(D3).
//
// 'server-only'를 import하지 않는다 — cms-source-mapper-contract.spec.ts가 이 파일을 그대로
// 로드해 normalize(build(...))를 검증한다.
import { defaultPageTextSettings, normalizePageTextSettings } from '@/data/pageTextContent';
import { auditContentFromPageTexts } from '@/components/admin-new/pages/auditContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

export const auditSourceMapper: CmsSourceMapper = {
  siteSettingIds: ['page-texts'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('audit');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:audit');
    const rawPageTexts = sources['page-texts']?.value ?? defaultPageTextSettings;
    return normalizeCmsPageContent(
      definition,
      auditContentFromPageTexts(normalizePageTextSettings(rawPageTexts)),
    );
  },
};
