// notices(/notices) 페이지의 "현재 값 가져오기(최초 활성화)" 소스 매퍼.
//
// 목록 데이터(공지 자체)는 여전히 notices repo(getNoticesConfigWithFallback)가 정본이다 —
// 여기서 관리하는 건 화면 위쪽 제목·설명·소식 건수 이름, 표 머리글, 빈 목록 문구뿐이다.
// 빈 목록 문구는 현재 한 줄('등록된 공지사항이 없습니다.')만 존재하고 별도 설명 문단은 없다 —
// 정의(pageDefinitions.ts)도 description 필드 없이 title만 갖도록 맞춰뒀다.
import { defaultPageTextSettings, normalizePageTextSettings, type PageTextSettings } from '@/data/pageTextContent';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

export type NoticesContent = Record<string, unknown> & {
  readonly __managedVersion?: number;
  readonly hero: {
    readonly eyebrow: string;
    readonly title: string;
    readonly description: string;
    readonly countSuffix: string;
  };
  readonly table: {
    readonly numberLabel: string;
    readonly categoryLabel: string;
    readonly titleLabel: string;
    readonly dateLabel: string;
  };
  readonly empty: {
    readonly title: string;
  };
};

/** Pure — 오늘의 src/app/notices/page.tsx 리터럴을 그대로 반영한다. */
export function buildNoticesContent(_settings: PageTextSettings): NoticesContent {
  return {
    hero: { eyebrow: 'NEWS & NOTICE', title: '공지사항', description: '백조오브제의 새로운 소식과 안내', countSuffix: '개의 소식' },
    table: { numberLabel: 'No', categoryLabel: '분류', titleLabel: '제목', dateLabel: '작성시간' },
    empty: { title: '등록된 공지사항이 없습니다.' },
  };
}

export function selectNoticesContent(published: NoticesContent | null, settings: PageTextSettings): NoticesContent {
  return published ?? buildNoticesContent(settings);
}

export const noticesSourceMapper: CmsSourceMapper = {
  siteSettingIds: ['page-texts'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    const definition = getCmsPageDefinition('notices');
    if (!definition) throw new Error('cms-source-mapper-definition-missing:notices');
    const rawPageTexts = sources['page-texts']?.value ?? defaultPageTextSettings;
    return normalizeCmsPageContent(definition, buildNoticesContent(normalizePageTextSettings(rawPageTexts)));
  },
};
