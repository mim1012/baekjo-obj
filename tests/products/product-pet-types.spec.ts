import { expect, test } from '@playwright/test';
import {
  isValidProductPetTypeValue,
  parseProductPetTypes,
  productSupportsPetType,
  serializeProductPetTypes,
} from '@/lib/products/petTypes';
import { validateProductFields } from '@/lib/products/validate';
import { filterProducts } from '@/lib/filters';
import {
  defaultCategorySettings,
  normalizeStoredCategorySettings,
} from '@/lib/categorySettings/config';
import type { Product } from '@/types';

test.describe('상품 반려동물 복수 선택 저장 계약', () => {
  test('기존 both 상품은 강아지와 고양이 두 체크로 읽는다', () => {
    expect(parseProductPetTypes('both')).toEqual(['dog', 'cat']);
    expect(productSupportsPetType('both', 'dog')).toBe(true);
    expect(productSupportsPetType('both', 'cat')).toBe(true);
    expect(productSupportsPetType('both', 'small')).toBe(false);
  });

  test('관리자가 추가한 항목을 포함한 복수 선택을 text 컬럼용 JSON으로 왕복한다', () => {
    const stored = serializeProductPetTypes(['dog', 'pet-bird', 'small']);
    expect(stored).toBe('["dog","pet-bird","small"]');
    expect(parseProductPetTypes(stored)).toEqual(['dog', 'pet-bird', 'small']);
    expect(productSupportsPetType(stored, 'pet-bird')).toBe(true);
  });

  test('강아지와 고양이만 선택하면 기존 both 값으로 저장한다', () => {
    expect(serializeProductPetTypes(['dog', 'cat'])).toBe('both');
    expect(serializeProductPetTypes(['cat', 'dog'])).toBe('both');
  });

  test('빈 선택과 깨진 복수값은 서버 검증에서 거부한다', () => {
    expect(isValidProductPetTypeValue('')).toBe(false);
    expect(isValidProductPetTypeValue('["dog",3]')).toBe(false);
    expect(validateProductFields({ petType: '' }, false)).toBeNull();
    expect(validateProductFields({ petType: '["dog",3]' }, false)).toBeNull();
  });

  // --- U3 추가 케이스: 단일값 바이트 동일 왕복 ---
  test('레거시 단일값은 파싱·재직렬화해도 원문과 바이트 동일하다', () => {
    for (const legacy of ['dog', 'cat', 'small']) {
      expect(serializeProductPetTypes(parseProductPetTypes(legacy))).toBe(legacy);
    }
  });

  // --- U3 추가 케이스: filters.ts가 productSupportsPetType으로 복수 저장값을 받아들인다 ---
  test('filterProducts는 복수 선택 상품을 각 선택 항목으로 조회할 수 있다', () => {
    const base: Product = {
      id: 'p-multi',
      brandId: 'b-test',
      brandName: '테스트 브랜드',
      name: '멀티 펫타입 상품',
      price: 10_000,
      rating: 4,
      reviewCount: 0,
      category: '푸드',
      categorySlug: 'food',
      lifestyleCategory: '식사와 영양',
      concernTags: [],
      petType: serializeProductPetTypes(['dog', 'small']) as Product['petType'],
      ageGroup: 'all',
      image: '',
      stock: 1,
      description: '',
      tags: [],
      isBest: false,
      isRecommended: false,
    };

    expect(filterProducts([base], { petType: 'small' }).map((p) => p.id)).toEqual(['p-multi']);
    expect(filterProducts([base], { petType: 'dog' }).map((p) => p.id)).toEqual(['p-multi']);
    expect(filterProducts([base], { petType: 'cat' })).toEqual([]);
  });

  // --- U3 추가 케이스: category settings의 petTypes 관용 정규화는 slug를 재계산하지 않는다 ---
  test('카테고리 설정은 petTypes를 평문 문자열로 저장해도 slug를 새로 만들지 않고 그대로 옮긴다', () => {
    const savedSettings = {
      ...defaultCategorySettings,
      petTypes: ['강아지', '고양이'],
    } as unknown as typeof defaultCategorySettings;

    const normalized = normalizeStoredCategorySettings(savedSettings);
    // normalizeShopCategory는 카테고리 슬러그만 알고 있어 반려동물 라벨은 매칭되지 않으므로,
    // 원문 라벨이 그대로 id로 옮겨진다 — 임의로 새 slug를 만들지 않는다.
    expect(normalized.petTypes).toEqual([
      { id: '강아지', label: '강아지' },
      { id: '고양이', label: '고양이' },
    ]);
  });

  test('카테고리 설정은 petTypes가 이미 {id,label}이면 그대로 유지한다', () => {
    const savedSettings = {
      ...defaultCategorySettings,
      petTypes: [{ id: 'dog', label: '강아지' }],
    };

    expect(normalizeStoredCategorySettings(savedSettings).petTypes).toEqual([
      { id: 'dog', label: '강아지' },
    ]);
  });

  test('카테고리 설정에 petTypes가 없으면 기본 강아지/고양이/소동물로 채운다', () => {
    const savedSettings = { ...defaultCategorySettings } as unknown as Record<string, unknown>;
    delete savedSettings.petTypes;

    expect(
      normalizeStoredCategorySettings(savedSettings as unknown as typeof defaultCategorySettings).petTypes,
    ).toEqual(defaultCategorySettings.petTypes);
  });
});

// --- U3 추가 케이스: 0168 마이그레이션은 idempotent하게 drop 후 재생성하고 40001을 쓰지 않는다 ---
test.describe('0168 마이그레이션 계약', () => {
  test('drop constraint if exists 뒤 재생성하며 40001 SQLSTATE를 쓰지 않는다', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const sql = fs.readFileSync(
      path.resolve(__dirname, '..', '..', 'supabase', 'migrations', '0168_product_pet_type_multi_value.sql'),
      'utf8',
    );

    expect(sql).toContain('drop constraint if exists products_pet_type_check');
    expect(sql).toContain('add constraint products_pet_type_check');
    expect(sql).not.toContain('40001');
  });
});

// 2026-09-15 리뷰 비차단 지적 2: normalizePetType(src/lib/products/repo.ts)가 유니온 밖 id를
// 이제 그대로 통과시킨다(예전엔 전부 'both'로 접혀 모든 펫 필터에 잡혔다). 0168이 CHECK 제약을
// 풀어 앞으로 자유 텍스트 pet_type이 들어올 수 있으므로, 그런 상품이 "펫 필터 없음"·"전체" 보기에서
// 조용히 사라지지 않아야 한다(단, 특정 펫 필터에는 당연히 안 걸린다).
function buildProduct(petType: string): Product {
  return {
    id: `p-${petType}`,
    brandId: 'b-test',
    brandName: '테스트 브랜드',
    name: '알 수 없는 펫타입 상품',
    price: 10_000,
    rating: 4,
    reviewCount: 0,
    category: '푸드',
    categorySlug: 'food',
    lifestyleCategory: '식사와 영양',
    concernTags: [],
    petType: petType as Product['petType'],
    ageGroup: 'all',
    image: '',
    stock: 1,
    description: '',
    tags: [],
    isBest: false,
    isRecommended: false,
  };
}

test.describe('공개 필터(filterProducts) — 유니온 밖 pet_type 값은 숨겨지지 않는다', () => {
  test('알려진 펫 id가 하나도 없는 상품도 필터 미지정(펫 필터 없음)에서는 보인다', () => {
    const product = buildProduct('exotic-reptile');
    expect(filterProducts([product], {}).map((p) => p.id)).toEqual([product.id]);
  });

  test('알려진 펫 id가 하나도 없는 상품도 "전체"(petType=all) 보기에서는 보인다', () => {
    const product = buildProduct('exotic-reptile');
    expect(filterProducts([product], { petType: 'all' }).map((p) => p.id)).toEqual([product.id]);
  });

  test('알려진 펫 id가 하나도 없는 상품은 특정 펫 필터(dog)에는 걸리지 않는다', () => {
    const product = buildProduct('exotic-reptile');
    expect(filterProducts([product], { petType: 'dog' })).toEqual([]);
  });

  test('빈 문자열 pet_type(both 폴백 대상)도 필터 미지정·전체 보기에서 사라지지 않는다', () => {
    // normalizePetType은 빈/깨진 원문을 'both'로 방어하지만, 이 스펙은 그 정규화 이전 값(빈 문자열)이
    // filterProducts 단계에서도 안전한지(예외 없이 '보임' 처리) 직접 확인한다.
    const product = buildProduct('');
    expect(filterProducts([product], {}).map((p) => p.id)).toEqual([product.id]);
    expect(filterProducts([product], { petType: 'all' }).map((p) => p.id)).toEqual([product.id]);
  });
});
