import { test, expect } from '@playwright/test';
import {
  defaultPageTextSettings,
  pageTextDefinitions,
  validatePageTextSettings,
} from '@/data/pageTextContent';
import { auditContentFromPageTexts, selectAuditContent } from '@/components/admin-new/pages/auditContent';

const auditPage = pageTextDefinitions.find((page) => page.id === 'audit');

test.describe('Audit 페이지 CMS 텍스트 계약', () => {
  test('현재 Audit 필드 전체를 누락 없이 구조화하고 원문을 보존한다', () => {
    expect(auditPage).toBeDefined();
    const values = Object.fromEntries((auditPage?.fields ?? []).map((field) => [
      `audit.${field.id}`, ` 시작:${field.id}\n긴 문구 ${'문장'.repeat(300)} 끝:${field.id} `,
    ]));
    const content = auditContentFromPageTexts({ version: 1, values });
    const strings: string[] = [];
    const collect = (value: unknown): void => {
      if (typeof value === 'string') strings.push(value);
      else if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === 'object') Object.values(value).forEach(collect);
    };
    collect(content);
    for (const [key, value] of Object.entries(values)) {
      expect(strings.filter((entry) => entry.includes(value)), key).toHaveLength(1);
    }
    expect(content.__managedVersion).toBeUndefined();
    expect(content.hero.imageAlt).toBe(values['audit.heroImageAlt']);
    expect(content.hero.title).toBe([values['audit.heroTitleLine1'], values['audit.heroTitleLine2']].join('\n'));
    expect(content.hero.imageCaptionLine1).toBe(values['audit.heroImageCaptionLine1']);
    expect(content.hero.imageCaptionLine2).toBe(values['audit.heroImageCaptionLine2']);
    expect(content.checkpoints.ariaLabel).toBe('백조오브제 Audit 네 가지 기준');
    expect(content.process.ariaLabel).toBe('백조오브제 Audit 검토 과정');
    expect(content.status.ariaLabel).toBe('백조오브제 Audit 안내');
    for (const [index, item] of content.checkpoints.items.entries()) {
      expect(item.number).toBe(values[`audit.pillar${index + 1}Number`]);
      expect(item.bullets).toBe([1, 2, 3].map((check) => values[`audit.pillar${index + 1}Check${check}`]).join('\n'));
    }
    for (const [index, item] of content.process.items.entries()) {
      expect(item.number).toBe(values[`audit.process${index + 1}Number`]);
    }
    expect(content.status.legalDisclaimer).toBe(values['audit.closingDescription']);
    expect(content.closing.links.map((link) => link.label)).toEqual([values['audit.closingBrand'], values['audit.closingShop']]);
  });

  test('repo가 미이관 CMS를 null로 반환하면 현재 문구를 사용하고 활성화된 콘텐츠는 그대로 사용한다', () => {
    const legacy = { ...defaultPageTextSettings, values: { ...defaultPageTextSettings.values, 'audit.heroDescription': '현재 저장된 설명' } };
    expect(selectAuditContent(null, legacy).hero.description).toBe('현재 저장된 설명');
    const published = auditContentFromPageTexts(defaultPageTextSettings);
    expect(selectAuditContent(published, legacy)).toBe(published);
  });

  test('빈 문구와 사용자 지정 번호를 기본값으로 덮어쓰지 않는다', () => {
    const content = auditContentFromPageTexts({
      version: 1,
      values: { 'audit.heroTitleLine1': '', 'audit.pillar1Number': '', 'audit.process1Number': '준비' },
    });
    expect(content.hero.title).toBe(`\n${defaultPageTextSettings.values['audit.heroTitleLine2']}`);
    expect(content.checkpoints.items[0].number).toBe('');
    expect(content.process.items[0].number).toBe('준비');
  });

  test('확장된 Audit 필드 전체가 기존 API 저장 검증을 통과한다', () => {
    const values = Object.fromEntries(
      (auditPage?.fields ?? []).map((field) => [`audit.${field.id}`, `CMS ${field.id}`]),
    );
    expect(validatePageTextSettings({ version: 1, values })).toBe(true);
  });
});
