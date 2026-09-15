import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { buildExpertsContent, selectExpertsContent, type ExpertsContent } from '@/lib/cms/source/experts';

// experts(/experts) CMS 소비 배선의 순수 계약 — 브라우저·DB 불필요(products 프로젝트).
// D3: 소비자는 항상 getPublishedPageContent(key) ?? mapper(현재 소스) 2단이고, 부트스트랩과 소비가
// 같은 순수 매퍼(buildExpertsContent/selectExpertsContent)를 쓴다.

const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('buildExpertsContent(defaultPageTextSettings)의 normalize 결과가 definition.defaultContent와 같다', () => {
  const definition = getCmsPageDefinition('experts');
  expect(definition).not.toBeNull();
  if (!definition) return;
  const built = buildExpertsContent(defaultPageTextSettings);
  expect(normalizeCmsPageContent(definition, built)).toEqual(
    normalizeCmsPageContent(definition, definition.defaultContent),
  );
});

test('experts 정의에는 화면에 없는 히어로 CTA·본문 설명 필드를 두지 않는다(NO-CURRENT-EQUIVALENT 드롭)', () => {
  const definition = getCmsPageDefinition('experts');
  expect(definition).not.toBeNull();
  if (!definition) return;
  const heroSection = definition.sections.find((section) => section.id === 'hero');
  expect(heroSection?.fields.some((field) => field.path === 'hero.primaryCtaLabel')).toBe(false);
  expect(heroSection?.fields.some((field) => field.path === 'hero.primaryCtaHref')).toBe(false);
  const bodySection = definition.sections.find((section) => section.id === 'body');
  expect(bodySection?.fields.some((field) => field.path === 'body.description')).toBe(false);
  expect((definition.defaultContent.hero as Record<string, unknown>).primaryCtaLabel).toBeUndefined();
  expect((definition.defaultContent.body as Record<string, unknown>).description).toBeUndefined();
});

test('experts 페이지 소스가 CMS 소비 배선과 필드화된 문구를 포함한다', () => {
  const source = read('src', 'app', 'experts', 'page.tsx');
  expect(source).toContain("getPublishedPageContent<ExpertsContent>('experts')");
  expect(source).toContain('data-cms-managed={managed ? \'experts\' : undefined}');
  // 예전엔 리터럴이던 문구 3종이 이제 CMS 필드 참조로 바뀌었다.
  expect(source).toContain('content.body.productsTitle');
  expect(source).toContain('content.body.emptyText');
  expect(source).toContain('content.body.noticeTitle');
  expect(source).toContain('content.hero.eyebrow');
  // 드롭한 NO-CURRENT-EQUIVALENT 문구는 소스에 다시 등장하지 않는다.
  expect(source).not.toContain('고민별 케어 보기');
});

test('긴 값·빈 값·공백 값 오버라이드가 selectExpertsContent를 거쳐 그대로 보존된다', () => {
  const definition = getCmsPageDefinition('experts');
  if (!definition) throw new Error('experts 정의 없음');
  const base = buildExpertsContent(defaultPageTextSettings);
  const longText = '문장 '.repeat(400);
  const overridden = normalizeCmsPageContent(definition, {
    ...base,
    hero: { ...base.hero, title: longText },
    body: { ...base.body, emptyText: '', noticeTitle: '   ' },
  }) as ExpertsContent;

  expect(selectExpertsContent(overridden, defaultPageTextSettings)).toBe(overridden);
  expect(overridden.hero.title).toBe(longText);
  expect(overridden.body.emptyText).toBe('');
  expect(overridden.body.noticeTitle).toBe('   ');
});

test('published가 null이면 selectExpertsContent가 buildExpertsContent(settings)로 폴백한다', () => {
  expect(selectExpertsContent(null, defaultPageTextSettings)).toEqual(
    buildExpertsContent(defaultPageTextSettings),
  );
});
