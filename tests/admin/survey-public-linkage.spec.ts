import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { getSurveyResult } from '@/lib/survey/match';
import { isValidSurveyConfig } from '@/lib/survey/config';
import type { SurveyResultRule } from '@/types';

const root = path.resolve(__dirname, '..', '..');
const source = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), 'utf8');

const recommendation: SurveyResultRule['recommendation'] = {
  direction: '연결 결과',
  categorySlug: '',
  brandIds: [],
  productIds: [],
  needInsuranceAnalysis: false,
  recommendKit: false,
};

test.describe('맞춤 진단 관리자 → 고객 결과 연결', () => {
  test('관리자가 고른 질문·답 조건을 실제 결과 계산이 읽는다', () => {
    const rules: SurveyResultRule[] = [
      { id: 'matched', condition: { answers: [{ questionId: 'custom-question', optionValue: 'yes' }] }, recommendation },
      { id: 'fallback', condition: {}, recommendation: { ...recommendation, direction: '기본 결과' } },
    ];

    expect(getSurveyResult({ 'custom-question': 'yes' }, rules)?.id).toBe('matched');
    expect(getSurveyResult({ 'custom-question': 'no' }, rules)?.id).toBe('fallback');
  });

  test('기존 q2·q3 저장 규칙도 결과가 바뀌지 않는다', () => {
    const rules: SurveyResultRule[] = [
      { id: 'legacy', condition: { concern: 'skin' }, recommendation },
      { id: 'fallback', condition: {}, recommendation },
    ];
    expect(getSurveyResult({ q3: ['skin'] }, rules)?.id).toBe('legacy');
  });

  test('삭제된 질문·답을 가리키는 규칙은 저장 계약이 거부한다', () => {
    expect(isValidSurveyConfig({
      questions: [{ id: 'q-new', title: '질문', type: 'single', options: [{ id: 'o1', label: '답', value: 'answer' }] }],
      rules: [{ id: 'r1', condition: { answers: [{ questionId: 'missing', optionValue: 'answer' }] }, recommendation }],
    })).toBe(false);
  });

  test('중복 답 ID와 배열이 아닌 결과 조건도 저장 전에 거부한다', () => {
    const question = {
      id: 'q-new',
      title: '질문',
      type: 'single' as const,
      options: [
        { id: 'same', label: '예', value: 'yes' },
        { id: 'same', label: '아니오', value: 'no' },
      ],
    };
    expect(isValidSurveyConfig({ questions: [question], rules: [{ id: 'r1', condition: {}, recommendation }] })).toBe(false);
    expect(isValidSurveyConfig({
      questions: [{ ...question, options: [question.options[0]] }],
      rules: [{ id: 'r1', condition: { answers: 'broken' }, recommendation }],
    })).toBe(false);
  });

  test('관리 화면은 내부 코드 입력 없이 질문·답·연계 안내·순서를 편집한다', () => {
    const admin = source('src', 'app', 'admin', 'survey', 'page.tsx');
    expect(admin).toContain('진단 결과 화면 공통 문구');
    expect(admin).toContain('getAdminSurveyConfig()');
    expect(admin).toContain('saveSurveyConfig({ questions, rules, resultContent })');
    expect(admin).toContain('고객이 답한 질문');
    expect(admin).toContain('이 답을 골랐을 때');
    expect(admin).toContain('보험 분석 안내 표시');
    expect(admin).toContain('케어키트 안내 표시');
    expect(admin).toContain('결과 규칙 위로 이동');
    expect(admin).toContain('고객 화면에서 한 칸 위로 이동');
    expect(admin).toContain('고객 화면에서 한 칸 아래로 이동');
    expect(admin).toContain('위·아래 버튼으로 정한 순서가 고객 진단 화면에 그대로 표시됩니다.');
    expect(admin).toContain('답변 선택지는 최소 1개가 필요합니다.');
    expect(admin).toContain('이 답변을 사용하는 결과 규칙이 있습니다.');
    expect(admin).toContain('고객에게 보여줄 결과 방향을 입력해주세요.');
    expect(admin).not.toContain('placeholder="값 (예: active)"');
  });

  test('결과 화면 공통 문구도 같은 관리자 저장값을 고객 결과 화면이 읽는다', () => {
    const admin = source('src', 'app', 'admin', 'survey', 'page.tsx');
    const publicResult = source('src', 'app', 'diagnosis', 'result', 'page.tsx');
    const storage = source('src', 'lib', 'storage.ts');
    const adminRoute = source('src', 'app', 'api', 'admin', 'survey', 'route.ts');

    expect(admin).toContain('resultContent[key]');
    expect(publicResult).toContain('resultContent.heroTitle');
    expect(publicResult).toContain('resultContent.noResultMessage');
    expect(storage).toContain("fetch('/api/admin/survey'");
    expect(adminRoute).toContain('export async function GET');
  });

  test('관리자에서 저장한 선택지 배열 순서를 고객 진단 화면이 그대로 사용한다', () => {
    const admin = source('src', 'app', 'admin', 'survey', 'page.tsx');
    const publicDiagnosis = source('src', 'app', 'diagnosis', 'page.tsx');

    expect(admin).toContain('options: moveAt(editingQuestion.options, i, direction)');
    expect(admin).toContain('options: moveAt(newQuestion.options ?? [], i, direction)');
    expect(admin).toContain('saveSurveyConfig({ questions, rules, resultContent })');
    expect(publicDiagnosis).toContain('question.options.map((option) =>');
  });

  test('전문가 카드의 상품 기준과 상품 폼의 세 관점 코드가 공개 필터까지 이어진다', () => {
    const definitions = source('src', 'lib', 'cms', 'pageDefinitions.ts');
    const productForm = source('src', 'components', 'admin-new', 'products', 'ProductForm.tsx');
    const experts = source('src', 'app', 'experts', 'page.tsx');
    for (const code of ['veterinary', 'nutrition', 'lifestyle']) {
      expect(definitions).toContain(`value: '${code}'`);
      expect(productForm).toContain(`['${code}'`);
      expect(experts).toContain(`activeProductRule === '${code}'`);
    }
  });
});
