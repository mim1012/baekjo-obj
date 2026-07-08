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
    signatureText: string;
    bannerText: string;
  };
  curation: {
    badge: string;
    title: string;
    description: string;
    button1Text: string;
    button2Text: string;
  };
  insuranceTitle: string;
}

export const defaultHomeSettings: HomeSettings = {
  intro: {
    videoSrc: '/videos/baekjo-objet.mp4',
  },
  howToStart: {
    title: '백조오브제를<br />시작하는 3가지 방법',
    description: '우리 아이의 라이프에 꼭 맞는<br />선택을 도와드립니다.',
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
    signatureText: '엄격한 기준으로 선별된 브랜드만,<br />백조오브제에서 만나보세요.',
    bannerText: '백조오브제의 모든 브랜드는 검증 기준을 통과해야만 소개됩니다.'
  },
  curation: {
    badge: 'Custom Curation',
    title: '반려동물 고민에<br />맞춘 큐레이션',
    description: '우리 아이의 상태를 알려주시면 가장 완벽한 관리 방향을 설계해 드립니다. 무엇부터 시작할지 막막하시다면 맞춤 진단을, 이미 필요한 고민이 있다면 고민별 가이드를 확인해 보세요.',
    button1Text: '1분 맞춤 진단 시작',
    button2Text: '모든 고민 살펴보기'
  },
  insuranceTitle: '우리 아이에게 꼭 맞는 <br className="hidden sm:block" />맞춤 펫보험 분석',
};

// Keep backwards compatibility for existing imports
export const homeContent = defaultHomeSettings;
