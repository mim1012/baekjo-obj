import { expect, test } from '@playwright/test';
import {
  isValidProductPetTypeValue,
  parseProductPetTypes,
  productSupportsPetType,
  serializeProductPetTypes,
} from '@/lib/products/petTypes';
import { validateProductFields } from '@/lib/products/validate';

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
});
