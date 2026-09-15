import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import {
  buildInsuranceLandingContent,
  selectInsuranceLandingContent,
  type InsuranceLandingContent,
} from '@/lib/cms/source/insuranceLanding';

// insurance-landing(/landing/insurance) CMS 소비 배선의 순수 계약 — 브라우저·DB 불필요.

const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('buildInsuranceLandingContent(defaultPageTextSettings)의 normalize 결과가 definition.defaultContent와 같다', () => {
  const definition = getCmsPageDefinition('insurance-landing');
  expect(definition).not.toBeNull();
  if (!definition) return;
  const built = buildInsuranceLandingContent(defaultPageTextSettings);
  expect(normalizeCmsPageContent(definition, built)).toEqual(
    normalizeCmsPageContent(definition, definition.defaultContent),
  );
});

test('hero.eyebrow 기본값은 화면 원문 그대로 Free Insurance Review(타이틀케이스)다', () => {
  const definition = getCmsPageDefinition('insurance-landing');
  expect(definition).not.toBeNull();
  if (!definition) return;
  expect((definition.defaultContent.hero as Record<string, unknown>).eyebrow).toBe('Free Insurance Review');
});

test('insurance-landing 페이지 소스가 CMS 소비 배선과 필드화된 문구를 포함한다', () => {
  const source = read('src', 'app', 'landing', 'insurance', 'page.tsx');
  expect(source).toContain("getPublishedPageContent<InsuranceLandingContent>('insurance-landing')");
  expect(source).toContain('data-cms-managed={managed ? \'insurance-landing\' : undefined}');
  // 예전엔 리터럴이던 문구 3종이 이제 CMS 필드 참조로 바뀌었다.
  expect(source).toContain('content.hero.eyebrow');
  expect(source).toContain('content.body.ctaLabel');
  expect(source).toContain('content.body.processTitle');
  // 대문자로 미리 바꿔둔 잘못된 원문(구버전 정의값)은 소스에 다시 등장하지 않는다.
  expect(source).not.toContain('FREE INSURANCE REVIEW');
});

test('긴 값·빈 값·공백 값 오버라이드가 selectInsuranceLandingContent를 거쳐 그대로 보존된다', () => {
  const definition = getCmsPageDefinition('insurance-landing');
  if (!definition) throw new Error('insurance-landing 정의 없음');
  const base = buildInsuranceLandingContent(defaultPageTextSettings);
  const longText = '약관 '.repeat(400);
  const overridden = normalizeCmsPageContent(definition, {
    ...base,
    hero: { ...base.hero, description: longText },
    body: { ...base.body, ctaTitle: '', processTitle: '   ' },
  }) as InsuranceLandingContent;

  expect(selectInsuranceLandingContent(overridden, defaultPageTextSettings)).toBe(overridden);
  expect(overridden.hero.description).toBe(longText);
  expect(overridden.body.ctaTitle).toBe('');
  expect(overridden.body.processTitle).toBe('   ');
});

test('published가 null이면 selectInsuranceLandingContent가 buildInsuranceLandingContent(settings)로 폴백한다', () => {
  expect(selectInsuranceLandingContent(null, defaultPageTextSettings)).toEqual(
    buildInsuranceLandingContent(defaultPageTextSettings),
  );
});
