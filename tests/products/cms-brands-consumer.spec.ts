import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { buildBrandsContent, selectBrandsContent, type BrandsContentData } from '@/lib/cms/source/brands';

// brands(/brands) CMS 소비 배선의 순수 계약 — 브랜드 카드 목록 자체는 여전히 brands repo가
// 정본이고, 여기서 다루는 건 히어로·선정 기준·스포트라이트·필터 탭 이름·입점 안내 문구뿐이다.
// 브라우저·DB 불필요.

const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('buildBrandsContent(defaultPageTextSettings)의 normalize 결과가 definition.defaultContent와 같다', () => {
  const definition = getCmsPageDefinition('brands');
  expect(definition).not.toBeNull();
  if (!definition) return;
  const built = buildBrandsContent(defaultPageTextSettings);
  expect(normalizeCmsPageContent(definition, built)).toEqual(
    normalizeCmsPageContent(definition, definition.defaultContent),
  );
});

test('brands 서버 페이지가 CMS 콘텐츠를 계산해 클라이언트 컴포넌트에 props로 내려주고, 브랜드·재고수 조회는 repo를 그대로 쓴다', () => {
  const source = read('src', 'app', 'brands', 'page.tsx');
  expect(source).toContain("getPublishedPageContent<BrandsContentData>('brands')");
  expect(source).toContain('selectBrandsContent(published, settings)');
  expect(source).toContain('listCachedPublicBrands');
  expect(source).toContain('getCachedPublicProductCountsByBrand');
  expect(source).toContain('content={content} managed={managed}');
});

test('BrandsContent 클라이언트 컴포넌트가 예전엔 리터럴이던 문구를 CMS 필드 참조로 렌더하고 루트에 data-cms-managed를 붙인다', () => {
  const source = read('src', 'components', 'brands', 'BrandsContent.tsx');
  expect(source).toContain('data-cms-managed={managed ? \'brands\' : undefined}');
  // 예전엔 하드코딩 리터럴이던 문구가 이제 CMS 필드 참조로 바뀌었다.
  expect(source).toContain('content.hero.description');
  expect(source).toContain('content.hero.countSuffix');
  expect(source).toContain('content.standards.items');
  expect(source).toContain('content.spotlight.label');
  expect(source).toContain('content.catalog.filterAllLabel');
  expect(source).toContain('content.empty.title');
  expect(source).toContain('content.partnership.description');
  // 정정된 값(D3: 정의가 현재 화면과 다르면 화면이 정답) 자체는 pageDefinitions.ts에 있다 — 여기서는
  // 컴포넌트가 더는 이 문구들을 하드코딩하지 않는다는 것만 확인한다.
  expect(source).not.toContain('안심하고 선택할 수 있는 안전성을 갖춘 브랜드');
  expect(source).not.toContain('모든 프로젝트는 백조오브제 Audit을 거친 입점 브랜드에 한해 진행합니다.');
});

test('pageDefinitions.ts의 brands defaultContent가 현재 화면 문구(D3: 정의가 화면과 다르면 화면이 정답)로 정정돼 있다', () => {
  const definition = getCmsPageDefinition('brands');
  if (!definition) throw new Error('brands 정의 없음');
  const content = definition.defaultContent as BrandsContentData;
  expect(content.hero.description).toBe('백조오브제가 공개 자료와 브랜드 제출 자료를 바탕으로 자체 기준에 따라 살펴본 브랜드입니다.');
  expect(content.hero).not.toHaveProperty('countLabel');
  expect(content.hero.countSuffix).toBe('곳의 큐레이션 브랜드');
  expect(content.standards.items[3]).toMatchObject({ title: 'SAFETY', description: '안전 관련 표시·인증 자료와 사용상 주의사항을 확인합니다' });
  expect(content.partnership.description).toBe(
    '공개 자료와 브랜드 제출 자료를 바탕으로 백조오브제의 자체 기준을 살펴봅니다.\n신뢰를 바탕으로 브랜드에 가장 적합한 프로젝트를 제안합니다.',
  );
  expect(content.catalog).toMatchObject({
    filterAllLabel: '전체',
    filterRecommendedLabel: '백조오브제 추천',
    filterNewLabel: '새로 만난 브랜드',
  });
});

test('긴 값·빈 값 오버라이드가 selectBrandsContent를 거쳐 그대로 보존된다', () => {
  const definition = getCmsPageDefinition('brands');
  if (!definition) throw new Error('brands 정의 없음');
  const base = buildBrandsContent(defaultPageTextSettings);
  const longText = '브랜드 '.repeat(400);
  const overridden = normalizeCmsPageContent(definition, {
    ...base,
    hero: { ...base.hero, description: longText },
    empty: { title: '', description: '   ', buttonLabel: base.empty.buttonLabel },
  }) as BrandsContentData;

  expect(selectBrandsContent(overridden, defaultPageTextSettings)).toBe(overridden);
  expect(overridden.hero.description).toBe(longText);
  expect(overridden.empty.title).toBe('');
  expect(overridden.empty.description).toBe('   ');
});

test('published가 null이면 selectBrandsContent가 buildBrandsContent(settings)로 폴백한다', () => {
  expect(selectBrandsContent(null, defaultPageTextSettings)).toEqual(
    buildBrandsContent(defaultPageTextSettings),
  );
});
