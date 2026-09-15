import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { buildShopContent, selectShopContent, type ShopContentData } from '@/lib/cms/source/shop';

// shop(/shop) CMS 소비 배선의 순수 계약 — 상품 목록 자체는 여전히 products/brands/concerns repo가
// 정본이고, 여기서 다루는 건 첫 화면 문구·추천 영역 제목·필터·정렬 이름·빈 목록 문구뿐이다.
// 필터 데이터(카테고리 slug, 가격 임계값, 정렬 키)는 옮기지 않는다 — 화면에 보이는 라벨만 CMS
// 필드로 바뀐다. 브라우저·DB 불필요.

const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('buildShopContent(defaultPageTextSettings)의 normalize 결과가 definition.defaultContent와 같다', () => {
  const definition = getCmsPageDefinition('shop');
  expect(definition).not.toBeNull();
  if (!definition) return;
  const built = buildShopContent(defaultPageTextSettings);
  expect(normalizeCmsPageContent(definition, built)).toEqual(
    normalizeCmsPageContent(definition, definition.defaultContent),
  );
});

test('shop 서버 페이지가 CMS 콘텐츠를 계산해 클라이언트 컴포넌트에 props로 내려주고, 상품·브랜드·고민 조회는 repo를 그대로 쓴다', () => {
  const source = read('src', 'app', 'shop', 'page.tsx');
  expect(source).toContain("getPublishedPageContent<ShopContentData>('shop')");
  expect(source).toContain('selectShopContent(published, settings)');
  expect(source).toContain('listCachedPublicProducts');
  expect(source).toContain('listCachedPublicBrands');
  expect(source).toContain('getConcernsConfigWithFallback');
  expect(source).toContain('content={content} managed={managed}');
});

test('ShopContent 클라이언트 컴포넌트가 예전엔 리터럴이던 문구를 CMS 필드 참조로 렌더하고 루트에 data-cms-managed를 붙인다', () => {
  const source = read('src', 'components', 'shop', 'ShopContent.tsx');
  expect(source).toContain('data-cms-managed={managed ? \'shop\' : undefined}');
  // 예전엔 하드코딩 리터럴이던 문구가 이제 CMS 필드 참조로 바뀌었다.
  expect(source).toContain('content.hero.eyebrow');
  expect(source).toContain('content.hero.searchPlaceholder');
  expect(source).toContain('content.featured.title');
  expect(source).toContain('content.filters.lifestyleTitle');
  expect(source).toContain('content.filters.detailLabel');
  expect(source).toContain('content.empty.title');
  expect(source).toContain('content.catalog.resetLabel');
  // 필터 의미(가격 임계값·정렬 키)는 CMS로 옮기지 않는다 — id는 그대로 데이터로 남는다.
  expect(source).toContain("'under-20000'");
  expect(source).toContain("minPrice = priceRange === '20000-50000'");
});

test('긴 값·빈 값 오버라이드가 selectShopContent를 거쳐 그대로 보존된다', () => {
  const definition = getCmsPageDefinition('shop');
  if (!definition) throw new Error('shop 정의 없음');
  const base = buildShopContent(defaultPageTextSettings);
  const longText = '상품 '.repeat(400);
  const overridden = normalizeCmsPageContent(definition, {
    ...base,
    hero: { ...base.hero, description: longText },
    empty: { title: '', buttonLabel: '   ' },
  }) as ShopContentData;

  expect(selectShopContent(overridden, defaultPageTextSettings)).toBe(overridden);
  expect(overridden.hero.description).toBe(longText);
  expect(overridden.empty.title).toBe('');
  expect(overridden.empty.buttonLabel).toBe('   ');
});

test('published가 null이면 selectShopContent가 buildShopContent(settings)로 폴백한다', () => {
  expect(selectShopContent(null, defaultPageTextSettings)).toEqual(
    buildShopContent(defaultPageTextSettings),
  );
});
