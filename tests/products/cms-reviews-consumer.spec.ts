import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { buildReviewsContent, selectReviewsContent, type ReviewsContent } from '@/lib/cms/source/reviews';

// reviews(/reviews) CMS 소비 배선의 순수 계약 — 후기 목록 자체는 여전히 reviews repo가 정본이고,
// 여기서 다루는 건 제목·통계 이름·필터 이름·빈 목록 문구뿐이다. 브라우저·DB 불필요.

const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('buildReviewsContent(defaultPageTextSettings)의 normalize 결과가 definition.defaultContent와 같다', () => {
  const definition = getCmsPageDefinition('reviews');
  expect(definition).not.toBeNull();
  if (!definition) return;
  const built = buildReviewsContent(defaultPageTextSettings);
  expect(normalizeCmsPageContent(definition, built)).toEqual(
    normalizeCmsPageContent(definition, definition.defaultContent),
  );
});

test('reviews 페이지 소스가 CMS 소비 배선과 필드화된 문구를 포함하고 목록 조회는 repo를 그대로 쓴다', () => {
  const source = read('src', 'app', 'reviews', 'page.tsx');
  expect(source).toContain("getPublishedPageContent<ReviewsContent>('reviews')");
  expect(source).toContain('data-cms-managed={managed ? \'reviews\' : undefined}');
  expect(source).toContain('getShowcaseReviewsConfigWithFallback');
  // 예전엔 리터럴이던 문구 3종이 이제 CMS 필드 참조로 바뀌었다.
  expect(source).toContain('content.hero.eyebrow');
  expect(source).toContain('content.stats.totalLabel');
  expect(source).toContain('content.empty.title');
  expect(source).toContain('content.filters');
});

test('긴 값·빈 값·공백 값 오버라이드가 selectReviewsContent를 거쳐 그대로 보존된다', () => {
  const definition = getCmsPageDefinition('reviews');
  if (!definition) throw new Error('reviews 정의 없음');
  const base = buildReviewsContent(defaultPageTextSettings);
  const longText = '후기 '.repeat(400);
  const overridden = normalizeCmsPageContent(definition, {
    ...base,
    hero: { ...base.hero, title: longText },
    empty: { title: '', description: '   ' },
  }) as ReviewsContent;

  expect(selectReviewsContent(overridden, defaultPageTextSettings)).toBe(overridden);
  expect(overridden.hero.title).toBe(longText);
  expect(overridden.empty.title).toBe('');
  expect(overridden.empty.description).toBe('   ');
});

test('published가 null이면 selectReviewsContent가 buildReviewsContent(settings)로 폴백한다', () => {
  expect(selectReviewsContent(null, defaultPageTextSettings)).toEqual(
    buildReviewsContent(defaultPageTextSettings),
  );
});
