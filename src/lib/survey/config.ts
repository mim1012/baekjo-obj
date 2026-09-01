// 진단 설문 config 타입 + 기본값(seed/폴백). 클라이언트·서버 양쪽에서 안전하게 쓰인다.
// value jsonb 에 통째로 담기는 모양 = { questions, rules, resultContent }. 정적 @/data/survey 는 이 기본값을
// 조립하기 위한 용도로만 남는다(진단/관리자 컴포넌트는 더 이상 @/data/survey 를 직접 import 하지 않는다).
import { surveyQuestions, surveyResultRules } from '@/data/survey';
import type { SurveyQuestion, SurveyResultRule } from '@/types';

export interface SurveyResultContent {
  heroEyebrow: string;
  heroTitle: string;
  brandTabLabel: string;
  productTabLabel: string;
  careTabLabel: string;
  brandSectionTitle: string;
  brandSectionDescription: string;
  productSectionTitle: string;
  productSectionDescription: string;
  insuranceTitle: string;
  insuranceDescription: string;
  insuranceLinkLabel: string;
  kitTitle: string;
  kitDescription: string;
  kitLinkLabel: string;
  noResultMessage: string;
  retryLabel: string;
  shopLabel: string;
}

export interface SurveyConfig {
  questions: SurveyQuestion[];
  rules: SurveyResultRule[];
  /** 이전 저장값에는 없을 수 있어 공개/관리자 조회에서 기본 문구와 합친다. */
  resultContent?: SurveyResultContent;
}

export const defaultSurveyResultContent: SurveyResultContent = {
  heroEyebrow: 'Diagnosis Result',
  heroTitle: '우리 아이를 위한\n백조오브제의 큐레이션입니다',
  brandTabLabel: '추천 브랜드',
  productTabLabel: '맞춤 상품',
  careTabLabel: '연계 케어',
  brandSectionTitle: '도움이 되는 검증 브랜드',
  brandSectionDescription: '아이의 상태와 고민에 가장 적합한 브랜드입니다.',
  productSectionTitle: '필요한 카테고리 상품',
  productSectionDescription: '선정된 브랜드의 제품 중 가장 효과적인 라인업입니다.',
  insuranceTitle: '펫보험 보장 점검 필요',
  insuranceDescription: '입력해주신 건강 상태를 볼 때, 향후 병원비 부담이 발생할 수 있습니다.\n현재 가입된 보험의 보장 범위가 충분한지 확인해보세요.',
  insuranceLinkLabel: '무료 분석 알아보기',
  kitTitle: '맞춤 케어 키트 안내',
  kitDescription: '아이의 상태에 꼭 필요한 샘플과 가이드가 담긴 케어 키트가 준비되어 있습니다.\n가까운 제휴 병원이나 온라인을 통해 만나보세요.',
  kitLinkLabel: '케어 키트 살펴보기',
  noResultMessage: '진단 결과를 불러오지 못했습니다.\n잠시 후 다시 시도해주세요.',
  retryLabel: '진단 다시 하기',
  shopLabel: '스토어 둘러보기',
};

/** DB 행이 없거나 조회 실패 시 진단 화면이 폴백하는 기본 설문(정적 데이터). */
export const defaultSurveyConfig: SurveyConfig = {
  questions: surveyQuestions,
  rules: surveyResultRules,
  resultContent: defaultSurveyResultContent,
};

export function resolveSurveyConfig(config: SurveyConfig): Required<SurveyConfig> {
  return {
    questions: config.questions,
    rules: config.rules,
    resultContent: { ...defaultSurveyResultContent, ...(config.resultContent ?? {}) },
  };
}

/** 공개 진단이 끝까지 진행되고 결과를 만들 수 있는 최소 저장 계약. */
export function isValidSurveyConfig(value: unknown): value is SurveyConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<SurveyConfig>;
  if (!Array.isArray(config.questions) || config.questions.length < 1) return false;
  if (!Array.isArray(config.rules) || config.rules.length < 1) return false;
  if (config.resultContent !== undefined) {
    if (!config.resultContent || typeof config.resultContent !== 'object') return false;
    for (const key of Object.keys(defaultSurveyResultContent) as Array<keyof SurveyResultContent>) {
      if (typeof config.resultContent[key] !== 'string' || !config.resultContent[key].trim()) return false;
    }
  }

  const questionIds = new Set<string>();
  const optionValuesByQuestion = new Map<string, Set<string>>();
  for (const question of config.questions) {
    if (!question || typeof question.id !== 'string' || !question.id || questionIds.has(question.id)) return false;
    if (typeof question.title !== 'string' || !question.title.trim()) return false;
    if (question.type !== 'single' && question.type !== 'multiple') return false;
    if (!Array.isArray(question.options) || question.options.length < 1) return false;
    questionIds.add(question.id);
    const optionIds = new Set<string>();
    const values = new Set<string>();
    for (const option of question.options) {
      if (!option || typeof option.id !== 'string' || !option.id || optionIds.has(option.id)) return false;
      if (typeof option.label !== 'string' || !option.label.trim()) return false;
      if (typeof option.value !== 'string' || !option.value || values.has(option.value)) return false;
      optionIds.add(option.id);
      values.add(option.value);
    }
    optionValuesByQuestion.set(question.id, values);
  }

  const ruleIds = new Set<string>();
  for (const rule of config.rules) {
    if (!rule || typeof rule.id !== 'string' || !rule.id || ruleIds.has(rule.id)) return false;
    ruleIds.add(rule.id);
    if (!rule.condition || typeof rule.condition !== 'object') return false;
    if (rule.condition.answers !== undefined && !Array.isArray(rule.condition.answers)) return false;
    for (const condition of rule.condition.answers ?? []) {
      if (!condition || typeof condition.questionId !== 'string' || typeof condition.optionValue !== 'string') return false;
      if (!questionIds.has(condition.questionId)) return false;
      if (!optionValuesByQuestion.get(condition.questionId)?.has(condition.optionValue)) return false;
    }
    const recommendation = rule.recommendation;
    if (!recommendation || typeof recommendation.direction !== 'string' || !recommendation.direction.trim()) return false;
    if (!Array.isArray(recommendation.brandIds) || !recommendation.brandIds.every((id) => typeof id === 'string')) return false;
    if (!Array.isArray(recommendation.productIds) || !recommendation.productIds.every((id) => typeof id === 'string')) return false;
    if (typeof recommendation.needInsuranceAnalysis !== 'boolean') return false;
    if (typeof recommendation.recommendKit !== 'boolean') return false;
  }

  return true;
}
