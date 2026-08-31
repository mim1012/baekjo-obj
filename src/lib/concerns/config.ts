// 고민별 케어(concerns) config 타입 + 기본값(seed/폴백). 서버(API route·server page)와
// 클라이언트(storage 콘센트) 양쪽에서 안전하게 import 할 수 있도록 'use client' 가 없는 순수
// 모듈로 둔다(partners/config.ts 와 동일한 이유 — client-reference 프록시 치환 방지).
// value jsonb 에 통째로 담기는 모양 = { items: Concern[] }. 기본값은 예전 src/data/concerns.ts
// 배열을 그대로 옮긴 것이다(값 변경 없음 — 0012 주석의 "값 변경 없음" 규율 준수).
import type { Concern, ConcernQuickGuideItem } from '@/types';

export interface ConcernsConfig {
  items: Concern[];
}

export const MAIN_CONCERN_CARD_SHORT_DESCRIPTIONS: Record<string, string> = {
  tear: '눈물 자국이 걱정되시나요?',
  joint: '걸음걸이가 불편해 보이나요?',
  skin: '자꾸 긁거나 피부가 붉어지나요?',
  obesity: '체중 관리가 필요한가요?',
  stress: '평소보다 불안하거나 예민해졌나요?',
  oral: '입 냄새나 치석이 신경 쓰이나요?',
};

const DEFAULT_QUICK_GUIDES: ConcernQuickGuideItem[] = [
  { title: '변화 살펴보기', description: '평소 생활에서 확인할 수 있는 몸과 행동의 변화', href: '#signals', icon: 'search' },
  { title: '관리 기준 알아보기', description: '일상에서 참고할 수 있는 관리 방법과 알아둘 내용', href: '#faq', icon: 'home' },
  { title: '병원 방문 판단하기', description: '병원 진료를 고려해야 할 신호와 기준', href: '#hospital', icon: 'hospital' },
];

const SPECIAL_QUICK_GUIDES: Record<string, ConcernQuickGuideItem[]> = {
  obesity: [
    { title: '원인 살펴보기', description: '식사량·활동량·생활 습관 등 체중 증가에 영향을 줄 수 있는 원인', href: '#signals', icon: 'search' },
    { title: '집에서 관리하기', description: '식사와 활동량 등 일상에서 챙겨야 할 체중 관리 방법', href: '#faq', icon: 'home' },
    { title: '병원 방문 판단하기', description: '체중 변화와 몸 상태로 구분하는 진료가 필요한 신호', href: '#hospital', icon: 'hospital' },
  ],
  oral: [
    { title: '원인 살펴보기', description: '치아·잇몸 상태와 구강 위생 등 구강 문제에 영향을 줄 수 있는 원인', href: '#signals', icon: 'search' },
    { title: '집에서 관리하기', description: '양치와 구강 청결 등 일상에서 챙겨야 할 관리 방법', href: '#faq', icon: 'home' },
    { title: '병원 방문 판단하기', description: '입 냄새·잇몸 상태·먹는 행동 등으로 구분하는 진료가 필요한 신호', href: '#hospital', icon: 'hospital' },
  ],
  skin: [
    { title: '원인 살펴보기', description: '식사·환경·피부 상태 등 피부 변화에 영향을 줄 수 있는 원인', href: '#signals', icon: 'search' },
    { title: '집에서 관리하기', description: '피부 청결과 식사·환경 등 일상에서 챙겨야 할 관리 방법', href: '#faq', icon: 'home' },
    { title: '병원 방문 판단하기', description: '피부 상태와 행동으로 구분하는 진료가 필요한 신호', href: '#hospital', icon: 'hospital' },
  ],
  joint: [
    { title: '원인 살펴보기', description: '체중·활동량·생활 환경 등 관절에 부담을 줄 수 있는 요인', href: '#signals', icon: 'search' },
    { title: '집에서 관리하기', description: '체중 관리와 적절한 활동 등 일상에서 챙겨야 할 관리 방법', href: '#faq', icon: 'home' },
    { title: '병원 방문 판단하기', description: '걸음걸이와 움직임의 변화로 구분하는 진료가 필요한 신호', href: '#hospital', icon: 'hospital' },
  ],
};

const HERO_COPY: Record<string, { title: string; description: string }> = {
  tear: { title: '눈물 자국, 닦아주는 것만으로 충분할까요?', description: '매일 닦아도 반복된다면, 관리 방법부터 다시 살펴볼 필요가 있어요.' },
  joint: { title: '걸음걸이가 예전과 달라졌나요?', description: '걷거나 움직이는 모습이 평소와 다르다면 관절 상태를 살펴볼 필요가 있어요.' },
  skin: { title: '자꾸 긁는 우리 아이,\n피부부터 살펴보세요', description: '우리 아이가 보내는 작은 신호부터 살펴보세요. 일상에서 알아두면 좋은 케어 기준을 정리했습니다.' },
  obesity: { title: '우리 아이의 체중,\n괜찮은 걸까요?', description: '먹는 양과 활동량, 최근 체중의 변화를 함께 살펴보세요.' },
  picky: { title: '밥 앞에서 자꾸 망설일 때', description: '입맛의 문제로만 보기 전에 식사 환경과 간식, 구강 상태까지 차분히 살펴봐요.' },
  digestion: { title: '배변 리듬이 평소와 달라졌을 때', description: '배변은 식사와 환경 변화를 보여주는 생활 신호예요. 평소 리듬과 달라진 점부터 기록해 보세요.' },
  stress: { title: '평소와 다른 행동이 자주 보이나요?', description: '행동이나 생활 패턴이 달라졌다면 최근 바뀐 환경이나 일상은 없는지 살펴보세요.' },
  senior: { title: '나이에 맞는 돌봄이 필요해졌을 때', description: '나이가 들수록 필요한 돌봄의 속도도 달라져요. 움직임과 식사, 휴식의 변화를 세심하게 살펴봐요.' },
  oral: { title: '구강, 어디서부터 살펴볼까요?', description: '입 냄새나 치석이 신경 쓰인다면 구강 상태부터 살펴보세요.' },
};

const HERO_VISUALS: Record<string, { image: string; position: string }> = {
  tear: { image: '/images/care-detail-hero-tear.png', position: '50% center' },
  joint: { image: '/images/care-detail-hero-joint.png', position: '47% center' },
  skin: { image: '/images/care-detail-hero-skin.png', position: '46% center' },
  obesity: { image: '/images/care-detail-hero-obesity.png', position: '45% center' },
  stress: { image: '/images/care-detail-hero-stress.png', position: '50% center' },
  oral: { image: '/images/care-detail-hero-oral.png', position: '48% center' },
};

const HOSPITAL_SIGNS: Record<string, string[]> = {
  tear: ['눈이 심하게 붉어지거나 부어오름', '노란색·녹색 눈곱이 계속 생김', '눈을 잘 뜨지 못하거나 계속 찡그림', '눈을 반복해서 심하게 비비거나 긁음', '눈이 평소보다 뿌옇게 보임', '눈 또는 눈꺼풀에 상처가 보임'],
  skin: ['긁거나 핥는 행동이 계속되거나 심해짐', '붉어짐이나 피부 변화가 넓어지거나 오래 지속됨', '상처·진물·출혈이 생김', '털이 빠지는 범위가 넓어지거나 피부가 드러남', '피부 변화와 함께 식욕이나 활동량이 평소와 달라짐'],
  joint: ['절뚝거림이 계속되거나 점점 심해짐', '한쪽 다리를 들고 있거나 바닥에 제대로 딛지 못함', '관절이나 다리 주변이 눈에 띄게 붓거나 뜨거움', '움직일 때 갑자기 울부짖거나 움직이려 하지 않음', '넘어지거나 부딪힌 뒤 걷는 모습이 평소와 달라짐'],
  obesity: ['체중이 짧은 기간에 급격하게 변함', '식욕이 갑자기 크게 늘거나 줄어듦', '물을 마시거나 소변을 보는 양이 눈에 띄게 달라짐', '배가 갑자기 불러오거나 팽팽해짐', '걷거나 움직이는 것을 힘들어하거나 호흡이 불편해 보임'],
  oral: ['잇몸이 붓거나 피가 남', '음식을 먹기 어려워하거나 자꾸 떨어뜨림', '치아가 흔들리거나 빠짐', '입이나 얼굴 주변이 부어오름', '심한 입 냄새가 지속됨'],
  stress: ['먹지 않거나 식욕 저하가 계속됨', '구토·설사 등 신체 증상이 함께 나타남', '몸을 반복해서 핥아 피부나 털에 손상이 생김', '평소와 다른 행동 변화가 갑자기 나타나거나 계속됨', '불안하거나 두려워하는 행동으로 일상생활이 어려워 보임'],
};

export function withConcernPresentationDefaults(concern: Concern): Concern {
  const hero = HERO_COPY[concern.slug];
  const visual = HERO_VISUALS[concern.slug];
  return {
    ...concern,
    heroTitle: concern.heroTitle || hero?.title || `${concern.title}, 어디서부터 살펴볼까요?`,
    heroDescription: concern.heroDescription || hero?.description || concern.shortDescription,
    heroImage: concern.heroImage || visual?.image || '/images/hero-curation-visual.png',
    heroImagePosition: concern.heroImagePosition || visual?.position || 'center',
    backLabel: concern.backLabel || '케어 가이드로 돌아가기',
    badgeSuffix: concern.badgeSuffix || '케어',
    quickGuideItems: concern.quickGuideItems?.length ? concern.quickGuideItems : (SPECIAL_QUICK_GUIDES[concern.slug] ?? DEFAULT_QUICK_GUIDES).map((item) => ({ ...item })),
    hospitalSigns: concern.hospitalSigns?.length ? concern.hospitalSigns : [...(HOSPITAL_SIGNS[concern.slug] ?? concern.causes)],
    signalsTitle: concern.signalsTitle || '생활 속에서 보이는 신호',
    hospitalTitle: concern.hospitalTitle || '병원 진료를 고려해야 할 신호',
    hospitalDescription: concern.hospitalDescription || '아래 증상이 보인다면 집에서 관리하기보다 수의사와 상담해보세요.',
    productsTitle: concern.productsTitle || '일상 관리에 함께 볼 상품',
    productsLinkLabel: concern.productsLinkLabel || `${concern.title} 관련 상품 보기`,
    productsEmptyText: concern.productsEmptyText || '관련 상품을 준비하고 있습니다.',
    insuranceTitle: concern.insuranceTitle || '우리 아이에게 필요한 보장은 무엇일까요?',
    insuranceDescription: concern.insuranceDescription || '나이와 건강 상태를 바탕으로 우리 아이에게 맞는 보험을 살펴보세요.',
    insuranceButtonLabel: concern.insuranceButtonLabel || '보험 분석하기',
    insuranceButtonHref: concern.insuranceButtonHref || '/insurance',
    insuranceImage: concern.insuranceImage || '/images/insurance-dog.webp',
    insuranceImageAlt: concern.insuranceImageAlt || '펫보험 분석',
    reviewsTitle: concern.reviewsTitle || '보호자 후기',
    reviewsLinkLabel: concern.reviewsLinkLabel || '후기 전체 보기',
    faqTitle: concern.faqTitle || '많이 궁금해하시는 점',
  };
}

export function applyConcernPresentationDefaults(config: ConcernsConfig): ConcernsConfig {
  return { ...config, items: config.items.map(withConcernPresentationDefaults) };
}

export const TEAR_CONCERN_FAQ: Concern['faq'] = [
  {
    question: '눈물 자국은 왜 생기나요?',
    answer: '눈물이 눈 주변 털에 반복적으로 묻으면 눈물에 포함된 포르피린이라는 색소 성분으로 인해 붉거나 갈색의 자국이 남을 수 있습니다. 눈물이 많아지는 데에는 눈의 자극이나 염증, 눈물 배출 상태, 얼굴 구조 등 여러 요인이 영향을 줄 수 있습니다.',
  },
  {
    question: '눈 주변은 어떻게 관리하면 좋나요?',
    answer: '눈 주변에 눈물이나 분비물이 묻어 있다면 부드럽게 닦아내고, 털과 피부가 계속 젖어 있지 않도록 깨끗하고 건조하게 관리해주세요. 눈 주변 털이 눈을 자극하지 않는지도 살펴보세요. 눈 주변에 사용하는 제품은 용도와 사용 방법을 확인하고, 눈에 직접 들어가지 않도록 주의해주세요. 이상 반응이 있거나 사용이 필요한지 판단하기 어렵다면 수의사와 상담하는 것이 좋습니다.',
  },
  {
    question: '한쪽 눈에서만 눈물이 나는 것도 괜찮나요?',
    answer: '평소와 달리 한쪽 눈에서만 눈물이 계속 많아진다면 그냥 지나치기보다 눈의 상태를 함께 살펴보는 것이 좋습니다. 눈의 자극이나 이물질, 눈꺼풀·속눈썹 문제, 눈물 배출 이상 등 여러 원인이 있을 수 있으므로 한쪽 눈의 변화가 지속된다면 진료를 통해 원인을 확인해주세요.',
  },
  {
    question: '언제 병원에 가야 하나요?',
    answer: '평소보다 눈물이 갑자기 많아지거나 변화가 계속되는 경우, 눈을 자주 찡그리거나 비비는 경우, 충혈이나 평소와 다른 분비물이 보이는 경우에는 진료를 받아보세요. 눈을 잘 뜨지 못하거나 통증이 심해 보이는 등 뚜렷한 이상이 있다면 기다리지 말고 빠르게 진료를 받는 것이 좋습니다.',
  },
];

export const STRESS_CONCERN_FAQ: Concern['faq'] = [
  {
    question: '스트레스를 받는 것 같을 때 무엇부터 살펴봐야 하나요?',
    answer: '평소와 다른 행동이 보인다면 최근 생활 환경이나 일상에 달라진 점이 있었는지 먼저 살펴보세요. 새로운 공간이나 가족, 소음, 혼자 있는 시간 등 여러 변화가 영향을 줄 수 있습니다.',
  },
  {
    question: '스트레스를 받는 것 같으면 혼자 쉬게 두는 게 좋을까요?',
    answer: '억지로 다가가거나 만지려고 하기보다, 아이가 원할 때 편하게 쉬거나 거리를 둘 수 있는 공간을 마련해 주세요. 아이마다 편안함을 느끼는 방식이 다르므로 평소 행동과 반응을 함께 살펴보는 것이 좋습니다.',
  },
  {
    question: '산책이나 놀이가 스트레스 관리에 도움이 되나요?',
    answer: '산책이나 놀이는 아이의 신체 활동과 자연스러운 행동을 돕는 데 도움이 될 수 있습니다. 다만 필요한 활동과 자극은 개체마다 다르므로 나이와 건강 상태, 평소 선호에 맞춰 무리하지 않는 범위에서 진행해 주세요.',
  },
  {
    question: '행동이 달라지면 스트레스 때문이라고 봐도 되나요?',
    answer: '행동 변화만으로 스트레스가 원인이라고 판단하기는 어렵습니다. 통증이나 질환 등 다른 원인에서도 비슷한 변화가 나타날 수 있어, 갑작스럽거나 지속적인 변화가 보인다면 수의사와 상담해 주세요.',
  },
];

/** DB에 이전 카드 문구가 남아 있어도 공개 화면에서는 확정된 01~06 문구만 표시한다. */
export function applySourceConcernCardCopy(config: ConcernsConfig): ConcernsConfig {
  return {
    ...config,
    items: config.items.map((item) => {
      const shortDescription = MAIN_CONCERN_CARD_SHORT_DESCRIPTIONS[item.slug];
      return shortDescription ? { ...item, shortDescription } : item;
    }),
  };
}

/** DB에 이전 FAQ가 남아 있어도 공개 눈물·스트레스 상세에는 각각 확정된 4개를 표시한다. */
export function applySourceConcernFaqCopy(config: ConcernsConfig): ConcernsConfig {
  return {
    ...config,
    items: config.items.map((item) => {
      if (item.slug === 'tear') {
        return { ...item, faq: TEAR_CONCERN_FAQ.map((faq) => ({ ...faq })) };
      }
      if (item.slug === 'stress') {
        return { ...item, faq: STRESS_CONCERN_FAQ.map((faq) => ({ ...faq })) };
      }
      return item;
    }),
  };
}

/** DB 행이 없거나 조회 실패 시 공개 케어 가이드·관리자 화면이 폴백하는 기본 고민 목록. */
export const defaultConcernsConfig: ConcernsConfig = {
  items: [
    {
      slug: 'tear',
      title: '눈물',
      icon: '💧',
      shortDescription: '눈물 자국이 걱정되시나요?',
      description: '반려동물의 눈물 자국은 단순 미용 문제가 아닌 건강 신호일 수 있습니다. 원인을 파악하고 올바른 관리법을 확인하세요.',
      symptoms: [
        '눈 밑의 갈색·적갈색 자국이 짙어짐',
        '평소보다 눈물 양이 많아짐',
        '눈 주위 털이 계속 축축하게 젖어 있음',
        '노란 눈곱이 생기거나 눈곱 양이 많아짐',
        '눈을 평소보다 자주 비비거나 긁음',
        '한쪽 눈의 눈물만 유독 많아짐',
      ],
      causes: [
        '비루관(눈물관) 막힘 또는 협착',
        '안구 건조증 또는 알레르기 반응',
        '역류모(속눈썹이 눈을 자극)',
        '식이 알레르기 또는 첨가물 반응',
        '환경적 자극(먼지, 꽃가루 등)',
      ],
      recommendedProductIds: [],
      recommendedBrandIds: ['b1', 'b2'],
      insuranceCta: '눈물 관련 진료비가 부담되시나요? 무료 보험 분석을 통해 보장 범위를 확인해보세요.',
      faq: TEAR_CONCERN_FAQ,
    },
    {
      slug: 'joint',
      title: '관절',
      icon: '🦴',
      shortDescription: '걸음걸이가 불편해 보이나요?',
      description: '반려동물의 관절 건강은 나이가 들수록 중요해집니다. 조기 관리가 삶의 질을 크게 높여줍니다.',
      symptoms: [
        '산책이나 놀이 중 평소 활동량이 줄어듦',
        '계단이나 높은 곳을 오르내리는 것을 꺼림',
        '앉았다 일어날 때 움직임이 평소보다 느려짐',
        '걷거나 뛰는 모습이 평소와 달라짐',
        '다리나 관절 주변을 만질 때 불편해하는 모습을 보임',
      ],
      causes: [
        '슬개골 탈구(소형견에게 흔함)',
        '고관절 이형성',
        '퇴행성 관절염',
        '과체중으로 인한 관절 부담',
        '외상 또는 과도한 운동',
      ],
      recommendedProductIds: [],
      recommendedBrandIds: [],
      insuranceCta: '슬개골 수술비는 200만원 이상 소요될 수 있습니다. 보장 범위를 미리 확인하세요.',
      faq: [
        { question: '관절 영양제는 언제부터 먹이는 게 좋나요?', answer: '관절 영양제를 모든 아이가 특정 나이부터 먹어야 하는 것은 아닙니다. 나이와 체중, 활동량, 현재 관절 상태 등에 따라 필요 여부가 달라질 수 있어요. 영양제를 시작하기 전에는 제품의 성분과 급여 기준을 확인하고, 관절 문제가 의심된다면 먼저 수의사와 상담해보세요.' },
        { question: '관절이 걱정되면 산책을 줄여야 하나요?', answer: '무조건 활동량을 줄이기보다 아이의 상태에 맞는 적절한 움직임을 유지하는 것이 중요합니다. 다만 걷는 모습이 달라지거나 움직임을 불편해한다면 무리하게 운동시키지 말고 수의사와 상담해보세요.' },
        { question: '체중도 관절 건강에 영향을 주나요?', answer: '과체중은 관절에 가해지는 부담을 높일 수 있어 적정 체중을 유지하는 것이 중요합니다. 체중 관리가 필요한 경우에는 무리하게 식사량을 줄이기보다 아이의 체형과 건강 상태에 맞는 관리 방법을 살펴보세요.' },
        { question: '미끄러운 바닥도 관절에 부담이 될 수 있나요?', answer: '미끄러운 바닥에서는 걷거나 일어설 때 안정적으로 움직이기 어려울 수 있습니다. 아이가 자주 생활하는 공간은 미끄럼을 줄이고, 계단이나 높은 곳을 오르내릴 때 무리가 없는지 함께 살펴보세요.' },
      ],
    },
    {
      slug: 'skin',
      title: '피부',
      icon: '🐾',
      shortDescription: '자꾸 긁거나 피부가 붉어지나요?',
      description: '피부 트러블은 반려동물의 가장 흔한 건강 고민 중 하나입니다. 원인을 찾아 근본적인 케어가 필요합니다.',
      symptoms: [
        '몸을 자주 긁거나 핥음',
        '피부가 붉어지거나 평소와 다른 변화가 생김',
        '비듬이나 각질이 많아짐',
        '털이 평소보다 많이 빠지거나 부분적으로 빠짐',
        '특정 부위에서 평소와 다른 냄새가 남',
      ],
      causes: [
        '환경 알레르기(집먼지진드기, 꽃가루)',
        '식이 알레르기',
        '곰팡이 또는 세균 감염',
        '아토피 피부염',
        '기생충(진드기, 벼룩)',
      ],
      recommendedProductIds: ['p4', 'p5', 'p21', 'p12', 'p17', 'p18'],
      // b4(캣코드) 제거(2026-07-16) — 실재하지 않는 브랜드. 소속 상품이 알로밍(b5)으로 이관돼 b5 로 흡수.
      recommendedBrandIds: ['b5', 'b2', 'b9', 'b8'],
      insuranceCta: '피부 질환은 만성화될 수 있습니다. 보험으로 통원비 부담을 줄여보세요.',
      faq: [
        { question: '목욕은 얼마나 자주 하는 게 좋을까요?', answer: '목욕 주기는 피부와 피모 상태, 생활 환경에 따라 달라질 수 있습니다. 피부에 특별한 문제가 없다면 아이의 상태에 맞춰 관리하고, 피부 질환이 있거나 잦은 목욕이 필요한 경우에는 수의사와 상담해 적절한 주기와 제품을 정하는 것이 좋습니다.' },
        { question: '피부가 예민할 때 식사는 어떻게 살펴봐야 할까요?', answer: '피부 변화에는 식사뿐 아니라 환경, 알레르기, 감염 등 여러 원인이 영향을 줄 수 있습니다. 특정 음식을 먹은 뒤 피부 문제가 반복되거나 식이 알레르기가 의심된다면 임의로 사료를 바꾸기보다 수의사와 상담해 원인을 확인하는 것이 좋습니다. 식이 알레르기는 단순한 사료 교체만으로 확인하는 게 아니라 제한식과 이후 식이 재도전 등을 통해 평가합니다.' },
        { question: '자주 긁는다고 모두 피부 문제인가요?', answer: '긁는 행동만으로 특정 피부 질환을 판단할 수는 없습니다. 다만 반복해서 긁거나 핥고, 붉어짐·털 빠짐·각질·냄새 같은 피부 변화가 함께 나타난다면 원인을 확인할 필요가 있습니다.' },
        { question: '피부가 붉어졌을 때 집에서 지켜봐도 될까요?', answer: '일시적으로 붉어졌거나 가벼운 자극일 수 있지만, 붉어짐이 지속되거나 심해지고 반복적인 긁기·핥기, 털 빠짐, 상처나 분비물 같은 변화가 함께 나타난다면 수의사와 상담하는 것이 좋습니다.' },
      ],
    },
    {
      slug: 'obesity',
      title: '비만',
      icon: '⚖️',
      shortDescription: '체중 관리가 필요한가요?',
      description: '반려동물 비만은 각종 질환의 원인이 됩니다. 적절한 체중 관리로 건강한 삶을 유지하세요.',
      symptoms: [
        '갈비뼈가 쉽게 만져지지 않음',
        '위에서 봤을 때 허리선이 잘 보이지 않음',
        '최근 체중이 꾸준히 늘고 있음',
        '움직임이 둔해지거나 활동량이 줄어듦',
        '조금만 움직여도 쉽게 지치는 모습이 보임',
      ],
      causes: [
        '과도한 간식 급여',
        '운동 부족',
        '중성화 수술 후 대사 변화',
        '갑상선 기능 저하',
        '부적절한 사료 급여량',
      ],
      recommendedProductIds: ['p1', 'p2', 'p3'],
      recommendedBrandIds: ['b1'],
      insuranceCta: '비만으로 인한 합병증 치료비가 걱정되시나요? 보장 범위를 확인하세요.',
      faq: [
        { question: '다이어트 사료만으로 충분한가요?', answer: '체중 관리는 사료 종류만 바꾸는 것보다 하루 동안 먹는 전체 양과 열량을 함께 살펴보는 것이 중요합니다. 필요한 열량은 현재 체중과 체형, 활동량 등에 따라 달라질 수 있어 아이의 상태에 맞는 급여량을 확인해 주세요.' },
        { question: '체중 관리 중에도 간식을 줘도 되나요?', answer: '간식을 반드시 끊을 필요는 없어요. 다만 간식도 하루 동안 먹는 양과 열량에 포함되므로, 주식과 간식을 함께 고려해 전체 급여량을 조절하는 것이 중요합니다. 체중 감량이 필요한 경우에는 아이의 상태에 맞는 급여량을 수의사와 상담해보세요.' },
        { question: '운동량만 늘리면 체중을 줄일 수 있나요?', answer: '활동량을 늘리는 것은 체중 관리에 도움이 되지만, 체중 감량은 활동량뿐 아니라 식사와 전체 열량을 함께 관리하는 것이 중요합니다. 아이의 나이와 건강 상태를 고려해 무리하지 않는 범위에서 활동량을 조절해 주세요.' },
        { question: '체중은 빨리 줄이는 게 좋은가요?', answer: '체중은 급격하게 줄이기보다 아이의 상태에 맞는 속도로 관리하는 것이 중요합니다. 무리하게 급여량을 줄이기보다 현재 체중과 체형을 확인하고, 감량이 필요한 경우 적절한 급여량과 감량 계획을 수의사와 상의하는 것이 좋습니다.' },
      ],
    },
    {
      slug: 'picky',
      title: '편식',
      icon: '🍽️',
      shortDescription: '밥을 잘 안 먹나요?',
      description: '편식은 영양 불균형을 초래할 수 있습니다. 원인을 파악하고 올바른 급여 습관을 만들어주세요.',
      symptoms: [
        '사료를 잘 먹지 않음',
        '간식만 찾음',
        '새로운 사료에 거부감을 보임',
        '식사 시간이 길어짐',
        '체중이 줄어듦',
      ],
      causes: [
        '간식 과다 급여로 인한 식욕 저하',
        '사료의 맛이나 식감 거부',
        '스트레스나 환경 변화',
        '구강 질환(치석, 잇몸 질환)',
        '소화기 질환',
      ],
      recommendedProductIds: ['p1', 'p2', 'p3'],
      recommendedBrandIds: ['b2', 'b5'],
      insuranceCta: '편식이 건강 문제의 신호일 수 있습니다. 검진비 보장 범위를 확인해보세요.',
      faq: [
        { question: '사료를 자주 바꿔도 되나요?', answer: '갑작스러운 사료 변경은 소화 장애를 일으킬 수 있습니다. 기존 사료에 새 사료를 7-10일에 걸쳐 서서히 섞어가며 전환하세요.' },
      ],
    },
    {
      slug: 'digestion',
      title: '배변',
      icon: '🚽',
      shortDescription: '배변 상태가 불규칙한가요?',
      description: '배변 상태는 반려동물 건강의 바로미터입니다. 이상 신호를 놓치지 마세요.',
      symptoms: [
        '설사가 잦음',
        '변비 증상',
        '혈변 또는 점액변',
        '배변 시 힘들어함',
        '배변 횟수가 급격히 변함',
      ],
      causes: [
        '부적절한 식이',
        '장내 기생충',
        '스트레스',
        '장 질환(IBD, 대장염)',
        '이물질 섭취',
      ],
      recommendedProductIds: ['p4', 'p5', 'p6'],
      recommendedBrandIds: ['b1', 'b3'],
      insuranceCta: '소화기 질환 치료비 부담을 줄여보세요. 무료 보험 분석을 신청하세요.',
      faq: [
        { question: '프로바이오틱스가 도움이 되나요?', answer: '장내 유익균 증식에 도움을 줄 수 있습니다. 다만 증상이 심하거나 지속된다면 반드시 수의사 진료를 먼저 받으세요.' },
      ],
    },
    {
      slug: 'stress',
      title: '스트레스',
      icon: '😰',
      shortDescription: '평소보다 불안하거나 예민해졌나요?',
      description: '반려동물도 스트레스를 받습니다. 행동 변화를 관찰하고 적절한 케어를 해주세요.',
      symptoms: [
        '평소와 다르게 숨거나 사람·다른 동물과의 접촉을 피함',
        '평소보다 쉽게 놀라거나 주변을 경계하는 모습이 늘어남',
        '먹는 양이나 식욕이 평소와 달라짐',
        '놀이와 활동에 대한 관심이 줄어듦',
        '그루밍이나 몸을 핥는 행동이 평소와 달라짐',
      ],
      causes: [
        '분리 불안',
        '환경 변화(이사, 새 가족)',
        '사회화 부족',
        '소음 공포(천둥, 불꽃놀이)',
        '운동 부족',
      ],
      // p9·p10·p11 은 제품명·실사진 확정까지 노출 보류(0034) — 셋만 두면 이 페이지의 추천 상품이
      // 통째로 비므로, 같은 알로밍 그루밍 라인이자 노출 중인 p12 를 앞에 둔다. 숨긴 상품은 공개
      // 조회에서 자동으로 걸러지므로(visibleOnly) 재노출 시 원래 구성이 그대로 복원된다.
      recommendedProductIds: ['p12', 'p9', 'p10', 'p11'],
      // b4(캣코드) 제거(2026-07-16) — 소속 상품이 알로밍(b5)으로 이관돼 b5 로 흡수(중복 제거).
      recommendedBrandIds: ['b5'],
      insuranceCta: '행동 치료 상담비도 보험으로 보장받을 수 있습니다.',
      faq: STRESS_CONCERN_FAQ,
    },
    {
      slug: 'senior',
      title: '노령',
      icon: '🤍',
      shortDescription: '시니어 케어가 필요한가요?',
      description: '나이 든 반려동물에게는 특별한 관심과 케어가 필요합니다. 노령기 건강 관리법을 확인하세요.',
      symptoms: [
        '활동량 감소',
        '시력이나 청력 저하',
        '인지 기능 저하(방향 감각 상실)',
        '근육량 감소',
        '만성 질환 증가',
      ],
      causes: [
        '자연적인 노화 과정',
        '관절 퇴행',
        '내장 기관 기능 저하',
        '면역력 약화',
        '인지 기능 장애 증후군',
      ],
      recommendedProductIds: [],
      recommendedBrandIds: ['b1', 'b3'],
      insuranceCta: '노령 반려동물의 의료비는 급격히 증가합니다. 보장 범위를 꼭 확인하세요.',
      faq: [
        { question: '시니어 사료는 언제부터 급여하나요?', answer: '소형견은 7-8세, 대형견은 5-6세부터 시니어 사료로 전환을 권장합니다. 수의사와 상담 후 적절한 시기를 결정하세요.' },
        { question: '노령견에게 운동은 필요한가요?', answer: '적절한 운동은 근육량 유지와 관절 건강에 필수적입니다. 강도는 낮추되 규칙적인 산책을 유지하세요.' },
      ],
    },
    {
      slug: 'nutrition',
      title: '영양',
      icon: '🥣',
      shortDescription: '식사의 균형이 걱정되시나요?',
      description: '반려동물의 건강은 매일의 식사에서 시작됩니다. 부족하거나 넘치지 않는 균형 잡힌 영양이 삶의 질을 결정합니다.',
      symptoms: [
        '털에 윤기가 없고 푸석해짐',
        '기력이 없고 활동량이 줄어듦',
        '피부가 건조하거나 비듬이 생김',
        '체중이 표준 대비 늘거나 줄어듦',
        '변 상태가 고르지 않음',
      ],
      causes: [
        '단일 사료에 치우친 편중된 식단',
        '연령·체중에 맞지 않는 급여량',
        '필수 지방산·비타민 부족',
        '간식 과다로 인한 영양 불균형',
        '흡수를 방해하는 소화기 문제',
      ],
      recommendedProductIds: ['p1', 'p2', 'p3'],
      recommendedBrandIds: ['b1'],
      insuranceCta: '영양 불균형이 만성 질환으로 이어지기 전에, 무료 보험 분석으로 건강검진 보장 범위를 확인해보세요.',
      faq: [
        { question: '영양제를 꼭 챙겨야 하나요?', answer: '균형 잡힌 주식을 급여한다면 대부분의 영양은 충족됩니다. 다만 연령·질환·활동량에 따라 부족한 성분은 수의사 상담 후 보충하는 것이 좋습니다.' },
        { question: '토핑이나 간식을 얼마나 줘도 되나요?', answer: '간식은 하루 총 섭취 열량의 10%를 넘지 않는 것이 원칙입니다. 주식의 균형을 해치지 않는 선에서 식사 보조로 활용하세요.' },
      ],
    },
    {
      slug: 'oral',
      title: '구강',
      icon: '🦷',
      shortDescription: '입 냄새나 치석이 신경 쓰이나요?',
      description: '구강 건강은 전신 건강과 직결됩니다. 방치된 치주 질환은 심장·신장에까지 영향을 줄 수 있어 꾸준한 관리가 중요합니다.',
      symptoms: [
        '평소와 다른 입 냄새가 남',
        '치아에 누렇거나 갈색의 치석이 보임',
        '잇몸이 평소보다 붉어 보임',
        '음식을 씹기 불편해하는 모습이 보임',
        '침을 평소보다 많이 흘림',
      ],
      causes: [
        '치아에 쌓인 플라그와 치석',
        '치주염·잇몸 염증',
        '양치 습관 부재',
        '부드러운 음식 위주의 식단',
        '노령으로 인한 면역력 저하',
      ],
      recommendedProductIds: ['p7', 'p8'],
      recommendedBrandIds: ['b3'],
      insuranceCta: '스케일링·발치 등 구강 치료비는 부담이 될 수 있습니다. 보장 범위를 미리 확인해보세요.',
      faq: [
        { question: '양치는 매일 해야 하나요?', answer: '가능하다면 매일 양치하는 것이 치태가 쌓이는 것을 줄이는 데 가장 효과적입니다. 처음부터 무리하기보다 짧은 시간부터 천천히 적응시키고, 반려동물용 칫솔과 치약을 사용해 주세요.' },
        { question: '구강 관리 제품은 양치를 대신할 수 있나요?', answer: '일부 구강 관리 제품은 치태나 치석이 쌓이는 것을 줄이는 데 도움을 줄 수 있습니다. 다만 제품마다 기능과 근거가 다르므로 확인 후 사용하고, 가능하다면 양치와 함께 관리하는 것이 좋습니다.' },
        { question: '이미 생긴 치석은 양치로 없어지나요?', answer: '이미 단단하게 굳은 치석은 양치만으로 제거되지 않습니다. 치석이 많이 쌓였거나 잇몸에 이상이 보인다면 수의사와 상담해 구강 상태를 확인해 주세요.' },
        { question: '입 냄새가 나면 구강 문제가 있는 건가요?', answer: '입 냄새만으로 원인을 판단할 수는 없습니다. 다만 심한 입 냄새가 지속되거나 붉은 잇몸, 침 흘림, 먹기 불편해하는 모습 등이 함께 보인다면 구강 검진을 받아보는 것이 좋습니다.' },
      ],
    },
    {
      slug: 'grooming',
      title: '그루밍',
      icon: '🪮',
      shortDescription: '털 관리와 교감 시간이 필요한가요?',
      description: '브러싱은 단순한 털 정리가 아니라 반려동물과 보호자가 서로를 돌보는 시간입니다. 피부를 살피고 유대를 쌓는 매일의 케어입니다.',
      symptoms: [
        '털이 자주 엉키거나 뭉침',
        '빠진 털이 집안에 많이 날림',
        '피부가 브러싱 자극에 예민하게 반응함',
        '털 속 피부 상태를 확인하기 어려움',
        '그루밍을 거부하거나 불안해함',
      ],
      causes: [
        '털 결·길이에 맞지 않는 도구 사용',
        '브러싱 습관 부재로 인한 엉킴',
        '환절기 과도한 털갈이',
        '피부 자극을 주는 거친 손질',
        '교감 없이 관리만 하려는 접근',
      ],
      recommendedProductIds: ['p9', 'p12', 'p13'],
      // b4(캣코드) 제거(2026-07-16) — 소속 상품이 알로밍(b5)으로 이관돼 b5 로 흡수(중복 제거).
      // p9·p13 은 노출 보류/미가격이라 걸러지고 p12 가 남는다 — 빈 페이지 아님.
      recommendedBrandIds: ['b5'],
      insuranceCta: '그루밍 중 발견한 피부 이상이 걱정되시나요? 무료 보험 분석으로 피부 진료 보장을 확인해보세요.',
      faq: [
        { question: '브러싱은 얼마나 자주 해야 하나요?', answer: '장모종은 매일, 단모종은 주 2~3회를 권장합니다. 털갈이 시기에는 빈도를 늘려 엉킴과 날림을 줄이는 것이 좋습니다.' },
        { question: '고양이도 브러싱이 필요한가요?', answer: '네. 스스로 그루밍하는 고양이도 브러싱으로 헤어볼을 줄이고 피부를 살필 수 있습니다. 거부감이 적은 부드러운 도구로 짧게 시작하세요.' },
      ],
    },
    {
      slug: 'living',
      title: '생활',
      icon: '🏠',
      shortDescription: '반려동물과 함께하는 공간이 쾌적한가요?',
      description: '반려동물의 하루 대부분은 집 안에서 흘러갑니다. 냄새·위생·동선을 배려한 생활 환경이 아이와 보호자 모두의 삶을 편안하게 만듭니다.',
      symptoms: [
        '반려동물 특유의 냄새가 공간에 남음',
        '화장실·방석 주변 위생 관리가 번거로움',
        '털과 먼지가 쉽게 쌓임',
        '아이가 편히 쉴 자리가 마땅치 않음',
        '용품이 공간의 분위기를 해침',
      ],
      causes: [
        '체취·배변 냄새의 누적',
        '흡수·탈취가 부족한 용품',
        '청소·교체 주기 관리의 어려움',
        '반려동물 동선을 고려하지 않은 배치',
        '기능만 있고 디자인은 놓친 제품',
      ],
      recommendedProductIds: ['p12', 'p13', 'p14'],
      recommendedBrandIds: ['b5'],
      insuranceCta: '쾌적한 생활 환경은 건강의 기본입니다. 무료 보험 분석으로 우리 아이의 건강 보장도 함께 점검해보세요.',
      faq: [
        { question: '탈취제는 반려동물에게 안전한가요?', answer: '반려동물 전용으로 표기된 제품을 사용하고, 향료·화학 성분이 강한 사람용 방향제는 피하세요. 참숯 등 천연 소재 기반 제품이 상대적으로 안전합니다.' },
        { question: '용품을 얼마나 자주 교체해야 하나요?', answer: '제품별 권장 주기를 따르되, 냄새가 배거나 흡수력이 떨어지면 주기 전이라도 교체하는 것이 위생에 좋습니다.' },
      ],
    },
  ],
};
