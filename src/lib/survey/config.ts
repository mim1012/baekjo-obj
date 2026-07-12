// 진단 설문 config 타입 + 기본값(seed/폴백). 클라이언트·서버 양쪽에서 안전하게 쓰인다.
// value jsonb 에 통째로 담기는 모양 = { questions, rules }. 정적 @/data/survey 는 이 기본값을
// 조립하기 위한 용도로만 남는다(진단/관리자 컴포넌트는 더 이상 @/data/survey 를 직접 import 하지 않는다).
import { surveyQuestions, surveyResultRules } from '@/data/survey';
import type { SurveyQuestion, SurveyResultRule } from '@/types';

export interface SurveyConfig {
  questions: SurveyQuestion[];
  rules: SurveyResultRule[];
}

/** DB 행이 없거나 조회 실패 시 진단 화면이 폴백하는 기본 설문(정적 데이터). */
export const defaultSurveyConfig: SurveyConfig = {
  questions: surveyQuestions,
  rules: surveyResultRules,
};
