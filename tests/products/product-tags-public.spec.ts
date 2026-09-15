import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultProductTagsConfig } from '@/lib/productTags/config';

// PR3 U2 — 공개 소비 배선의 순수 계약(DB/브라우저 불필요).
// ProductTagSettingsProvider가 /api/product-tags를 읽어 ProductCard(labelBySlug/visibleSlugs/
// hiddenSlugs)와 ShopContent(filterOptions)에 공급한다. ProductCard의 commerceReady·summary·
// 판매자·brandAuditHref는 이 유닛이 절대 건드리지 않는 값이라 원문 그대로 남아있는지도 확인한다.

const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test.describe('ProductTagSettingsProvider', () => {
  const providerSource = read('src', 'components', 'providers', 'ProductTagSettingsProvider.tsx');

  test('공개 GET /api/product-tags를 no-store로 읽고 labelBySlug/visibleSlugs/hiddenSlugs/filterOptions를 노출한다', () => {
    expect(providerSource).toContain("fetch('/api/product-tags', { cache: 'no-store' })");
    expect(providerSource).toContain('labelBySlug');
    expect(providerSource).toContain('visibleSlugs');
    expect(providerSource).toContain('hiddenSlugs');
    expect(providerSource).toContain('filterOptions');
  });

  test('첫 페인트 기본값은 defaultProductTagsConfig에서 유도한다(관리자 저장 실패해도 공개 화면은 기본 라벨을 보장)', () => {
    expect(providerSource).toContain('defaultProductTagsConfig');
    expect(providerSource).toContain('useState<ProductTagSettingsValue>(defaultValue)');
  });

  test('layout.tsx가 CategorySettingsProvider 옆에 ProductTagSettingsProvider를 마운트한다', () => {
    const layout = read('src', 'app', 'layout.tsx');
    expect(layout).toContain('ProductTagSettingsProvider');
    expect(layout).toContain('<CategorySettingsProvider>');
    expect(layout.indexOf('<CategorySettingsProvider>')).toBeLessThan(
      layout.indexOf('<ProductTagSettingsProvider>'),
    );
  });
});

test.describe('ProductCard — 태그 라벨/노출은 provider에서, commerceReady/summary/판매자 표기는 그대로', () => {
  const cardSource = read('src', 'components', 'common', 'ProductCard.tsx');

  test('provider의 labelBySlug/visibleSlugs/hiddenSlugs로 태그를 해석하고, 정적 concernLabels 사전은 제거됐다', () => {
    expect(cardSource).toContain(
      "import { useProductTagSettings } from '@/components/providers/ProductTagSettingsProvider';",
    );
    expect(cardSource).toContain('useProductTagSettings()');
    expect(cardSource).toContain('labelBySlug[tag] ?? tag');
    expect(cardSource).not.toContain('const concernLabels: Record<string, string> = {');
  });

  test('commerceReady·summary·실제 판매자·brandAuditHref 마커는 이 유닛이 건드리지 않는다', () => {
    expect(cardSource).toContain('const commerceReady = isProductCommerceReady(product);');
    expect(cardSource).toContain('const summary = product.summary?.trim();');
    expect(cardSource).toContain(
      "실제 판매자 · {product.seller?.legalName || product.seller?.displayName || '판매자 정보 확인 중'}",
    );
    expect(cardSource).toContain('const brandAuditHref = product.brandId');
    expect(cardSource).toContain('href={brandAuditHref}');
  });
});

test.describe('ShopContent — 고민 필터 옵션은 provider filterOptions, 그룹 제목/전체 라벨은 PR2 CMS', () => {
  const shopSource = read('src', 'components', 'shop', 'ShopContent.tsx');

  test('정적 concernOptions 배열이 없고 provider의 filterOptions를 읽는다', () => {
    expect(shopSource).not.toContain('concernOptions');
    expect(shopSource).toContain(
      "import { useProductTagSettings } from '@/components/providers/ProductTagSettingsProvider';",
    );
    expect(shopSource).toContain('useProductTagSettings()');
    expect(shopSource).toContain('concernFilterOptions.map((concern) =>');
  });

  test('고민 그룹 제목과 전체 라벨은 여전히 PR2 CMS content.filters.* 다', () => {
    expect(shopSource).toContain('title={content.filters.concernTitle}');
    expect(shopSource).toContain("active={!params.concern}>{content.filters.allOptionLabel}");
  });

  test('미사용 concerns prop 플러밍이 제거됐다', () => {
    expect(shopSource).not.toContain('concerns: Concern[]');
    expect(shopSource).not.toContain('concerns={concerns}');
  });
});

test.describe('공개 필터 옵션 기본값 = productTags 설정 기본값', () => {
  test('기본 필터 옵션은 config 기본값과 동일하고, showInShopFilter && isVisible인 5개뿐이다', () => {
    const expected = defaultProductTagsConfig.items
      .filter((item) => item.showInShopFilter && item.isVisible)
      .map((item) => ({ slug: item.slug, label: item.label }));
    expect(expected).toEqual([
      { slug: 'skin', label: '피부' },
      { slug: 'joint', label: '관절' },
      { slug: 'obesity', label: '체중' },
      { slug: 'oral', label: '구강' },
      { slug: 'odor', label: '냄새' },
    ]);
  });
});
