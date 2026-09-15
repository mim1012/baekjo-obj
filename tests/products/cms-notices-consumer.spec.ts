import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { defaultPageTextSettings } from '@/data/pageTextContent';
import { getCmsPageDefinition } from '@/lib/cms/pageDefinitions';
import { normalizeCmsPageContent } from '@/lib/cms/normalize';
import { buildNoticesContent, selectNoticesContent, type NoticesContent } from '@/lib/cms/source/notices';

// notices(/notices) CMS 소비 배선의 순수 계약 — 공지 목록 자체는 여전히 notices repo가 정본이고,
// 여기서 다루는 건 제목·설명·건수 이름, 표 머리글, 빈 목록 문구뿐이다. 브라우저·DB 불필요.

const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('buildNoticesContent(defaultPageTextSettings)의 normalize 결과가 definition.defaultContent와 같다', () => {
  const definition = getCmsPageDefinition('notices');
  expect(definition).not.toBeNull();
  if (!definition) return;
  const built = buildNoticesContent(defaultPageTextSettings);
  expect(normalizeCmsPageContent(definition, built)).toEqual(
    normalizeCmsPageContent(definition, definition.defaultContent),
  );
});

test('empty.title 기본값은 화면 문구("등록된 공지사항이 없습니다.")로 수정돼 있고 description 필드는 없다(NO-CURRENT-EQUIVALENT 드롭)', () => {
  const definition = getCmsPageDefinition('notices');
  expect(definition).not.toBeNull();
  if (!definition) return;
  expect((definition.defaultContent.empty as Record<string, unknown>).title).toBe('등록된 공지사항이 없습니다.');
  expect((definition.defaultContent.empty as Record<string, unknown>).description).toBeUndefined();
  const emptySection = definition.sections.find((section) => section.id === 'empty');
  expect(emptySection?.fields.some((field) => field.path === 'empty.description')).toBe(false);
});

test('notices 페이지 소스가 CMS 소비 배선과 필드화된 문구를 포함하고, 모바일 No. 접두어도 CMS 필드를 재사용한다', () => {
  const source = read('src', 'app', 'notices', 'page.tsx');
  expect(source).toContain("getPublishedPageContent<NoticesContent>('notices')");
  expect(source).toContain('data-cms-managed={managed ? \'notices\' : undefined}');
  expect(source).toContain('getNoticesConfigWithFallback');
  // 예전엔 리터럴이던 문구가 이제 CMS 필드 참조로 바뀌었다 — 모바일 "No. {n}" 접두어는 새 필드를
  // 만들지 않고 기존 table.numberLabel을 재사용해 하드코딩을 없앴다(HARDCODED-NOT-IN-DEFINITION 해소).
  expect(source).toContain('content.table.numberLabel');
  expect(source).toContain('content.hero.eyebrow');
  expect(source).toContain('content.empty.title');
  expect(source).not.toMatch(/>No\. \{notices\.length/);
});

test('긴 값·빈 값·공백 값 오버라이드가 selectNoticesContent를 거쳐 그대로 보존된다', () => {
  const definition = getCmsPageDefinition('notices');
  if (!definition) throw new Error('notices 정의 없음');
  const base = buildNoticesContent(defaultPageTextSettings);
  const longText = '공지 '.repeat(400);
  const overridden = normalizeCmsPageContent(definition, {
    ...base,
    hero: { ...base.hero, description: longText },
    empty: { title: '   ' },
    table: { ...base.table, numberLabel: '' },
  }) as NoticesContent;

  expect(selectNoticesContent(overridden, defaultPageTextSettings)).toBe(overridden);
  expect(overridden.hero.description).toBe(longText);
  expect(overridden.empty.title).toBe('   ');
  expect(overridden.table.numberLabel).toBe('');
});

test('published가 null이면 selectNoticesContent가 buildNoticesContent(settings)로 폴백한다', () => {
  expect(selectNoticesContent(null, defaultPageTextSettings)).toEqual(
    buildNoticesContent(defaultPageTextSettings),
  );
});
