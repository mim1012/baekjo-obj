import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { buildCareKitContent, selectCareKitContent, type CareKitContent } from '@/lib/cms/source/care-kit';

// care-kit(/landing/care-kit) CMS 소비 배선의 순수 계약 — 브라우저·DB 불필요(products 프로젝트).
// D3: 소비자는 항상 getPublishedPageContent(key) ?? mapper(현재 소스) 2단이고, 부트스트랩과 소비가
// 같은 순수 매퍼(buildCareKitContent/selectCareKitContent)를 쓴다. 케어키트 카드 자체(이름/구성품)는
// kits 저장소가 정본이라 이 매퍼의 대상이 아니다 — 라벨 문구만 다룬다.

const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('buildCareKitContent(defaultPageTextSettings)의 normalize 결과가 definition.defaultContent와 같다', () => {
  const definition = getCmsPageDefinition('care-kit');
  expect(definition).not.toBeNull();
  if (!definition) return;
  const built = buildCareKitContent(defaultPageTextSettings);
  expect(normalizeCmsPageContent(definition, built)).toEqual(
    normalizeCmsPageContent(definition, definition.defaultContent),
  );
});

test('care-kit 페이지 소스가 CMS 소비 배선과 필드화된 문구를 포함한다', () => {
  const source = read('src', 'app', 'landing', 'care-kit', 'page.tsx');
  expect(source).toContain("getPublishedPageContent<CareKitContent>('care-kit')");
  expect(source).toContain('data-cms-managed={managed ? \'care-kit\' : undefined}');
  // 예전엔 리터럴이던 문구·이미지 라벨이 이제 CMS 필드 참조로 바뀌었다.
  expect(source).toContain('content.body.title');
  expect(source).toContain('content.body.partnerTitle');
  expect(source).toContain('content.body.kitItemsLabel');
  expect(source).toContain('content.body.kitTargetLabel');
  expect(source).not.toContain('첫 케어키트 프로젝트는 페네핏과 함께 기획하고 제작합니다.');
  expect(source).not.toContain('주요 구성품:');
});

test('page-texts의 careKit.* 필드가 본문·문의 문구를 실제로 갈아탄다', () => {
  const overridden = buildCareKitContent({
    ...defaultPageTextSettings,
    values: {
      ...defaultPageTextSettings.values,
      'careKit.partnerButton': '오버라이드 문의 버튼',
      'careKit.partnerTitle': '오버라이드 본문 제목',
      'careKit.inquiryTitle': '오버라이드 문의 제목',
    },
  });
  expect(overridden.hero.primaryCtaLabel).toBe('오버라이드 문의 버튼');
  expect(overridden.body.title).toBe('오버라이드 본문 제목');
  expect(overridden.body.inquiryTitle).toBe('오버라이드 문의 제목');
});

test('긴 값·빈 값·공백 값 오버라이드가 selectCareKitContent를 거쳐 그대로 보존된다', () => {
  const definition = getCmsPageDefinition('care-kit');
  if (!definition) throw new Error('care-kit 정의 없음');
  const base = buildCareKitContent(defaultPageTextSettings);
  const longText = '문장 '.repeat(400);
  const overridden = normalizeCmsPageContent(definition, {
    ...base,
    body: { ...base.body, title: longText, inquiryTitle: '', partnerDescription: '   ' },
  }) as CareKitContent;

  expect(selectCareKitContent(overridden, defaultPageTextSettings)).toBe(overridden);
  expect(overridden.body.title).toBe(longText);
  expect(overridden.body.inquiryTitle).toBe('');
  expect(overridden.body.partnerDescription).toBe('   ');
});

test('published가 null이면 selectCareKitContent가 buildCareKitContent(settings)로 폴백한다', () => {
  expect(selectCareKitContent(null, defaultPageTextSettings)).toEqual(
    buildCareKitContent(defaultPageTextSettings),
  );
});
