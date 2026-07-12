export interface HomeSettings {
  intro: {
    videoSrc: string;
  };
  howToStart: {
    title: string;
    description: string;
    steps: Array<{
      num: string;
      title: string;
      desc: string;
      linkText: string;
      linkHref: string;
    }>;
  };
  audit: {
    badge: string;
    title: string;
    descriptionTitle: string;
    descriptionText: string;
    icons: Array<{ title: string }>;
    signatureText: string;
    bannerText: string;
  };
  curation: {
    badge: string;
    title: string;
    description: string;
    button1Text: string;
    button2Text: string;
    boardTitle: string;
    boardDesc: string;
    cards: Array<{ title: string; desc: string }>;
    step2Title: string;
    step2Desc: string;
    step3LeftTitle: string;
    step3LeftDesc: string;
    step3RightTitle: string;
    step3RightDesc: string;
    bottomGuide: string;
  };
  brands: {
    eyebrow: string;
    title: string;
    description: string;
    buttonText: string;
  };
  bestProducts: {
    eyebrow: string;
    title: string;
    description: string;
    linkLabel: string;
  };
  insurance: {
    eyebrow: string;
    title: string;
    description: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    disclaimer: string;
    buttonText: string;
  };
  trustBoard: {
    eyebrow: string;
    title: string;
    reviewsTitle: string;
    reviewsLinkText: string;
    noticesTitle: string;
    noticesLinkText: string;
  };
  b2b: {
    text: string;
    linkText: string;
  };
}

export const defaultHomeSettings: HomeSettings = {
  intro: {
    videoSrc: '/videos/baekjo-objet.mp4',
  },
  howToStart: {
    title: '백조오브제가 제안하는<br />3가지 핵심 솔루션',
    description: '우리 아이의 라이프스타일에 맞춘 가장 확실한 선택 기준을 제공합니다.',
    steps: [
      { 
        num: '01', 
        title: 'Audit 기준으로<br />고른 브랜드', 
        desc: '브랜드 철학, 제조 기준,<br />성분 안전성을 확인한<br />브랜드만 소개합니다.',
        linkText: 'Audit 기준 보기', 
        linkHref: '/brands'
      },
      { 
        num: '02', 
        title: '고민별<br />맞춤 큐레이션', 
        desc: '눈물, 관절, 피부, 체질 등<br />반려동물의 고민에 맞는<br />상품을 추천합니다.',
        linkText: '고민별 찾아보기', 
        linkHref: '/concerns'
      },
      { 
        num: '03', 
        title: '펫보험<br />비교 안내', 
        desc: '반려동물 조건을 입력하고<br />보험 비교 후 효용을<br />확인합니다.',
        linkText: '펫보험 비교하기', 
        linkHref: '/insurance'
      }
    ]
  },
  audit: {
    badge: 'BAEKJO AUDIT',
    title: '100개 중<br /><span className="font-editorial italic font-normal text-[#A8742E] text-[52px] lg:text-[64px] mr-1">5</span>개만 선택합니다.',
    descriptionTitle: '판매보다 기준을 먼저 봅니다.',
    descriptionText: '브랜드 운영 방향, 성분·원료 정보, 제조·유통 기준, 보호자 사용 가치를 통과한 브랜드만 소개합니다.',
    icons: [
      { title: '브랜드 운영 방향' },
      { title: '성분·원료 정보' },
      { title: '제조·유통 기준' },
      { title: '보호자 사용 가치' }
    ],
    signatureText: '엄격한 기준으로 선별된 브랜드만,<br />백조오브제에서 만나보세요.',
    bannerText: '백조오브제의 모든 브랜드는 검증 기준을 통과해야만 소개됩니다.'
  },
  curation: {
    badge: 'Custom Curation',
    title: '반려동물 고민에<br />맞춘 큐레이션',
    description: '우리 아이의 상태를 알려주시면 가장 완벽한 관리 방향을 설계해 드립니다. 무엇부터 시작할지 막막하시다면 맞춤 진단을, 이미 필요한 고민이 있다면 고민별 가이드를 확인해 보세요.',
    button1Text: '1분 맞춤 진단 시작',
    button2Text: '모든 고민 살펴보기',
    boardTitle: '진단 기반 추천 프로세스',
    boardDesc: '간단한 정보로 우리 아이에게 꼭 맞는 선택을 연결합니다.',
    cards: [
      { title: '눈물', desc: '눈물 자국이<br />걱정될 때' },
      { title: '피부', desc: '자주 긁거나<br />피부가 예민할 때' },
      { title: '관절', desc: '걸음걸이가<br />불편해 보일 때' },
      { title: '체중', desc: '체중 관리가<br />필요할 때' }
    ],
    step2Title: '백조오브제 큐레이션',
    step2Desc: '필요한 정보만 정리하고<br/>복잡한 선택 과정을 단순하게 안내합니다.',
    step3LeftTitle: '검증 브랜드 & 상품 추천',
    step3LeftDesc: '엄선된 브랜드와 상품을 고민 유형에 맞게 추천',
    step3RightTitle: '펫보험 비교 & 안내',
    step3RightDesc: '필요한 경우 보험 비교 및 안내 제공',
    bottomGuide: '맞춤 진단은 왼쪽의 "1분 맞춤 진단 시작" 버튼에서 시작할 수 있습니다.'
  },
  brands: {
    eyebrow: 'Baekjo brand edit',
    title: '반려생활의 취향과 기준을 함께 고른 브랜드',
    description: '백조오브제가 수집한 상품 정보와 브랜드 철학을 바탕으로, 각자의 반려생활에 맞는 브랜드와 상품을 한곳에서 살펴보세요.',
    buttonText: '브랜드 전체 보기'
  },
  bestProducts: {
    eyebrow: 'The daily edit',
    title: 'Audit를 통과한 오늘의 추천',
    description: '검증된 브랜드 중에서도 가장 많은 보호자님들께 선택받은 대표 상품입니다.',
    linkLabel: '전체 셀렉션 보기'
  },
  insurance: {
    eyebrow: 'Insurance Analysis',
    title: '우리 아이에게 꼭 맞는 <br className="hidden sm:block" />맞춤 펫보험 분석',
    description: '옆집 아이의 정답이 우리 아이의 정답일까요? 나이와 질환에 꼭 맞는 맞춤 특약을 찾고,<br className="hidden sm:block" /> 보험 가입을 강요하지 않는 객관적인 약관 분석 프로세스를 경험해 보세요.',
    step1Title: '기본 정보 동의',
    step1Desc: '최소한의 정보로 비교를 시작합니다.',
    step2Title: '맞춤 조건 입력',
    step2Desc: '아이의 건강 상태를 꼼꼼히 체크합니다.',
    step3Title: '결과 리포트',
    step3Desc: '최적의 보장 조건을 안내합니다.',
    disclaimer: '* 본 화면은 실제 API 연동이 아닌 가이드라인 안내를 위한 예시 화면입니다.',
    buttonText: '무료 분석 프로세스 시작하기'
  },
  trustBoard: {
    eyebrow: 'Trust Board',
    title: '함께 만드는 백조오브제의 기록',
    reviewsTitle: '먼저 함께해 본 이들의 이야기',
    reviewsLinkText: '후기 전체보기',
    noticesTitle: '새로운 소식',
    noticesLinkText: '공지 전체보기'
  },
  b2b: {
    text: '브랜드 입점, 병원/장례 제휴, 케어 키트 도입 등 파트너십이 필요하신가요?',
    linkText: 'B2B 제휴 안내 보기'
  }
};

// Keep backwards compatibility for existing imports
export const homeContent = defaultHomeSettings;

