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
  {
    slug: 'food',
    label: '푸드',
    aliases: ['식품', '사료', '간식', '식품·영양', '식사와 영양'],
    matchSlugs: ['food', 'food-nutrition', 'dining-and-nourish'],
  },
  {
    slug: 'nutrition',
    label: '영양',
    aliases: ['영양제', '건강과 케어', '건강과 관리'],
    matchSlugs: ['nutrition', 'wellness-and-care'],
  },
  {
    slug: 'care',
    label: '케어',
    aliases: [
      '구강과 위생', '위생용품', '향기와 위생', '그루밍과 브러싱', '미용용품',
    ],
    matchSlugs: ['care', 'fragrance-and-hygiene', 'grooming-and-brushing'],
  },
  {
    slug: 'fashion',
    label: '패션',
    aliases: ['패션과 액세서리'],
    matchSlugs: ['fashion', 'fashion-and-accessories'],
  },
  {
    slug: 'pet-loss',
    label: '펫로스',
    aliases: ['반려동물 장례', '추모', '기록과 소품'],
    matchSlugs: ['pet-loss', 'desk-and-stationery'],
  },
  {
    slug: 'life',
    label: '라이프',
    aliases: [
      '생활과 오브제', '생활용품', '주거와 미학', '놀이와 활동', '장난감', '산책용품',
      'living-and-objet', 'play-and-activity',
    ],
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

/**
 * 고객 확정 기본 카테고리 6개는 상품 수와 관계없이 같은 순서로 노출한다.
 * 기존 운영 데이터와 관리자 사용자 정의 카테고리는 실제 상품에 쓰이는 경우 뒤에 보완해
 * 링크와 저장 데이터의 하위 호환성을 유지한다.
 */
export function getDataBackedShopCategoryOptions(
  configuredValues: string[],
  productCategoryValues: string[],
): ShopCategoryFilter[] {
  const availableOptions = productCategoryValues
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map(toShopCategoryOption);
  const availableSlugs = new Set(availableOptions.map((option) => option.slug));

  const candidates = [
    ...shopCategoryFilters,
    ...configuredValues.map(toShopCategoryOption),
    ...availableOptions,
  ];

  return candidates.filter(
    (option, index, self) =>
      (shopCategoryFilters.some((category) => category.slug === option.slug) || availableSlugs.has(option.slug)) &&
      index === self.findIndex((candidate) => candidate.slug === option.slug),
  );
}
