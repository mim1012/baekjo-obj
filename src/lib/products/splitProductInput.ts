import type { Product } from '@/types';

// Product 컬럼 매핑 — DB 접근이 없는 순수 로직이라 repo.ts(서버 전용, 'server-only' 마커)와
// 분리한다. repo.ts에서 그대로 re-export해 호출부는 바뀌지 않는다.
const PRODUCT_COLUMN_MAP: Partial<Record<keyof Product, string>> = {
  brandId: 'brand_id',
  name: 'name',
  price: 'price',
  salePrice: 'sale_price',
  rating: 'rating',
  reviewCount: 'review_count',
  category: 'category',
  categorySlug: 'category_slug',
  lifestyleCategory: 'lifestyle_category',
  petType: 'pet_type',
  stock: 'stock',
  isVisible: 'is_visible',
  isBest: 'is_best',
  isRecommended: 'is_recommended',
};

/** Product(전체 또는 일부)를 컬럼 값과 detail jsonb 조각으로 분리한다. */
export function splitProductInput(input: Partial<Product>): {
  columns: Record<string, unknown>;
  detail: Record<string, unknown>;
} {
  const columns: Record<string, unknown> = {};
  const detail: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || key === 'id') continue;
    const columnName = PRODUCT_COLUMN_MAP[key as keyof Product];
    if (columnName) {
      // brand_id 는 FK(on delete set null). 브랜드가 삭제된 상품은 rowToProduct 에서 '' 로 읽혀,
      // 노출-전용 read-modify-write 시 brand_id='' 로 되써져 23503(invalid-brand)이 났다.
      // 빈 문자열은 "브랜드 없음"이므로 NULL 로 저장한다.
      columns[columnName] = columnName === 'brand_id' && value === '' ? null : value;
    } else {
      detail[key] = value;
    }
  }
  return { columns, detail };
}

export function mergeProductForStorage<T extends Product>(
  existing: T,
  patch: Partial<Omit<Product, 'id'>>,
): T {
  const merged = { ...existing, ...patch, id: existing.id } as T;

  // 적립 비활성화는 pointsRate 제거까지 포함하는 계약이다. detail jsonb 는 전체 재작성되므로
  // undefined 로 정규화하면 splitProductInput 이 키를 생략하고 기존 detail.pointsRate 가 사라진다.
  if (patch.pointsEnabled === false) {
    merged.pointsRate = undefined;
  }

  return merged;
}
