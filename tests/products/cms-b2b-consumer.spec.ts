import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { buildB2bContent, selectB2bContent, type B2bContent } from '@/lib/cms/source/b2b';

// b2b(/b2b) CMS 소비 배선의 순수 계약 — 브라우저·DB 불필요(products 프로젝트).
// D3: 소비자는 항상 getPublishedPageContent(key) ?? mapper(현재 소스) 2단이고, 부트스트랩과 소비가
// 같은 순수 매퍼(buildB2bContent/selectB2bContent)를 쓴다.

const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('buildB2bContent(defaultPageTextSettings)의 normalize 결과가 definition.defaultContent와 같다', () => {
  const definition = getCmsPageDefinition('b2b');
  expect(definition).not.toBeNull();
  if (!definition) return;
  const built = buildB2bContent(defaultPageTextSettings);
  expect(normalizeCmsPageContent(definition, built)).toEqual(
    normalizeCmsPageContent(definition, definition.defaultContent),
  );
});

test('b2b 페이지 소스가 CMS 소비 배선과 필드화된 문구를 포함한다', () => {
  const source = read('src', 'app', 'b2b', 'page.tsx');
  expect(source).toContain("getPublishedPageContent<B2bContent>('b2b')");
  expect(source).toContain('data-cms-managed={managed ? \'b2b\' : undefined}');
  // 예전엔 리터럴이던 문구 3종이 이제 CMS 필드 참조로 바뀌었다.
  expect(source).toContain('content.hero.title');
  expect(source).toContain('content.partners.title');
  expect(source).toContain('content.closing.title');
  expect(source).not.toContain('반려가족과 만나는 순간을');
  expect(source).not.toContain('목적에 따라 협업의 방식도 달라집니다.');
});

test('page-texts의 b2b.* 필드가 히어로·제목·버튼 문구를 실제로 갈아탄다', () => {
  const overridden = buildB2bContent({
    ...defaultPageTextSettings,
    values: {
      ...defaultPageTextSettings.values,
      'b2b.heroTitleLine1': '오버라이드 제목1',
      'b2b.heroTitleLine2': '오버라이드 제목2',
      'b2b.typeTitle': '오버라이드 협업 유형 제목',
      'b2b.closingTitle': '오버라이드 마지막 제목',
    },
  });
  expect(overridden.hero.title).toBe('오버라이드 제목1\n오버라이드 제목2');
  expect(overridden.partners.title).toBe('오버라이드 협업 유형 제목');
  expect(overridden.closing.title).toBe('오버라이드 마지막 제목');
});

test('긴 값·빈 값·공백 값 오버라이드가 selectB2bContent를 거쳐 그대로 보존된다', () => {
  const definition = getCmsPageDefinition('b2b');
  if (!definition) throw new Error('b2b 정의 없음');
  const base = buildB2bContent(defaultPageTextSettings);
  const longText = '문장 '.repeat(400);
  const overridden = normalizeCmsPageContent(definition, {
    ...base,
    hero: { ...base.hero, title: longText },
    partners: { ...base.partners, title: '', description: '   ' },
  }) as B2bContent;

  expect(selectB2bContent(overridden, defaultPageTextSettings)).toBe(overridden);
  expect(overridden.hero.title).toBe(longText);
  expect(overridden.partners.title).toBe('');
  expect(overridden.partners.description).toBe('   ');
});

test('published가 null이면 selectB2bContent가 buildB2bContent(settings)로 폴백한다', () => {
  expect(selectB2bContent(null, defaultPageTextSettings)).toEqual(
    buildB2bContent(defaultPageTextSettings),
  );
});
