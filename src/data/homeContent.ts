// 홈 화면 CMS 계약(SSOT). site_settings(id='home') 한 행에 jsonb 로 통째로 저장된다.
// ⭐ 이 스키마는 "현재 렌더되는 홈 화면 섹션"과 1:1 로 맞춰져 있다. defaultHomeSettings 의
// 값들은 HomeClient 의 하드코딩 문구와 동일해야 한다 — 그래야 설정 배선이 화면을 바꾸지
// 않는다(zero-visual-change, 시각 회귀 게이트 유지).
//
// 규칙:
// - HTML 금지. 문자열은 전부 평문이다. dangerouslySetInnerHTML 은 CI(no-html-sink)가 막는다.
// - 줄바꿈이 필요한 문구는 마크업이 아니라 구조(string[] 줄 배열)로 표현한다 — HomeClient 가
//   각 줄 사이에 <br /> 를 넣어 렌더한다.
// - 카드/아이콘/링크 배열의 "구조"(아이콘·href·이미지)는 HomeClient 에 하드코딩되어 있고,
//   여기서는 "문구"만 다룬다. 배열 길이는 normalize 단계에서 default 길이로 고정된다.

export interface HomeSettings {
  /** 1. 메인 히어로 */
  hero: {
    eyebrow: string;
    titleLines: string[];
    descriptionLines: string[];
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
    trustNote: string;
    badgeTitle: string;
    badgeSubtitle: string;
  };
  /** 2. 빠른 쇼핑 (아이콘·href 는 HomeClient 하드코딩, 이름만 편집) */
  quickShop: {
    title: string;
    links: Array<{ name: string }>;
  };
  /** 3. Audit 추천 상품 */
  bestProducts: {
    title: string;
    linkLabel: string;
  };
  /** 4. 고민별 맞춤 큐레이션 (카드 아이콘·href·이미지는 하드코딩) */
  curation: {
    title: string;
    description: string;
    diagnosisLinkLabel: string;
    allConcernsLinkLabel: string;
    cards: Array<{ title: string; desc: string }>;
  };
  /** 5. 백조 Audit 검증 기준 (기준 아이콘은 하드코딩) */
  audit: {
    badge: string;
    titleLines: string[];
    description: string;
    linkLabel: string;
    criteria: Array<{ title: string; desc: string }>;
  };
  /** 6. 우리 아이를 위한 3가지 솔루션 (이미지·href 는 하드코딩) */
  solutions: {
    title: string;
    cards: Array<{ title: string; desc: string; linkLabel: string }>;
  };
  /** 9. 펫보험 안내 배너 */
  insuranceBanner: {
    eyebrow: string;
    title: string;
    description: string;
    buttonLabel: string;
  };
  /** 10. 반려가족 후기와 백조 소식 */
  trustBoard: {
    reviewsTitle: string;
    reviewsLinkLabel: string;
    noticesTitle: string;
    noticesLinkLabel: string;
  };
}

export const defaultHomeSettings: HomeSettings = {
  hero: {
    eyebrow: 'PREMIUM PET CURATION',
    titleLines: ['검증된 브랜드를', '우리 아이 고민에', '맞게.'],
    descriptionLines: [
      '성분과 제조 기준, 보호자의 사용 가치를 확인한 반려동물 브랜드와',
      '상품을 소개합니다.',
    ],
    primaryCtaLabel: '검증 상품 보기',
    secondaryCtaLabel: '고민별 찾아보기',
    trustNote: '백조오브제 Audit 검증을 통과한 브랜드만 소개합니다.',
    badgeTitle: 'Audit Passed',
    badgeSubtitle: '검증 기준 통과',
  },
  quickShop: {
    title: '빠른 쇼핑',
    links: [
      { name: '전체 상품' },
      { name: '강아지' },
      { name: '고양이' },
      { name: '사료·간식' },
      { name: '위생·배변' },
      { name: '건강관리' },
      { name: '고민별 케어' },
      { name: '브랜드관' },
    ],
  },
  bestProducts: {
    title: 'Audit를 통과한 오늘의 추천',
    linkLabel: '전체 셀렉션 보기',
  },
  curation: {
    title: '반려동물 고민에 맞춘 큐레이션',
    description: '우리 아이의 일상적인 고민부터 차근차근 확인해 보세요.',
    diagnosisLinkLabel: '1분 맞춤 진단 시작',
    allConcernsLinkLabel: '모든 고민 살펴보기',
    cards: [
      { title: '눈물', desc: '눈물 자국이 걱정될 때' },
      { title: '피부', desc: '자주 긁거나 피부가 예민할 때' },
      { title: '관절', desc: '걷거나 움직임이 불편해 보일 때' },
      { title: '체중', desc: '체중 관리가 필요할 때' },
    ],
  },
  audit: {
    badge: '백조오브제 Audit',
    titleLines: ['100개 중', '5개만 선택합니다.'],
    description: '성분, 원료, 제조·유통, 브랜드 운영 방향을 철저히 확인한 상품만 소개합니다.',
    linkLabel: '검증 기준 자세히 보기',
    criteria: [
      { title: '브랜드 운영 방향', desc: '가치와 철학을 함께 봅니다' },
      { title: '성분·원료 정보', desc: '안전한 성분을 확인합니다' },
      { title: '제조·유통 기준', desc: '과정을 세밀하게 검토합니다' },
      { title: '보호자 사용 가치', desc: '실제 사용 경험을 확인합니다' },
    ],
  },
  solutions: {
    title: '우리 아이를 위한 3가지 솔루션',
    cards: [
      { title: '검증 브랜드', desc: 'Audit 기준을 철저히 통과한 믿을 수 있는 브랜드와 상품', linkLabel: '브랜드 보러가기' },
      { title: '고민별 큐레이션', desc: '우리 아이의 증상과 고민에 딱 맞는 상품 맞춤 추천', linkLabel: '큐레이션 보러가기' },
      { title: '펫보험 비교', desc: '복잡한 보장 조건을 우리 아이 맞춤으로 한눈에 비교', linkLabel: '보험 분석 알아보기' },
    ],
  },
  insuranceBanner: {
    eyebrow: '펫보험 보장 확인',
    title: '보험도 우리 아이 기준으로.',
    description: '보험 상품을 우리 아이의 조건에 맞게 비교해 보세요. 가장 적합한 펫보험을 찾아보세요.',
    buttonLabel: '보험 분석 알아보기',
  },
  trustBoard: {
    reviewsTitle: '반려가족 후기',
    reviewsLinkLabel: '더 보기',
    noticesTitle: '백조 소식',
    noticesLinkLabel: '더 보기',
  },
};

// ---------------------------------------------------------------------------
// normalize — 저장된 jsonb(부분/구버전/깨진 값 포함)를 현재 스키마 모양으로 안전하게 되돌린다.
// 어떤 필드든 문자열/배열이 아니면 default 로 폴백한다. 배열 길이는 default 길이로 고정해
// HomeClient 의 구조 배열(아이콘·href·이미지)과 인덱스가 항상 맞도록 보장한다.
// 이 함수가 초록불인 한, 구버전 스키마 행이 DB 에 남아 있어도 홈은 현재 문구(=default)로 뜬다.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function asStringLines(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const lines = value.filter((item): item is string => typeof item === 'string');
  return lines.length > 0 ? lines : fallback;
}

function asObjectArray<T>(
  value: unknown,
  defaults: T[],
  normalizeItem: (item: Record<string, unknown>, fallback: T) => T,
): T[] {
  const arr = Array.isArray(value) ? value : [];
  return defaults.map((fallback, index) => {
    const item = arr[index];
    return normalizeItem(isRecord(item) ? item : {}, fallback);
  });
}

export function normalizeHomeSettings(input: unknown): HomeSettings {
  const root = isRecord(input) ? input : {};
  const hero = isRecord(root.hero) ? root.hero : {};
  const quickShop = isRecord(root.quickShop) ? root.quickShop : {};
  const bestProducts = isRecord(root.bestProducts) ? root.bestProducts : {};
  const curation = isRecord(root.curation) ? root.curation : {};
  const audit = isRecord(root.audit) ? root.audit : {};
  const solutions = isRecord(root.solutions) ? root.solutions : {};
  const insuranceBanner = isRecord(root.insuranceBanner) ? root.insuranceBanner : {};
  const trustBoard = isRecord(root.trustBoard) ? root.trustBoard : {};

  const d = defaultHomeSettings;

  return {
    hero: {
      eyebrow: asString(hero.eyebrow, d.hero.eyebrow),
      titleLines: asStringLines(hero.titleLines, d.hero.titleLines),
      descriptionLines: asStringLines(hero.descriptionLines, d.hero.descriptionLines),
      primaryCtaLabel: asString(hero.primaryCtaLabel, d.hero.primaryCtaLabel),
      secondaryCtaLabel: asString(hero.secondaryCtaLabel, d.hero.secondaryCtaLabel),
      trustNote: asString(hero.trustNote, d.hero.trustNote),
      badgeTitle: asString(hero.badgeTitle, d.hero.badgeTitle),
      badgeSubtitle: asString(hero.badgeSubtitle, d.hero.badgeSubtitle),
    },
    quickShop: {
      title: asString(quickShop.title, d.quickShop.title),
      links: asObjectArray(quickShop.links, d.quickShop.links, (item, fallback) => ({
        name: asString(item.name, fallback.name),
      })),
    },
    bestProducts: {
      title: asString(bestProducts.title, d.bestProducts.title),
      linkLabel: asString(bestProducts.linkLabel, d.bestProducts.linkLabel),
    },
    curation: {
      title: asString(curation.title, d.curation.title),
      description: asString(curation.description, d.curation.description),
      diagnosisLinkLabel: asString(curation.diagnosisLinkLabel, d.curation.diagnosisLinkLabel),
      allConcernsLinkLabel: asString(curation.allConcernsLinkLabel, d.curation.allConcernsLinkLabel),
      cards: asObjectArray(curation.cards, d.curation.cards, (item, fallback) => ({
        title: asString(item.title, fallback.title),
        desc: asString(item.desc, fallback.desc),
      })),
    },
    audit: {
      badge: asString(audit.badge, d.audit.badge),
      titleLines: asStringLines(audit.titleLines, d.audit.titleLines),
      description: asString(audit.description, d.audit.description),
      linkLabel: asString(audit.linkLabel, d.audit.linkLabel),
      criteria: asObjectArray(audit.criteria, d.audit.criteria, (item, fallback) => ({
        title: asString(item.title, fallback.title),
        desc: asString(item.desc, fallback.desc),
      })),
    },
    solutions: {
      title: asString(solutions.title, d.solutions.title),
      cards: asObjectArray(solutions.cards, d.solutions.cards, (item, fallback) => ({
        title: asString(item.title, fallback.title),
        desc: asString(item.desc, fallback.desc),
        linkLabel: asString(item.linkLabel, fallback.linkLabel),
      })),
    },
    insuranceBanner: {
      eyebrow: asString(insuranceBanner.eyebrow, d.insuranceBanner.eyebrow),
      title: asString(insuranceBanner.title, d.insuranceBanner.title),
      description: asString(insuranceBanner.description, d.insuranceBanner.description),
      buttonLabel: asString(insuranceBanner.buttonLabel, d.insuranceBanner.buttonLabel),
    },
    trustBoard: {
      reviewsTitle: asString(trustBoard.reviewsTitle, d.trustBoard.reviewsTitle),
      reviewsLinkLabel: asString(trustBoard.reviewsLinkLabel, d.trustBoard.reviewsLinkLabel),
      noticesTitle: asString(trustBoard.noticesTitle, d.trustBoard.noticesTitle),
      noticesLinkLabel: asString(trustBoard.noticesLinkLabel, d.trustBoard.noticesLinkLabel),
    },
  };
}
