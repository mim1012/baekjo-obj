import type { Brand } from '@/types';

export interface BrandPresentation {
  displayName: string;
  englishName?: string;
  cardDescription: string;
  detailDescription: string;
  cardTags: string;
  audienceTags: string[];
  categories: string;
  concerns: string;
}

type BrandPresentationRule = {
  matches: (name: string) => boolean;
  value: Omit<BrandPresentation, 'displayName'> & { displayName: string | ((name: string) => string) };
};

const rules: BrandPresentationRule[] = [
  {
    matches: (name) => /노블독|노볼독|noble\s*dog/i.test(name),
    value: {
      displayName: '노블독',
      englishName: 'Noble Dog',
      cardDescription: '꾸준한 구강 관리를 고민하는 브랜드',
      detailDescription: '꾸준한 구강 관리가 일상에 자리 잡을 수 있도록 돕는 브랜드',
      cardTags: '구강/위생',
      audienceTags: ['강아지', '고양이'],
      categories: '케어',
      concerns: '구강 · 양치',
    },
  },
  {
    matches: (name) => /알로밍|alloming/i.test(name),
    value: {
      displayName: '알로밍',
      englishName: 'ALLOMING',
      cardDescription: '교감의 시간을 제품으로 설계하는 브랜드',
      detailDescription: '오랜 그루밍 연구를 바탕으로, 보호자가 받은 사랑에 같은 방식으로 보답할 수 있도록 돕는 브랜드',
      cardTags: '그루밍/케어',
      audienceTags: ['강아지', '고양이'],
      categories: '케어 · 라이프',
      concerns: '그루밍 · 교감',
    },
  },
  {
    matches: (name) => /오미프로|오미포로|omipro/i.test(name),
    value: {
      displayName: '오미프로',
      englishName: 'OMIPRO',
      cardDescription: '몸속의 작은 변화까지 고민하는 영양 브랜드',
      detailDescription: '연구가 끝난 뒤에도 스스로 확인을 멈추지 않는 영양 브랜드',
      cardTags: '장/뼈건강',
      audienceTags: ['강아지', '고양이'],
      categories: '푸드 · 영양',
      concerns: '장 · 뼈 건강',
    },
  },
  {
    matches: (name) => /페네핏|penefit/i.test(name),
    value: {
      displayName: '페네핏',
      englishName: 'PENEFIT',
      cardDescription: '더 많은 아이들이 함께할 수 있는 식탁을 고민하는 브랜드',
      detailDescription: '기호성과 영양을 함께 고민하며 선택지를 넓혀가는 브랜드',
      cardTags: '영양/간식',
      audienceTags: ['강아지', '고양이', '굿즈'],
      categories: '푸드 · 영양',
      concerns: '편식 · 영양 관리',
    },
  },
  {
    matches: (name) => /써니\s*사이드업|써니\s*사이어드|sunny\s*side\s*up/i.test(name),
    value: {
      displayName: '써니사이드업',
      englishName: 'SUNNY SIDE UP',
      cardDescription: '연구의 시작부터 생명을 먼저 생각하는 브랜드',
      detailDescription: '세포배양 기반 연구를 바탕으로 제품과 기술에 생명을 향한 존중을 이어가는 브랜드',
      cardTags: '케어/라이프',
      audienceTags: ['ALL ANIMALS', '사람', '동물실험 대체'],
      categories: '케어 · 라이프',
      concerns: '피부 · 데일리케어',
    },
  },
  {
    matches: (name) => /챠콜스토리|차콜스토리|charcoal\s*story/i.test(name),
    value: {
      displayName: '챠콜스토리',
      englishName: 'Charcoal Story',
      cardDescription: '숯의 가치를 반려동물에게 전하는 브랜드',
      detailDescription: '숯의 본질적인 가치를 아이들의 건강한 일상에 이어가는 브랜드',
      cardTags: '탈취/위생',
      audienceTags: ['강아지', '고양이'],
      categories: '케어 · 라이프',
      concerns: '탈취 · 습기',
    },
  },
  {
    matches: (name) => /RE\s*:?\s*펫|re펫|리펫|re\s*:?\s*pet/i.test(name),
    value: {
      // 최종 한글 표기는 DEC-004 대기 상태다. 이미 저장된 이름을 그대로 유지한다.
      displayName: (name) => name.replace(/\s*\(.*?\)/, '').trim(),
      englishName: 'RE:PET',
      cardDescription: '펫로스를 가장 가까이에서 경험한 작가가 만드는 브랜드',
      detailDescription: '그리운 아이의 모습을 정성스럽게 구현해 다시 마주할 수 있게 하는 브랜드',
      cardTags: '펫로스/오브제',
      audienceTags: ['강아지', '고양이', '소동물', '핸드메이드'],
      categories: '펫로스 · 라이프',
      concerns: '펫로스 · 추억',
    },
  },
  {
    matches: (name) => /메종슈슈|maison\s*chouchou/i.test(name),
    value: {
      displayName: '메종슈슈',
      englishName: 'Maison Chouchou',
      cardDescription: '입히는 대상이 아닌, 함께 살아가는 존재로 대하는 브랜드',
      detailDescription: '입는 아이의 편안함까지 생각하며 아름다움을 완성하는 브랜드',
      cardTags: '의류/패션',
      audienceTags: ['강아지', '핸드메이드'],
      categories: '패션 · 라이프',
      concerns: '체형 · 착용감',
    },
  },
];

function resolveRule(name: string) {
  return rules.find((candidate) => candidate.matches(name));
}

function resolveKoreanName(rule: BrandPresentationRule, name: string) {
  return typeof rule.value.displayName === 'function'
    ? rule.value.displayName(name)
    : rule.value.displayName;
}

/**
 * 고객 화면과 관리자 표시 영역에서 사용하는 단일 브랜드명 형식.
 * 저장된 브랜드명과 상품 스냅샷은 변경하지 않고, 알려진 8개 브랜드만
 * `한글명 (영문명)`으로 정규화한다.
 */
export function formatBrandDisplayName(name: string): string {
  const trimmedName = name.trim();
  const rule = resolveRule(trimmedName);
  if (!rule) return trimmedName;

  const displayName = resolveKoreanName(rule, trimmedName);
  const englishName = rule.value.englishName;
  if (!englishName) return displayName;

  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
  return normalize(displayName) === normalize(englishName)
    ? displayName
    : `${displayName} (${englishName})`;
}

export function getBrandPresentation(brand: Pick<Brand, 'name' | 'description'>): BrandPresentation {
  const rule = resolveRule(brand.name);
  if (!rule) {
    const displayName = brand.name.replace(/\s*\(.*?\)/, '').trim();
    return {
      displayName,
      cardDescription: brand.description,
      detailDescription: brand.description,
      cardTags: '프리미엄 펫 브랜드',
      audienceTags: [],
      categories: '종합 케어',
      concerns: '전반적 관리',
    };
  }

  return {
    ...rule.value,
    displayName: resolveKoreanName(rule, brand.name),
  };
}
