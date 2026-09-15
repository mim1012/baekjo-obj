import { expect, test } from '@playwright/test';
import { pageTextDefinitions } from '@/data/pageTextContent';
import { CMS_SOURCE_REGISTRY, type CmsPageKey } from '@/lib/cms/source/registry';
import {
  cmsPageKeyForPageTextId,
  cmsPageKeysManagedByPageTexts,
  isPageTextIdManagedByCms,
} from '@/lib/cms/source/pageTextPageIds';

// U10 일반화 순수 계약 — audit 전용이던 "새 편집기로 안내 + 직접 수정 차단"을 site_settings
// ('page-texts')를 원본으로 쓰는 모든 bootstrapReady 매퍼로 넓혔다는 것을 고정한다. 브라우저·DB
// 불필요(products 프로젝트, PageTextSettingsEditor.tsx가 그대로 쓰는 순수 헬퍼만 검증한다).

test.describe('page-text 편집기 → CMS 페이지 편집기 리다이렉트 매핑', () => {
  test('registry에서 직접 계산한 "page-texts를 원본으로 쓰는 bootstrapReady 매퍼" 키 목록과 정확히 일치한다', () => {
    const expectedKeys = (Object.keys(CMS_SOURCE_REGISTRY) as CmsPageKey[])
      .filter((key) => {
        const mapper = CMS_SOURCE_REGISTRY[key];
        return mapper.bootstrapReady && mapper.siteSettingIds.includes('page-texts');
      })
      .toSorted();
    expect(cmsPageKeysManagedByPageTexts().toSorted()).toEqual(expectedKeys);
    expect(expectedKeys.length).toBeGreaterThan(0);

    const mappedKeysFromPageTextIds = new Set(
      pageTextDefinitions
        .map((page) => cmsPageKeyForPageTextId(page.id))
        .filter((key): key is CmsPageKey => key !== null),
    );
    // 양방향 커버리지: registry가 "page-texts 원본"이라 판단한 키마다, 그 키로 되돌아오는
    // page-text id가 최소 하나는 있어야 한다(고아 CMS 키가 없어야 한다).
    expect(new Set(expectedKeys)).toEqual(mappedKeysFromPageTextIds);
  });

  test('page-texts를 원본으로 쓰는 각 CMS 페이지의 page-text id가 정확히 그 키로 매핑된다', () => {
    const expected: Record<string, CmsPageKey> = {
      audit: 'audit',
      b2b: 'b2b',
      brands: 'brands',
      shop: 'shop',
      concerns: 'concerns',
      experts: 'experts',
      notices: 'notices',
      reviews: 'reviews',
      careKit: 'care-kit',
      insuranceLanding: 'insurance-landing',
      terms: 'terms',
      privacy: 'privacy',
    };
    for (const [pageTextId, cmsKey] of Object.entries(expected)) {
      expect(isPageTextIdManagedByCms(pageTextId), pageTextId).toBe(true);
      expect(cmsPageKeyForPageTextId(pageTextId), pageTextId).toBe(cmsKey);
    }
  });

  test('page-texts를 원본으로 쓰지 않는 page-text id는 옛 편집기가 그대로 담당한다(리다이렉트 안 함)', () => {
    // home은 site_settings('home')을 읽고(page-texts 아님), refundPolicy는 상수만 읽는다(D2/D4
    // 계획) — 둘 다 page-text 편집기 쪽에는 대응하는 실 페이지 id가 있지만 CMS page-texts 소스로
    // 옮겨가지 않았으므로 리다이렉트되면 안 된다. common/productDetail 등 CMS 페이지 정의 자체가
    // 없는 id도 마찬가지다.
    for (const pageTextId of ['refundPolicy', 'common', 'productDetail', 'cart', 'checkout', 'login']) {
      expect(isPageTextIdManagedByCms(pageTextId), pageTextId).toBe(false);
      expect(cmsPageKeyForPageTextId(pageTextId), pageTextId).toBeNull();
    }
  });

  test('알 수 없는 page-text id는 안전하게 false/null을 반환한다', () => {
    expect(isPageTextIdManagedByCms('does-not-exist')).toBe(false);
    expect(cmsPageKeyForPageTextId('does-not-exist')).toBeNull();
  });
});
