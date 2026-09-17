import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { getValueAtPath, normalizeCmsPageContent } from '@/lib/cms/normalize';
import { CMS_PAGE_DEFINITIONS, getCmsPageDefinition } from '@/lib/cms/pageDefinitions';

// B2 회귀 방지 — string[] textarea 필드(예: home hero.titleLines, refund-policy articles[].noticeLines)가
// 관리자 편집기에서 빈 칸으로 보이던 버그의 계약 스펙. 세 가지를 고정한다:
//  (a) defaultContent가 배열인 모든 textarea 필드(최상위·항목 필드 공통)는 linesArray 플래그가 선언돼 있다
//      — 새 string[] 필드를 추가하면서 플래그를 빠뜨리는 회귀를 CI가 즉시 잡는다.
//  (b) FieldEditor/ItemListEditor가 그 플래그를 실제로 읽어 join(표시)/그대로 전달(onChange)한다
//      — 소스 그렙으로 구현 존재를 고정(코드 삭제·되돌림 회귀 방지).
//  (c) normalizeCmsPageContent 라운드트립 — 편집기가 보낸 줄바꿈 문자열이 배열로 복원된다.

const root = path.resolve(__dirname, '..', '..');

function read(...segments: readonly string[]): string {
  return fs.readFileSync(path.join(root, ...segments), 'utf8');
}

test('every textarea field whose defaultContent value is a string[] declares linesArray:true (top-level fields)', () => {
  for (const definition of CMS_PAGE_DEFINITIONS) {
    for (const section of definition.sections) {
      for (const field of section.fields) {
        const fallback = getValueAtPath(definition.defaultContent, field.path);
        // link-list/item-list 필드도 배열이지만 항목이 객체(CmsLinkItem 등)다 — 여기서 다루는
        // "linesArray"는 string[] textarea 전용 규약이므로 배열의 모든 항목이 string일 때만
        // 대상으로 삼는다(link-list/item-list의 field.type은 애초에 'textarea'가 아니라 별도
        // 분기라 오탐하지 않는다).
        const isStringArray = field.type !== 'link-list' && field.type !== 'item-list'
          && Array.isArray(fallback) && fallback.every((item) => typeof item === 'string');
        if (isStringArray) {
          expect(
            field.type,
            `${definition.key}.${field.path} 는 defaultContent가 string[]인데 type이 textarea가 아니다`,
          ).toBe('textarea');
          expect(
            field.linesArray,
            `${definition.key}.${field.path} 는 defaultContent가 string[]인데 linesArray 플래그가 없다`,
          ).toBe(true);
        }
      }
    }
  }
});

test('every item field whose default item shape is a string[] declares linesArray:true (item-list fields)', () => {
  for (const definition of CMS_PAGE_DEFINITIONS) {
    for (const section of definition.sections) {
      for (const field of section.fields) {
        if (field.type !== 'item-list') continue;
        const items = getValueAtPath(definition.defaultContent, field.path);
        if (!Array.isArray(items)) continue;
        for (const itemField of field.itemFields ?? []) {
          const hasArrayValue = items.some((item) => {
            if (typeof item !== 'object' || item === null) return false;
            return Array.isArray((item as Record<string, unknown>)[itemField.key]);
          });
          if (hasArrayValue) {
            expect(
              itemField.type,
              `${definition.key}.${field.path}[].${itemField.key} 는 배열 값을 갖는데 type이 textarea가 아니다`,
            ).toBe('textarea');
            expect(
              itemField.linesArray,
              `${definition.key}.${field.path}[].${itemField.key} 는 배열 값을 갖는데 linesArray 플래그가 없다`,
            ).toBe(true);
          }
        }
      }
    }
  }
});

test('home hero.titleLines / hero.descriptionLines / audit.titleLines and refund-policy articles[].noticeLines are declared as linesArray textareas', () => {
  const home = getCmsPageDefinition('home');
  expect(home).not.toBeNull();
  if (!home) return;
  const homeFields = home.sections.flatMap((section) => section.fields);
  for (const path_ of ['hero.titleLines', 'hero.descriptionLines', 'audit.titleLines']) {
    const field = homeFields.find((candidate) => candidate.path === path_);
    expect(field?.type, `${path_} 누락 또는 type 불일치`).toBe('textarea');
    expect(field?.linesArray, `${path_} linesArray 플래그 누락`).toBe(true);
  }

  const refundPolicy = getCmsPageDefinition('refund-policy');
  expect(refundPolicy).not.toBeNull();
  if (!refundPolicy) return;
  const articlesField = refundPolicy.sections
    .flatMap((section) => section.fields)
    .find((field) => field.path === 'articles');
  expect(articlesField?.type).toBe('item-list');
  const noticeLinesItemField = articlesField?.itemFields?.find((itemField) => itemField.key === 'noticeLines');
  expect(noticeLinesItemField?.type).toBe('textarea');
  expect(noticeLinesItemField?.linesArray).toBe(true);
});

test('FieldEditor renders string[] textarea values by joining with newline and passes onChange text through unchanged', () => {
  const source = read('src', 'components', 'admin-new', 'pages', 'FieldEditor.tsx');
  expect(source).toContain('field.linesArray');
  expect(source).toMatch(/\.join\(['"`]\\n['"`]\)/);
});

test('ItemListEditor renders string[] textarea item values by joining with newline', () => {
  const source = read('src', 'components', 'admin-new', 'pages', 'ItemListEditor.tsx');
  expect(source).toContain('itemField.linesArray');
  expect(source).toMatch(/\.join\(['"`]\\n['"`]\)/);
});

test('FieldEditor linesArray branch does not clear the field when the in-progress value is already a string (B1 regression)', () => {
  // onChange for a textarea always sends a string, so after the first keystroke on a linesArray
  // field the in-memory value is string, not string[]. If the linesArray branch only handles the
  // Array.isArray(value) case and falls back to '' otherwise, every keystroke wipes the textarea.
  // Assert the fallback branch explicitly preserves an in-progress string instead of blanking it.
  const source = read('src', 'components', 'admin-new', 'pages', 'FieldEditor.tsx');
  const ternaryMatch = source.match(/isLinesArray\s*\n?\s*\?\s*\(Array\.isArray\(value\)[\s\S]*?\n\s*:\s*typeof value === 'string' \? value : ''\)/);
  expect(
    ternaryMatch,
    "FieldEditor의 linesArray 분기가 Array.isArray(value) 거짓일 때 typeof value === 'string' 폴백 없이 ''로 떨어지면 타이핑 중 입력칸이 비워진다",
  ).not.toBeNull();
});

test('ItemListEditor linesArray branch does not clear the field when the in-progress item value is already a string (B1 regression)', () => {
  const source = read('src', 'components', 'admin-new', 'pages', 'ItemListEditor.tsx');
  const ternaryMatch = source.match(/isLinesArray\s*\n?\s*\?\s*\(Array\.isArray\(itemValue\)[\s\S]*?\n\s*:\s*typeof itemValue === 'string' \? itemValue : ''\)/);
  expect(
    ternaryMatch,
    "ItemListEditor의 linesArray 분기가 Array.isArray(itemValue) 거짓일 때 typeof itemValue === 'string' 폴백 없이 ''로 떨어지면 타이핑 중 입력칸이 비워진다",
  ).not.toBeNull();
});

test('normalize round-trip: a joined newline string from the editor for home hero.titleLines becomes an array again', () => {
  const definition = getCmsPageDefinition('home');
  expect(definition).not.toBeNull();
  if (!definition) return;

  const normalized = normalizeCmsPageContent(definition, {
    ...definition.defaultContent,
    hero: {
      ...(definition.defaultContent as { hero: Record<string, unknown> }).hero,
      titleLines: '첫째 줄\n둘째 줄\n',
    },
  });
  expect((normalized as { hero: { titleLines: unknown } }).hero.titleLines).toEqual([
    '첫째 줄',
    '둘째 줄',
    '',
  ]);
});
