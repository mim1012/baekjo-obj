import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import {
  defaultPageTextSettings,
  normalizeComparableText,
  pageTextDefinitions,
  pageTextReplacementMap,
  validatePageTextSettings,
} from '@/data/pageTextContent';

const ROOT = path.resolve(__dirname, '..', '..');
const auditPageSource = fs.readFileSync(path.join(ROOT, 'src', 'app', 'audit', 'page.tsx'), 'utf8');
const auditPage = pageTextDefinitions.find((page) => page.id === 'audit');
const dynamicNumberFields = new Set([
  'pillar1Number', 'pillar2Number', 'pillar3Number', 'pillar4Number',
  'process1Number', 'process2Number', 'process3Number', 'process4Number',
]);

test.describe('Audit 페이지 CMS 텍스트 계약', () => {
  test('CMS Audit 필드는 화면의 모든 고정 텍스트를 빠짐없이 등록한다', () => {
    expect(auditPage).toBeDefined();
    const source = normalizeComparableText(auditPageSource);

    for (const field of auditPage?.fields ?? []) {
      if (dynamicNumberFields.has(field.id)) continue;
      expect(source, `화면에 없는 기본 문구: audit.${field.id}`).toContain(
        normalizeComparableText(field.defaultValue),
      );
    }
  });

  test('관리자 저장값은 Audit 화면 replacement map의 각 필드로 전달된다', () => {
    expect(auditPage).toBeDefined();
    expect(auditPageSource).toContain("data-page-text-key={`audit.pillar${pillar.number.replace(/^0/u, '')}Number`}");
    expect(auditPageSource).toContain('data-page-text-key={`audit.process${index + 1}Number`}');
    for (const field of auditPage?.fields ?? []) {
      if (dynamicNumberFields.has(field.id)) continue;
      const key = `audit.${field.id}`;
      const value = `CMS 변경값 ${field.id}`;
      const settings = {
        ...defaultPageTextSettings,
        values: { ...defaultPageTextSettings.values, [key]: value },
      };
      const replacements = pageTextReplacementMap('/audit', settings);
      expect(replacements.get(normalizeComparableText(field.defaultValue)), key).toBe(value);
    }
  });

  test('확장된 Audit 필드 전체가 기존 API 저장 검증을 통과한다', () => {
    expect(auditPage).toBeDefined();
    const values = Object.fromEntries(
      (auditPage?.fields ?? []).map((field) => [`audit.${field.id}`, `CMS ${field.id}`]),
    );
    expect(validatePageTextSettings({ version: 1, values })).toBe(true);
  });
});
