export interface ShopCategoryFilter {
  slug: string;
  label: string;
  aliases?: string[];
  matchSlugs?: string[];
}

/**
 * 쇼핑·헤더·상품 데이터가 함께 사용하는 공개 카테고리 기준입니다.
 * 기존 운영 데이터의 한글 카테고리도 aliases로 받아 기존 링크가 끊기지 않게 합니다.
 */
export const shopCategoryFilters: ShopCategoryFilter[] = [
  { slug: 'food', label: '푸드', aliases: ['식사와 영양', '사료', '간식'], matchSlugs: ['food', 'dining-and-nourish'] },
  { slug: 'nutrition', label: '영양', aliases: ['건강과 케어', '영양제', '건강과 관리'], matchSlugs: ['nutrition', 'wellness-and-care'] },
  {
    slug: 'care',
    label: '케어',
    aliases: ['구강과 위생', '향기와 위생', '그루밍과 브러싱', '위생용품', '미용용품'],
    matchSlugs: ['care', 'fragrance-and-hygiene', 'grooming-and-brushing'],
  },
  { slug: 'fashion', label: '패션', aliases: ['패션과 액세서리'], matchSlugs: ['fashion', 'fashion-and-accessories'] },
  { slug: 'pet-loss', label: '펫로스', aliases: ['기록과 소품'], matchSlugs: ['pet-loss', 'desk-and-stationery'] },
  {
    slug: 'life',
    label: '라이프',
    aliases: ['생활과 오브제', '주거와 미학', '놀이와 활동', '장난감', '산책용품', '생활용품'],
    matchSlugs: ['life', 'living-and-objet', 'play-and-activity'],
  },
];

export function resolveShopCategory(value?: string): ShopCategoryFilter | undefined {
  if (!value || value === 'all') return undefined;

  return shopCategoryFilters.find(
    (category) =>
      category.slug === value ||
      category.label === value ||
      category.aliases?.includes(value) ||
      category.matchSlugs?.includes(value),
  );
}

export function normalizeShopCategory(value?: string): string | undefined {
  if (!value || value === 'all') return value;
  return resolveShopCategory(value)?.slug ?? value;
}

export function getShopCategorySlugs(value?: string): string[] | undefined {
  const category = resolveShopCategory(value);
  return category ? [...(category.matchSlugs ?? [category.slug])] : undefined;
}

export function sortShopCategoryOptions(categories: ShopCategoryFilter[]): ShopCategoryFilter[] {
  const order = new Map(shopCategoryFilters.map((category, index) => [category.slug, index]));
  return [...categories].sort(
    (a, b) => (order.get(a.slug) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.slug) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function toShopCategoryOption(value: string): ShopCategoryFilter {
  return resolveShopCategory(value) ?? { slug: value, label: value };
}
