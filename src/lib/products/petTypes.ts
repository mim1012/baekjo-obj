const LEGACY_BOTH_PET_TYPES = ['dog', 'cat'] as const;
const MAX_PRODUCT_PET_TYPES = 50;
const MAX_PET_TYPE_ID_LENGTH = 100;

function uniqueIds(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const value of values) {
    const id = value.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

/**
 * products.pet_type(text)의 단일값·기존 both·복수 JSON 값을 한 목록으로 읽는다.
 * 기존 `both`는 지금까지의 의미를 유지해 강아지와 고양이 두 항목으로 해석한다.
 */
export function parseProductPetTypes(value: string | null | undefined): string[] {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return [];
  if (raw === 'both') return [...LEGACY_BOTH_PET_TYPES];

  if (raw.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) return [];
      return uniqueIds(parsed);
    } catch {
      return [];
    }
  }

  return [raw];
}

/** 단일 선택은 기존 문자열, 여러 선택은 JSON 문자열로 저장해 기존 text 컬럼과 호환한다. */
export function serializeProductPetTypes(values: readonly string[]): string {
  const ids = uniqueIds(values);
  if (ids.length === 0) return '';
  if (
    ids.length === LEGACY_BOTH_PET_TYPES.length &&
    LEGACY_BOTH_PET_TYPES.every((id) => ids.includes(id))
  ) {
    return 'both';
  }
  return ids.length === 1 ? ids[0] : JSON.stringify(ids);
}

export function productSupportsPetType(value: string | null | undefined, petTypeId: string): boolean {
  return parseProductPetTypes(value).includes(petTypeId);
}

export function isValidProductPetTypeValue(value: string): boolean {
  const ids = parseProductPetTypes(value);
  return ids.length > 0 &&
    ids.length <= MAX_PRODUCT_PET_TYPES &&
    ids.every((id) => id.length <= MAX_PET_TYPE_ID_LENGTH);
}
