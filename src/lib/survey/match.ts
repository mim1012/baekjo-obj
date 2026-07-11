// 진단 결과 매칭 — 순수 함수(클라이언트 안전). 예전엔 @/data/survey 에서 룰을 클로저로 읽었으나,
// 이제 룰을 인자로 받아 DB(GET /api/survey)에서 온 룰로 계산한다. 스코어링 로직은 동일하게 유지한다.
import type { SurveyResultRule } from '@/types';

/**
 * 응답(answers)과 룰 목록(rules)으로 가장 잘 맞는 결과 룰 하나를 고른다.
 * 스코어링(behavior-identical, Golden Flow #1):
 *   - concern 룰: answers['q3'](다중 선택 배열)에 룰의 concern 이 포함되면 +3
 *   - ageGroup 룰: answers['q2'] 가 룰의 ageGroup 과 같으면 +2
 * 기본 폴백 = 마지막 룰(정적 데이터에서 concern:'none'). rules 가 비면 undefined 를 반환하므로
 * 호출부는 null 체크로 방어한다.
 */
export function getSurveyResult(
  answers: Record<string, string | string[]>,
  rules: SurveyResultRule[],
): SurveyResultRule | undefined {
  if (rules.length === 0) return undefined;

  let bestRule = rules[rules.length - 1]; // default fallback (none)
  let maxScore = 0;

  for (const rule of rules) {
    let score = 0;

    if (rule.condition.concern) {
      const concerns = (answers['q3'] || []) as string[];
      if (concerns.includes(rule.condition.concern)) {
        score += 3; // 고민이 일치하면 높은 점수
      }
    }

    if (rule.condition.ageGroup && answers['q2'] === rule.condition.ageGroup) {
      score += 2;
    }

    if (score > maxScore) {
      maxScore = score;
      bestRule = rule;
    }
  }

  return bestRule;
}
