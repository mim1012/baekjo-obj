// 카테고리 설정 타입 + 기본값. 서버(API route)와 클라이언트(Provider) 양쪽에서 안전하게 import 할 수
// 있도록 'use client' 가 없는 순수 모듈로 둔다. — CategorySettingsProvider.tsx('use client')에서
// import 하면 Next.js 가 client-reference 프록시로 치환해 서버(JSON.stringify)에서 {} 로 죽는다.

export interface BrandFilter {
  id: string;
  label: string;
}

/** 고객 스토어 필터에 보이는 항목. id는 상품 연결값이라 이름을 바꿔도 유지한다. */
export interface StoreFilterOption {
  id: string;
  label: string;
}

export interface StorePriceRange extends StoreFilterOption {
  minPrice?: number;
  maxPrice?: number;
}

export interface StoreRatingRange extends StoreFilterOption {
  minRating: number;
}

export interface CategorySettings {
  productCategories: StoreFilterOption[];
  petTypes: StoreFilterOption[];
  priceRanges: StorePriceRange[];
  ratingRanges: StoreRatingRange[];
  /** 기존 DB 컬럼 호환용 내부 분류. 현재 스토어 필터에는 표시하지 않는다. */
  lifestyleCategories: string[];
  brandFilters: BrandFilter[];
}

export const defaultCategorySettings: CategorySettings = {
  productCategories: [
    { id: 'food', label: '푸드' },
    { id: 'nutrition', label: '영양' },
    { id: 'care', label: '케어' },
    { id: 'fashion', label: '패션' },
    { id: 'pet-loss', label: '펫로스' },
    { id: 'life', label: '라이프' },
  ],
  petTypes: [
    { id: 'dog', label: '강아지' },
    { id: 'cat', label: '고양이' },
    { id: 'small', label: '소동물' },
  ],
  priceRanges: [
    { id: 'under-20000', label: '2만원 미만', maxPrice: 19_999 },
    { id: '20000-50000', label: '2-5만원', minPrice: 20_000, maxPrice: 49_999 },
    { id: '50000-100000', label: '5-10만원', minPrice: 50_000, maxPrice: 99_999 },
    { id: '100000-plus', label: '10만원 이상', minPrice: 100_000 },
  ],
  ratingRanges: [
    { id: '4', label: '4.0 이상', minRating: 4 },
    { id: '4.5', label: '4.5 이상', minRating: 4.5 },
  ],
  lifestyleCategories: ['식사와 영양', '건강과 관리', '향기와 위생', '주거와 미학', '놀이와 활동', '기록과 소품'],
  brandFilters: [
    { id: 'all', label: '전체 브랜드' },
    { id: 'recommended', label: '전문가 추천' },
    { id: 'new', label: '신규 입점' },
  ],
};

const LEGACY_PRODUCT_CATEGORY_LABELS: ReadonlySet<string> = new Set([
  '사료',
  '간식',
  '영양제',
  '위생용품',
  '생활용품',
  '장난감',
  '산책용품',
  '미용용품',
]);

const MERGED_PRODUCT_CATEGORIES = ['식품·영양', '케어', '패션', '펫로스', '라이프'];

const LEGACY_CATEGORY_IDS: Readonly<Record<string, string>> = {
  푸드: 'food',
  영양: 'nutrition',
  케어: 'care',
  패션: 'fashion',
  펫로스: 'pet-loss',
  라이프: 'life',
  '식품·영양': 'food',
  사료: 'food',
  간식: 'food',
  영양제: 'nutrition',
  위생용품: 'care',
  미용용품: 'care',
  생활용품: 'life',
  장난감: 'life',
  산책용품: 'life',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function legacyCategoryToOption(value: string, index: number): StoreFilterOption {
  return { id: LEGACY_CATEGORY_IDS[value] ?? `category-${index + 1}`, label: value };
}

function normalizeOption(value: unknown, index: number, prefix: string): StoreFilterOption | null {
  if (typeof value === 'string' && value.trim()) {
    return prefix === 'category'
      ? legacyCategoryToOption(value.trim(), index)
      : { id: `${prefix}-${index + 1}`, label: value.trim() };
  }
  if (!isRecord(value)) return null;
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  const label = typeof value.label === 'string' ? value.label.trim() : '';
  return id && label ? { id, label } : null;
}

function normalizeOptions(value: unknown, fallback: StoreFilterOption[], prefix: string): StoreFilterOption[] {
  if (!Array.isArray(value)) return fallback.map((item) => ({ ...item }));
  return value
    .map((item, index) => normalizeOption(item, index, prefix))
    .filter((item): item is StoreFilterOption => Boolean(item));
}

function normalizePriceRanges(value: unknown): StorePriceRange[] {
  if (!Array.isArray(value)) return defaultCategorySettings.priceRanges.map((item) => ({ ...item }));
  return value.flatMap((item, index) => {
    const option = normalizeOption(item, index, 'price');
    if (!option || !isRecord(item)) return [];
    const minPrice = typeof item.minPrice === 'number' && Number.isFinite(item.minPrice) ? item.minPrice : undefined;
    const maxPrice = typeof item.maxPrice === 'number' && Number.isFinite(item.maxPrice) ? item.maxPrice : undefined;
    return [{ ...option, minPrice, maxPrice }];
  });
}

function normalizeRatingRanges(value: unknown): StoreRatingRange[] {
  if (!Array.isArray(value)) return defaultCategorySettings.ratingRanges.map((item) => ({ ...item }));
  return value.flatMap((item, index) => {
    const option = normalizeOption(item, index, 'rating');
    if (!option || !isRecord(item) || typeof item.minRating !== 'number' || !Number.isFinite(item.minRating)) return [];
    return [{ ...option, minRating: item.minRating }];
  });
}

export function normalizeStoredCategorySettings(settings: unknown): CategorySettings {
  const stored = isRecord(settings) ? settings : {};
  const legacyProductCategories = Array.isArray(stored.productCategories)
    ? stored.productCategories.filter((item): item is string => typeof item === 'string')
    : [];
  const isLegacyProductCategorySet =
    legacyProductCategories.length > 0 &&
    legacyProductCategories.every((category) => LEGACY_PRODUCT_CATEGORY_LABELS.has(category));
  const isMergedProductCategorySet =
    legacyProductCategories.length === MERGED_PRODUCT_CATEGORIES.length &&
    legacyProductCategories.every((category, index) => category === MERGED_PRODUCT_CATEGORIES[index]);

  const productCategories = isLegacyProductCategorySet || isMergedProductCategorySet
    ? defaultCategorySettings.productCategories.map((item) => ({ ...item }))
    : normalizeOptions(stored.productCategories, defaultCategorySettings.productCategories, 'category');

  const lifestyleCategories = Array.isArray(stored.lifestyleCategories)
    ? stored.lifestyleCategories.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [...defaultCategorySettings.lifestyleCategories];
  const brandFilters = normalizeOptions(stored.brandFilters, defaultCategorySettings.brandFilters, 'brand');

  return {
    productCategories,
    petTypes: normalizeOptions(stored.petTypes, defaultCategorySettings.petTypes, 'pet'),
    priceRanges: normalizePriceRanges(stored.priceRanges),
    ratingRanges: normalizeRatingRanges(stored.ratingRanges),
    lifestyleCategories,
    brandFilters,
  };
}

export function isValidCategorySettings(value: unknown): value is CategorySettings {
  if (!isRecord(value)) return false;
  const validOptions = (items: unknown): boolean =>
    Array.isArray(items) &&
    items.length <= 100 &&
    items.every((item) =>
      isRecord(item) &&
      typeof item.id === 'string' && item.id.trim().length > 0 && item.id.length <= 100 &&
      typeof item.label === 'string' && item.label.trim().length > 0 && item.label.length <= 100,
    ) &&
    new Set(items.map((item) => (item as Record<string, unknown>).id)).size === items.length;

  if (!validOptions(value.productCategories) || !validOptions(value.petTypes) || !validOptions(value.brandFilters)) return false;
  if (!Array.isArray(value.lifestyleCategories) || !value.lifestyleCategories.every((item) => typeof item === 'string')) return false;
  if (!validOptions(value.priceRanges) || !validOptions(value.ratingRanges)) return false;

  const prices = value.priceRanges as unknown as StorePriceRange[];
  if (!prices.every((item) => {
    const min = item.minPrice;
    const max = item.maxPrice;
    return (min === undefined || (Number.isInteger(min) && min >= 0)) &&
      (max === undefined || (Number.isInteger(max) && max >= 0)) &&
      (min === undefined || max === undefined || min <= max);
  })) return false;

  return (value.ratingRanges as unknown as StoreRatingRange[])
    .every((item) => Number.isFinite(item.minRating) && item.minRating >= 0 && item.minRating <= 5);
}
