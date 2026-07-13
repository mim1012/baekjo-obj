// 카테고리 설정 타입 + 기본값. 서버(API route)와 클라이언트(Provider) 양쪽에서 안전하게 import 할 수
// 있도록 'use client' 가 없는 순수 모듈로 둔다. — CategorySettingsProvider.tsx('use client')에서
// import 하면 Next.js 가 client-reference 프록시로 치환해 서버(JSON.stringify)에서 {} 로 죽는다.

export interface BrandFilter {
  id: string;
  label: string;
}

export interface CategorySettings {
  productCategories: string[];
  lifestyleCategories: string[];
  brandFilters: BrandFilter[];
}

export const defaultCategorySettings: CategorySettings = {
  productCategories: [
    '식사와 영양',
    '건강과 케어',
    '구강과 위생',
    '그루밍과 브러싱',
    '생활과 오브제',
    '패션과 액세서리',
    '놀이와 활동',
    '기록과 소품',
  ],
  lifestyleCategories: [
    '초보집사 필수품',
    '노령견 케어',
    '실내 활동가',
    '프로 산책러',
    '알러지 케어',
  ],
  brandFilters: [
    { id: 'all', label: '전체 브랜드' },
    { id: 'recommended', label: '전문가 추천' },
    { id: 'new', label: '신규 입점' },
  ],
};
