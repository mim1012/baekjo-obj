import { SurveyQuestion, SurveyResultRule } from '@/types';

export const surveyQuestions: SurveyQuestion[] = [
  {
    id: 'q1',
    title: '아이의 종은 무엇인가요?',
    type: 'single',
    options: [
      { id: 'o1', label: '강아지', value: 'dog' },
      { id: 'o2', label: '고양이', value: 'cat' }
    ]
  },
  {
    id: 'q2',
    title: '아이의 연령대는 어떻게 되나요?',
    type: 'single',
    options: [
      { id: 'o1', label: '퍼피/키튼 (1살 미만)', value: 'puppy' },
      { id: 'o2', label: '어덜트 (1~6살)', value: 'adult' },
      { id: 'o3', label: '시니어 (7살 이상)', value: 'senior' }
    ]
  },
  {
    id: 'q3',
    title: '현재 가장 고민되는 부분은 무엇인가요?',
    type: 'multiple',
    options: [
      { id: 'o1', label: '관절/뼈', value: 'joint' },
      { id: 'o2', label: '피부/모질', value: 'skin' },
      { id: 'o3', label: '구강/치아', value: 'oral' },
      { id: 'o4', label: '소화/장', value: 'digestion' },
      { id: 'o5', label: '비만/체중', value: 'weight' },
      { id: 'o6', label: '특별한 고민 없음', value: 'none' }
    ]
  },
  {
    id: 'q4',
    title: '평소 아이의 생활 환경은 어떤가요?',
    type: 'single',
    options: [
      { id: 'o1', label: '실내 위주 생활', value: 'indoor' },
      { id: 'o2', label: '야외 활동이 많음', value: 'outdoor' }
    ]
  },
  {
    id: 'q5',
    title: '아이에게 지병이나 수술 이력이 있나요?',
    type: 'single',
    options: [
      { id: 'o1', label: '네, 있습니다.', value: 'yes' },
      { id: 'o2', label: '아니오, 건강합니다.', value: 'no' }
    ]
  }
];

export const surveyResultRules: SurveyResultRule[] = [
  {
    id: 'r1',
    condition: {
      concern: 'joint',
    },
    recommendation: {
      direction: '슬개골 탈구와 관절염 예방을 위한 종합 관리',
      categorySlug: '건강과 관리',
      brandIds: ['b1', 'b2'], // 페네핏, 오미프로
      productIds: ['p1', 'p4'],
      needInsuranceAnalysis: true,
      recommendKit: true
    }
  },
  {
    id: 'r2',
    condition: {
      concern: 'oral',
    },
    recommendation: {
      direction: '치석 예방과 구강 건강을 위한 매일의 루틴 케어',
      categorySlug: '건강과 관리',
      brandIds: ['b3'], // 노블독
      productIds: ['p7', 'p8'],
      needInsuranceAnalysis: false,
      recommendKit: true
    }
  },
  {
    id: 'r3',
    condition: {
      ageGroup: 'senior',
    },
    recommendation: {
      direction: '노령기를 위한 면역력 증진 및 활력 케어',
      categorySlug: '식사와 영양',
      brandIds: ['b1', 'b2'], 
      productIds: ['p2', 'p5'],
      needInsuranceAnalysis: true,
      recommendKit: true
    }
  },
  {
    id: 'r4',
    condition: {
      ageGroup: 'puppy',
    },
    recommendation: {
      direction: '성장기를 위한 균형 잡힌 영양 공급',
      categorySlug: '식사와 영양',
      brandIds: ['b1'], 
      productIds: ['p3'],
      needInsuranceAnalysis: true,
      recommendKit: true
    }
  },
  {
    id: 'r5',
    condition: {
      concern: 'none',
    },
    recommendation: {
      direction: '현재의 건강을 유지하기 위한 일상 케어',
      categorySlug: '식사와 영양',
      brandIds: ['b4', 'b5'], 
      productIds: ['p9', 'p12'],
      needInsuranceAnalysis: false,
      recommendKit: false
    }
  }
];

export const getSurveyResult = (answers: Record<string, string | string[]>): SurveyResultRule => {
  // 간단한 매칭 로직 (실제로는 더 복잡한 가중치 적용 필요)
  let bestRule = surveyResultRules[surveyResultRules.length - 1]; // default fallback (none)
  let maxScore = 0;

  for (const rule of surveyResultRules) {
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
};
