// 홈 화면 CMS 계약(SSOT). site_settings(id='home') 한 행에 jsonb 로 통째로 저장된다.
// ⭐ 이 스키마는 "현재 렌더되는 홈 화면 섹션"과 1:1 로 맞춰져 있다. defaultHomeSettings 의
// 값들은 HomeClient 의 하드코딩 문구와 동일해야 한다 — 그래야 설정 배선이 화면을 바꾸지
// 않는다(zero-visual-change, 시각 회귀 게이트 유지).
//
// 규칙:
// - HTML 금지. 문자열은 전부 평문이다. HTML 싱크는 CI(no-html-sink 스펙)가 막는다.
// - 줄바꿈이 필요한 문구는 마크업이 아니라 구조(string[] 줄 배열)로 표현한다 — HomeClient 가
//   각 줄 사이에 <br /> 를 넣어 렌더한다.
// - 이미지·링크·노출·카드 배열도 관리자 화면에서 함께 관리한다. 배열은 최대 12개로 제한해
//   실수로 지나치게 많은 카드가 공개되는 것을 막는다.

export interface HomeSettings {
  /** 1. 메인 히어로 */
  hero: {
    visible: boolean;
    eyebrow: string;
    titleLines: string[];
    descriptionLines: string[];
    primaryCtaLabel: string;
    secondaryCtaLabel: string;
    trustNote: string;
    desktopImage: string;
    mobileImage: string;
    imageAlt: string;
    primaryCtaHref: string;
    secondaryCtaHref: string;
  };
  quickShop: {
    visible: boolean;
    title: string;
    links: Array<{ name: string; href: string; icon: string; visible: boolean }>;
  };
  /** 3. Audit 추천 상품 */
  bestProducts: {
    visible: boolean;
    title: string;
    linkLabel: string;
    linkHref: string;
  };
  /** 4. 고민별 맞춤 큐레이션 (카드 아이콘·href·이미지는 하드코딩) */
  curation: {
    visible: boolean;
    title: string;
    description: string;
    diagnosisLinkLabel: string;
    allConcernsLinkLabel: string;
    cards: Array<{ title: string; desc: string; href: string; image: string; visible: boolean }>;
  };
  /** 5. 백조오브제 Audit 검증 기준 (기준 아이콘은 하드코딩) */
  audit: {
    visible: boolean;
    badge: string;
    titleLines: string[];
    description: string;
    linkLabel: string;
    linkHref: string;
    desktopImage: string;
    mobileImage: string;
    imageAlt: string;
    criteria: Array<{ title: string; desc: string }>;
  };
  /** 9. 펫보험 안내 배너 */
  insuranceBanner: {
    visible: boolean;
    eyebrow: string;
    title: string;
    description: string;
    buttonLabel: string;
    buttonHref: string;
    desktopImage: string;
    mobileImage: string;
    imageAlt: string;
  };
  /** 10. 반려가족 후기와 백조오브제 소식 */
  trustBoard: {
    visible: boolean;
    reviewsTitle: string;
    reviewsLinkLabel: string;
    reviewsLinkHref: string;
    noticesTitle: string;
    noticesLinkLabel: string;
    noticesLinkHref: string;
  };
}

export const defaultHomeSettings: HomeSettings = {
  hero: {
    visible: true,
    eyebrow: 'Curated Pet Brands',
    titleLines: ['좋은 브랜드를', '찾고 계셨나요?'],
    descriptionLines: ['좋은 브랜드는 결과입니다. 백조오브제는 과정까지 확인합니다.'],
    primaryCtaLabel: '검증 상품 보기',
    secondaryCtaLabel: '고민별 찾아보기',
    trustNote: '백조오브제 Audit을 통과한 브랜드만 소개합니다.',
    desktopImage: '/images/home-hero-pet-lifestyle-desktop.png',
    mobileImage: '/images/home-hero-pet-lifestyle-mobile.png',
    imageAlt: '반려동물과 함께하는 백조오브제의 펫 라이프스타일 제품',
    primaryCtaHref: '/shop',
    secondaryCtaHref: '/concerns',
  },
  quickShop: {
    visible: true,
    title: '',
    links: [
      { name: '강아지', href: '/shop?petType=dog', icon: 'dog', visible: true },
      { name: '고양이', href: '/shop?petType=cat', icon: 'cat', visible: true },
      { name: '소동물', href: '/shop?petType=small', icon: 'rabbit', visible: true },
      { name: '사료·간식', href: '/shop?category=food', icon: 'food', visible: true },
      { name: '위생·배변', href: '/shop?category=care', icon: 'care', visible: true },
      { name: '건강관리', href: '/concerns', icon: 'health', visible: true },
    ],
  },
  bestProducts: {
    visible: true,
    title: 'Audit를 통과한 오늘의 추천',
    linkLabel: '전체 셀렉션 보기',
    linkHref: '/shop',
  },
  curation: {
    visible: true,
    title: '우리 아이 고민에 맞는 케어 가이드',
    description: '우리 아이는 매일 작은 신호를 보냅니다. 그 신호를 이해하는 것부터 케어는 시작됩니다.',
    diagnosisLinkLabel: '1분 맞춤 진단 시작',
    allConcernsLinkLabel: '모든 고민 살펴보기',
    cards: [
      { title: '눈물', desc: '눈물 자국이 신경 쓰일 때', href: '/concerns/tear', image: '/images/curation_tear.png', visible: true },
      { title: '피부', desc: '피부를 자주 긁을 때', href: '/concerns/skin', image: '/images/curation_skin.png', visible: true },
      { title: '관절', desc: '걸음걸이가 달라졌을 때', href: '/concerns/joint', image: '/images/curation_joint.png', visible: true },
      { title: '체중', desc: '체중 관리가 필요할 때', href: '/concerns/obesity', image: '/images/curation_weight.png', visible: true },
    ],
  },
  audit: {
    visible: true,
    badge: 'BAEKJO OBJET AUDIT',
    titleLines: ['길지만은 않은', '우리 아이와의 시간'],
    description: '좋은 브랜드를 통해 우리 아이와 더 많은 행복을 함께할 수 있도록 백조오브제 Audit을 진행합니다.',
    linkLabel: '검토 기준 자세히 보기',
    linkHref: '/audit',
    desktopImage: '/images/home-audit-client-photo-extended-v5.png',
    mobileImage: '/images/home-audit-client-photo-v4.png',
    imageAlt: '백조오브제 브랜드 패키지 오브제',
    criteria: [
      { title: '브랜드 철학', desc: '브랜드가 추구하는 가치를 확인합니다.' },
      { title: '성분·원료', desc: '성분과 원료를 확인합니다.' },
      { title: '제조 과정', desc: '제품이 만들어지는 과정을 확인합니다.' },
      { title: '사용 경험', desc: '실제 보호자의 경험을 확인합니다.' },
    ],
  },
  insuranceBanner: {
    visible: true,
    eyebrow: '펫보험 보장 확인',
    title: '보험도 우리 아이 기준으로.',
    description: '같은 품종이라도, 나이와 기왕력에 따라 우리 아이에게 맞는 보험은 달라집니다.',
    buttonLabel: '보험 분석 시작하기',
    buttonHref: '/insurance',
    desktopImage: '/images/insurance-analysis-banner-wide.png',
    mobileImage: '/images/insurance-analysis-banner.png',
    imageAlt: '반려동물 보험을 분석하는 보호자와 강아지, 고양이',
  },
  trustBoard: {
    visible: true,
    reviewsTitle: '보호자 후기',
    reviewsLinkLabel: '후기 전체 보기',
    reviewsLinkHref: '/reviews',
    noticesTitle: '소식',
    noticesLinkLabel: '소식 전체 보기',
    noticesLinkHref: '/notices',
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

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
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

function normalizeQuickShopLinks(
  value: unknown,
  defaults: HomeSettings['quickShop']['links'],
): HomeSettings['quickShop']['links'] {
  if (!Array.isArray(value)) return defaults;
  const input = value;
  const names = input.map((item) => (isRecord(item) ? asString(item.name, '') : ''));
  const findNamedItem = (fragment: string, fallbackIndex: number) => {
    const index = names.findIndex((name) => name.includes(fragment));
    return index >= 0 ? input[index] : input[fallbackIndex];
  };
  const source = input.length >= 9
    ? [
        findNamedItem('강아지', 1),
        findNamedItem('고양이', 2),
        findNamedItem('소동물', -1) ?? { name: '소동물' },
        findNamedItem('사료', 3),
        findNamedItem('위생', 4),
        findNamedItem('건강', 5),
      ]
    : names.length === 6 && names[5] === '고민별 케어'
      ? [input[0], input[1], { name: '소동물' }, input[2], input[3], input[4]]
      : input;

  return source.slice(0, 12).map((rawItem, index) => {
    const fallback = defaults[index] ?? { name: '', href: '/', icon: 'health', visible: true };
    const item = isRecord(rawItem) ? rawItem : {};
    return {
      name: asString(item.name, fallback.name),
      href: asString(item.href, fallback.href),
      icon: asString(item.icon, fallback.icon),
      visible: asBoolean(item.visible, fallback.visible),
    };
  });
}

function normalizeCurationCards(
  value: unknown,
  defaults: HomeSettings['curation']['cards'],
): HomeSettings['curation']['cards'] {
  if (!Array.isArray(value)) return defaults;
  return value.slice(0, 12).map((rawItem, index) => {
    const fallback = defaults[index] ?? { title: '', desc: '', href: '/concerns', image: '', visible: true };
    const item = isRecord(rawItem) ? rawItem : {};
    return {
      title: asString(item.title, fallback.title),
      desc: asString(item.desc, fallback.desc),
      href: asString(item.href, fallback.href),
      image: asString(item.image, fallback.image),
      visible: asBoolean(item.visible, fallback.visible),
    };
  });
}

export function normalizeHomeSettings(input: unknown): HomeSettings {
  const root = isRecord(input) ? input : {};
  const hero = isRecord(root.hero) ? root.hero : {};
  const quickShop = isRecord(root.quickShop) ? root.quickShop : {};
  const bestProducts = isRecord(root.bestProducts) ? root.bestProducts : {};
  const curation = isRecord(root.curation) ? root.curation : {};
  const audit = isRecord(root.audit) ? root.audit : {};
  const insuranceBanner = isRecord(root.insuranceBanner) ? root.insuranceBanner : {};
  const trustBoard = isRecord(root.trustBoard) ? root.trustBoard : {};

  const d = defaultHomeSettings;
  return {
    hero: {
      visible: asBoolean(hero.visible, d.hero.visible),
      eyebrow: asString(hero.eyebrow, d.hero.eyebrow),
      titleLines: asStringLines(hero.titleLines, d.hero.titleLines),
      descriptionLines: asStringLines(hero.descriptionLines, d.hero.descriptionLines),
      primaryCtaLabel: asString(hero.primaryCtaLabel, d.hero.primaryCtaLabel),
      secondaryCtaLabel: asString(hero.secondaryCtaLabel, d.hero.secondaryCtaLabel),
      trustNote: asString(hero.trustNote, d.hero.trustNote),
      desktopImage: asString(hero.desktopImage, d.hero.desktopImage),
      mobileImage: asString(hero.mobileImage, d.hero.mobileImage),
      imageAlt: asString(hero.imageAlt, d.hero.imageAlt),
      primaryCtaHref: asString(hero.primaryCtaHref, d.hero.primaryCtaHref),
      secondaryCtaHref: asString(hero.secondaryCtaHref, d.hero.secondaryCtaHref),
    },
    quickShop: {
      visible: asBoolean(quickShop.visible, d.quickShop.visible),
      title: asString(quickShop.title, d.quickShop.title),
      links: normalizeQuickShopLinks(quickShop.links, d.quickShop.links),
    },
    bestProducts: {
      visible: asBoolean(bestProducts.visible, d.bestProducts.visible),
      title: asString(bestProducts.title, d.bestProducts.title),
      linkLabel: asString(bestProducts.linkLabel, d.bestProducts.linkLabel),
      linkHref: asString(bestProducts.linkHref, d.bestProducts.linkHref),
    },
    curation: {
      visible: asBoolean(curation.visible, d.curation.visible),
      title: asString(curation.title, d.curation.title),
      description: asString(curation.description, d.curation.description),
      diagnosisLinkLabel: asString(curation.diagnosisLinkLabel, d.curation.diagnosisLinkLabel),
      allConcernsLinkLabel: asString(curation.allConcernsLinkLabel, d.curation.allConcernsLinkLabel),
      cards: normalizeCurationCards(curation.cards, d.curation.cards),
    },
    audit: {
      visible: asBoolean(audit.visible, d.audit.visible),
      badge: asString(audit.badge, d.audit.badge),
      titleLines: asStringLines(audit.titleLines, d.audit.titleLines),
      description: asString(audit.description, d.audit.description),
      linkLabel: asString(audit.linkLabel, d.audit.linkLabel),
      linkHref: asString(audit.linkHref, d.audit.linkHref),
      desktopImage: asString(audit.desktopImage, d.audit.desktopImage),
      mobileImage: asString(audit.mobileImage, d.audit.mobileImage),
      imageAlt: asString(audit.imageAlt, d.audit.imageAlt),
      criteria: asObjectArray(audit.criteria, d.audit.criteria, (item, fallback) => ({
        title: asString(item.title, fallback.title),
        desc: asString(item.desc, fallback.desc),
      })),
    },
    insuranceBanner: {
      visible: asBoolean(insuranceBanner.visible, d.insuranceBanner.visible),
      eyebrow: asString(insuranceBanner.eyebrow, d.insuranceBanner.eyebrow),
      title: asString(insuranceBanner.title, d.insuranceBanner.title),
      description: asString(insuranceBanner.description, d.insuranceBanner.description),
      buttonLabel: asString(insuranceBanner.buttonLabel, d.insuranceBanner.buttonLabel),
      buttonHref: asString(insuranceBanner.buttonHref, d.insuranceBanner.buttonHref),
      desktopImage: asString(insuranceBanner.desktopImage, d.insuranceBanner.desktopImage),
      mobileImage: asString(insuranceBanner.mobileImage, d.insuranceBanner.mobileImage),
      imageAlt: asString(insuranceBanner.imageAlt, d.insuranceBanner.imageAlt),
    },
    trustBoard: {
      visible: asBoolean(trustBoard.visible, d.trustBoard.visible),
      reviewsTitle: asString(trustBoard.reviewsTitle, d.trustBoard.reviewsTitle),
      reviewsLinkLabel: asString(trustBoard.reviewsLinkLabel, d.trustBoard.reviewsLinkLabel),
      reviewsLinkHref: asString(trustBoard.reviewsLinkHref, d.trustBoard.reviewsLinkHref),
      noticesTitle: asString(trustBoard.noticesTitle, d.trustBoard.noticesTitle),
      noticesLinkLabel: asString(trustBoard.noticesLinkLabel, d.trustBoard.noticesLinkLabel),
      noticesLinkHref: asString(trustBoard.noticesLinkHref, d.trustBoard.noticesLinkHref),
    },
  };
}
