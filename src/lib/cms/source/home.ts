// home 페이지의 소스 매퍼 — site_settings(id='home') 한 행을 원본으로 삼는다.
//
// buildHomeContent 는 기존 normalizeHomeSettings(src/data/homeContent.ts)를 그대로 재사용해(D3)
// 부트스트랩(활성화)과 공개 홈 소비자가 같은 순수 정규화 로직을 쓰도록 한다. HomeSettings 는
// home 정의(sections)가 다루지 않는 구조 배열(quickShop.links·curation.cards·audit.criteria·
// solutions.cards — 아이콘·이미지·href가 HomeClient에 하드코딩된 항목형 데이터)을 포함하므로,
// 이 매퍼는 normalizeCmsPageContent 로 다시 감싸지 않는다: normalizeHomeSettings 출력이 이미
// HomeSettings 전체 계약(구조 배열 포함)을 만족하고, home 정의 sections은 text/textarea 문구만
// 다룬다(D5). normalizeCmsPageContent 로 감싸면 선언되지 않은 구조 배열은 그대로 통과하므로
// 결과는 같지만, 굳이 두 번 정규화할 필요가 없다.
//
// 'server-only'를 import하지 않는다 — cms-source-mapper-contract.spec.ts가 이 파일을 그대로
// 로드해 normalize(build(...))를 검증한다.
import {
  defaultHomeSettings,
  normalizeHomeSettings,
  type HomeSettings,
} from '@/data/homeContent';
import type { CmsSourceMapper, CmsSourceRow } from '@/lib/cms/source/registry';

// 다른 페이지들(b2b.ts·notices.ts 등)과 동일한 관례 — CmsSourceMapper.build()가 약속하는
// Record<string, unknown> 리턴 타입과 getPublishedPageContent<T extends Record<string, unknown>>
// 제약을 동시에 만족시키려면, 순수 인터페이스(HomeSettings, 인덱스 시그니처 없음)를 그대로 쓸 수
// 없다 — 인덱스 시그니처가 있는 Record<string, unknown>과 교차시킨 별도 타입을 이 파일 안에서
// 선언한다(HomeSettings 자체는 homeContent.ts의 기존 소비자들을 위해 그대로 둔다).
export type HomeCmsContent = Record<string, unknown> & HomeSettings;

/** site_settings(id='home') 행 하나로부터 현재 화면과 동일한 HomeSettings 를 계산한다(순수 함수). */
export function buildHomeContent(sources: Record<string, CmsSourceRow | null>): HomeCmsContent {
  return normalizeHomeSettings(sources['home']?.value ?? defaultHomeSettings) as HomeCmsContent;
}

/**
 * 공개 소비자(src/app/page.tsx)가 게시본 유무에 따라 최종 HomeSettings 를 고른다(D3의 2단 폴백).
 * audit의 selectAuditContent(auditContent.ts:103)와 동일한 모양 — published(게시된 CMS 콘텐츠,
 * 이미 getPublishedPageContent가 home 정의로 정규화한 값)가 있으면 그대로 신뢰하고, 없으면 기존
 * site_settings 경로(settings)로 폴백한다 — settings 마저 없으면(조회 실패) defaultHomeSettings.
 *
 * published 를 normalizeHomeSettings 로 다시 감싸지 않는다 — 그 함수는 알려진 8개 키만 재구성하는
 * allow-list라 미래에 추가될 알려지지 않은 필드를 도로 잘라낸다. getPublishedPageContent가 이미
 * normalizeCmsPageContent(home 정의)로 선언된 text/textarea 리프를 올바른 타입으로 맞췄으므로,
 * 여기서는 그대로 통과시켜 구조 보존(preservation)을 유지한다.
 */
export function selectHomeContent(
  published: HomeCmsContent | null,
  settings: HomeSettings | null,
): HomeSettings {
  return published ?? settings ?? defaultHomeSettings;
}

export const homeSourceMapper: CmsSourceMapper = {
  siteSettingIds: ['home'],
  bootstrapReady: true,
  build(sources: Record<string, CmsSourceRow | null>): Record<string, unknown> {
    return buildHomeContent(sources);
  },
};
