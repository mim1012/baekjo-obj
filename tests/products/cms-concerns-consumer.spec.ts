import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { buildConcernsContent, selectConcernsContent, type ConcernsContent } from '@/lib/cms/source/concerns';

// concerns(/concerns) CMS 소비 배선의 순수 계약 — 브라우저·DB 불필요(products 프로젝트).
// D3: 소비자는 항상 getPublishedPageContent(key) ?? mapper(현재 소스) 2단이고, 부트스트랩과 소비가
// 같은 순수 매퍼(buildConcernsContent/selectConcernsContent)를 쓴다. 고민 카드 6+6개는 concerns
// 저장소가 정본이라 이 매퍼의 대상이 아니다 — 첫 화면·보험 배너·FAQ 문구만 다룬다. 보험 배너
// 표시 게이트는 FEATURES.insurance가 정본이며 이 매퍼는 그 게이트를 건드리지 않는다(D6).

const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('buildConcernsContent(defaultPageTextSettings)의 normalize 결과가 definition.defaultContent와 같다', () => {
  const definition = getCmsPageDefinition('concerns');
  expect(definition).not.toBeNull();
  if (!definition) return;
  const built = buildConcernsContent(defaultPageTextSettings);
  expect(normalizeCmsPageContent(definition, built)).toEqual(
    normalizeCmsPageContent(definition, definition.defaultContent),
  );
});

test('concerns 페이지 소스가 CMS 소비 배선과 필드화된 문구를 포함하고 FEATURES 게이트는 그대로 둔다', () => {
  const source = read('src', 'app', 'concerns', 'page.tsx');
  expect(source).toContain("getPublishedPageContent<ConcernsContent>('concerns')");
  expect(source).toContain('data-cms-managed={managed ? \'concerns\' : undefined}');
  // 예전엔 리터럴이던 문구 3종이 이제 CMS 필드 참조로 바뀌었다.
  expect(source).toContain('content.hero.title');
  expect(source).toContain('content.secondary.title');
  expect(source).toContain('content.faq.title');
  expect(source).not.toContain('요즘, 우리 아이에게');
  expect(source).not.toContain('일상에서 함께 확인하면 좋은 관리 주제입니다.');
  // 보험 배너 표시는 여전히 FEATURES.insurance가 유일한 게이트다.
  expect(source).toContain('{FEATURES.insurance && (');
});

test('page-texts의 concerns.* 필드가 추가 케어·FAQ 제목을 실제로 갈아탄다', () => {
  const overridden = buildConcernsContent({
    ...defaultPageTextSettings,
    values: {
      ...defaultPageTextSettings.values,
      'concerns.moreCareTitle': '오버라이드 추가 케어 제목',
      'concerns.moreCareDescription': '오버라이드 추가 케어 설명',
      'concerns.faqTitle': '오버라이드 FAQ 제목',
    },
  });
  expect(overridden.secondary.title).toBe('오버라이드 추가 케어 제목');
  expect(overridden.secondary.description).toBe('오버라이드 추가 케어 설명');
  expect(overridden.faq.title).toBe('오버라이드 FAQ 제목');
});

test('긴 값·빈 값·공백 값 오버라이드가 selectConcernsContent를 거쳐 그대로 보존된다', () => {
  const definition = getCmsPageDefinition('concerns');
  if (!definition) throw new Error('concerns 정의 없음');
  const base = buildConcernsContent(defaultPageTextSettings);
  const longText = '문장 '.repeat(400);
  const overridden = normalizeCmsPageContent(definition, {
    ...base,
    secondary: { ...base.secondary, title: longText },
    faq: { ...base.faq, title: '' },
    insurance: { ...base.insurance, description: '   ' },
  }) as ConcernsContent;

  expect(selectConcernsContent(overridden, defaultPageTextSettings)).toBe(overridden);
  expect(overridden.secondary.title).toBe(longText);
  expect(overridden.faq.title).toBe('');
  expect(overridden.insurance.description).toBe('   ');
});

test('published가 null이면 selectConcernsContent가 buildConcernsContent(settings)로 폴백한다', () => {
  expect(selectConcernsContent(null, defaultPageTextSettings)).toEqual(
    buildConcernsContent(defaultPageTextSettings),
  );
});
