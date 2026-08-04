// TODO(brand-data): 아래 매칭은 DB(brands 테이블)의 name/description이 아직 최신화되지
// 않은 8개 브랜드에 대한 임시 화면 표시 오버라이드다. 관리자 화면에서 해당 브랜드의
// name/description을 이 값으로 갱신하면 이 파일과 모든 호출부를 제거할 수 있다.
const BRAND_OVERRIDES: Array<{ match: (name: string) => boolean; name: string; description: string; category?: string }> = [
  {
    match: (name) => name.includes('노블독') || name.includes('노볼독'),
    name: '노볼독 (NobleDog)',
    description: '꾸준한 구강 관리를 고민하는 브랜드',
  },
  {
    match: (name) => name.includes('알로밍'),
    name: '알로밍 (ALLOMING)',
    description: '교감의 시간을 제품으로 설계하는 브랜드',
    category: '그루밍 · 케어',
  },
  {
    match: (name) => name.includes('오미프로'),
    name: '오미프로 (OMIPRO)',
    description: '몸속의 작은 변화까지 고민하는 영양 브랜드',
  },
  {
    match: (name) => name.includes('페네핏'),
    name: '페네핏 (PENEFIT)',
    description: '더 많은 아이들이 함께할 수 있는 식탁을 고민하는 브랜드',
  },
  {
    match: (name) => name.includes('써니사이드업') || name.includes('써니 사이드업') || name.includes('써니 사이어드'),
    name: '써니사이드업',
    description: '연구의 시작부터 생명을 먼저 생각하는 브랜드',
  },
  {
    match: (name) => name.includes('차콜스토리') || name.includes('챠콜스토리'),
    name: '차콜스토리 (Charcoal Story)',
    description: '숯의 가치를 반려동물에게 전하는 브랜드',
  },
  {
    match: (name) => name.includes('RE:펫') || name.includes('리펫'),
    name: 'RE:펫',
    description: '펫로스를 가장 가까이에서 경험한 작가가 만드는 브랜드',
  },
  {
    match: (name) => name.includes('메종슈슈'),
    name: '메종슈슈 (Maison Chouchou)',
    description: '입히는 대상이 아닌, 함께 살아가는 존재로 대하는 브랜드',
  },
];

export function getBrandOverride(brandName: string) {
  return BRAND_OVERRIDES.find((entry) => entry.match(brandName));
}

export function getCustomBrandDetails(brand: { name: string; description: string }) {
  const override = getBrandOverride(brand.name);
  return {
    finalName: override?.name ?? brand.name,
    finalDescription: override?.description ?? brand.description,
    finalCategory: override?.category,
  };
}
