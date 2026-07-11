export interface ShopCategoryFilter {
  slug: string;
  label: string;
  aliases?: string[];
}

/**
 * 쇼핑·헤더·상품 데이터가 함께 사용하는 공개 카테고리 기준입니다.
 * 기존 운영 데이터의 한글 카테고리도 aliases로 받아 기존 링크가 끊기지 않게 합니다.
 */
export const shopCategoryFilters: ShopCategoryFilter[] = [
  { slug: 'dining-and-nourish', label: '식사와 영양', aliases: ['사료', '간식'] },
  { slug: 'wellness-and-care', label: '건강과 케어', aliases: ['영양제', '건강과 관리'] },
  { slug: 'fragrance-and-hygiene', label: '구강과 위생', aliases: ['위생용품', '향기와 위생'] },
  { slug: 'grooming-and-brushing', label: '그루밍과 브러싱', aliases: ['미용용품'] },
  { slug: 'living-and-objet', label: '생활과 오브제', aliases: ['생활용품', '주거와 미학'] },
  { slug: 'fashion-and-accessories', label: '패션과 액세서리' },
  { slug: 'play-and-activity', label: '놀이와 활동', aliases: ['장난감', '산책용품'] },
  { slug: 'desk-and-stationery', label: '기록과 소품' },
];

export function resolveShopCategory(value?: string): ShopCategoryFilter | undefined {
  if (!value || value === 'all') return undefined;

  return shopCategoryFilters.find(
    (category) => category.slug === value || category.label === value || category.aliases?.includes(value),
  );
}

export function normalizeShopCategory(value?: string): string | undefined {
  if (!value || value === 'all') return value;
  return resolveShopCategory(value)?.slug ?? value;
}

export function toShopCategoryOption(value: string): ShopCategoryFilter {
  return resolveShopCategory(value) ?? { slug: value, label: value };
}
