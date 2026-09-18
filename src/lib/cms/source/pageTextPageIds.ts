// page-text 편집기(PageTextSettingsEditor)의 페이지 id → CMS 페이지 키 매핑(U10 일반화).
//
// audit 전용이던 "새 편집기로 안내 + 직접 수정 차단" 동작을 모든 페이지로 넓힌다. 이 매핑에 걸리는
// page-text id는 site_settings('page-texts')를 원본으로 쓰는 실 소스 매퍼(bootstrapReady:true이고
// siteSettingIds에 'page-texts'를 포함)로 이미 옮겨간 페이지다 — 옛 편집기에서 이 문구를 고쳐도
// CMS 소비자는 getPublishedPageContent(key)를 우선하므로(D3) 변경이 고객 화면에 반영되지 않는다.
// 그래서 옛 편집기는 이 목록에 있는 page-text id를 audit과 똑같이 새 편집기(/admin/pages/<key>)로
// 안내하고 직접 수정·초기화를 막는다. 목록에 없는 page-text id(예: home처럼 site_settings('home')을
// 읽는 페이지)는 옛 편집기가 계속 담당한다. common(site-shell)·refundPolicy(refund-policy)도
// B3 수정으로 page-texts를 원본에 포함시켜 이 목록으로 들어왔다.
//
// 'server-only'를 import하지 않는다 — registry.ts와 그 매퍼들도 순수 함수라 클라이언트 컴포넌트
// (PageTextSettingsEditor, 'use client')와 순수 스펙(page-text-editor-redirect.spec.ts)이 그대로
// 로드해 쓸 수 있다.
import { CMS_SOURCE_REGISTRY, type CmsPageKey } from '@/lib/cms/source/registry';

/** page-text id가 camelCase인데 CMS 페이지 키는 kebab-case인 경우의 명시적 보정표. 여기 없는
 * page-text id는 registry의 키와 문자 그대로 같다고 가정한다(예: audit, b2b, brands, shop). */
const PAGE_TEXT_ID_TO_CMS_KEY: Record<string, CmsPageKey> = {
  careKit: 'care-kit',
  insuranceLanding: 'insurance-landing',
  // B3: site-shell/refund-policy 매퍼가 page-texts를 원본으로 잠그게 되면서(siteSettingIds:
  // ['page-texts']) 이 둘도 새 편집기로 리다이렉트해야 한다. page-text id는 legacy 이름
  // (common/refundPolicy)이라 CMS 키(site-shell/refund-policy)와 문자 그대로 다르다.
  common: 'site-shell',
  refundPolicy: 'refund-policy',
};

function resolveCmsKey(pageTextId: string): CmsPageKey | null {
  const mapped = PAGE_TEXT_ID_TO_CMS_KEY[pageTextId];
  if (mapped) return mapped;
  return Object.hasOwn(CMS_SOURCE_REGISTRY, pageTextId) ? (pageTextId as CmsPageKey) : null;
}

/** 이 page-text id가 이미 새 페이지 편집기로 넘어갔는지 — 매퍼가 bootstrapReady이고
 * site_settings('page-texts')를 원본 중 하나로 잠그는 경우(siteSettingIds에 'page-texts' 포함)만
 * 그렇다. */
export function isPageTextIdManagedByCms(pageTextId: string): boolean {
  const cmsKey = resolveCmsKey(pageTextId);
  if (!cmsKey) return false;
  const mapper = CMS_SOURCE_REGISTRY[cmsKey];
  return mapper.bootstrapReady && mapper.siteSettingIds.includes('page-texts');
}

/** 위 조건을 만족하는 경우의 CMS 페이지 키(새 편집기 링크 /admin/pages/<key> 생성용). 만족하지
 * 않으면 null — 옛 편집기가 그대로 담당한다는 뜻이다. */
export function cmsPageKeyForPageTextId(pageTextId: string): CmsPageKey | null {
  return isPageTextIdManagedByCms(pageTextId) ? resolveCmsKey(pageTextId) : null;
}

/** CMS_SOURCE_REGISTRY 전체를 훑어, site_settings('page-texts')를 원본으로 쓰는 bootstrapReady
 * 매퍼의 CMS 페이지 키를 모두 모은다. page-text 편집기가 다루지 않는 CMS 키(그런 매퍼가 있다면)는
 * 이 목록에 있어도 대응하는 page-text id가 없을 뿐 문제가 되지 않는다 — 테스트가 반대 방향
 * (page-text id → 존재 여부)으로 커버리지를 확인한다. */
export function cmsPageKeysManagedByPageTexts(): readonly CmsPageKey[] {
  return (Object.keys(CMS_SOURCE_REGISTRY) as CmsPageKey[]).filter((key) => {
    const mapper = CMS_SOURCE_REGISTRY[key];
    return mapper.bootstrapReady && mapper.siteSettingIds.includes('page-texts');
  });
}
