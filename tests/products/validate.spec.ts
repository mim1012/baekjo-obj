import { test, expect } from '@playwright/test';
import { validateProductFields, toInsertInput } from '@/lib/products/validate';

// 상품 입력 검증 순수 함수 스펙 — DB/브라우저/네트워크 불필요.
// 회귀 배경: detailBlocks 분기 누락 → 상세 에디터 PATCH가 빈 객체가 되어 400 (상세 본문 영구 미저장),
// description 필수 완화, 구매 정보 3종(deliveryEstimate/returnNotice/sellerName) 화이트리스트 누락.

function minimalRequiredBody(): Record<string, unknown> {
  return {
    brandId: 'b1',
    name: '상품명',
    price: 10000,
    category: '사료',
    lifestyleCategory: '실내',
    petType: 'dog',
    ageGroup: 'adult',
    image: '/products/p1.webp',
    stock: 10,
  };
}

test.describe('detailBlocks (핵심 회귀)', () => {
  test('text+image 블록이 있으면 통과하고 detailBlocks가 결과에 담긴다', () => {
    const result = validateProductFields(
      {
        detailBlocks: [
          { type: 'text', content: '본문' },
          { type: 'image', src: '/a.webp', alt: '대체' },
        ],
      },
      false,
    );
    expect(result).not.toBeNull();
    expect(Object.keys(result!).length).toBeGreaterThan(0);
    expect(result!.detailBlocks).toHaveLength(2);
  });

  test('빈 배열이면 통과하고 detailBlocks가 []로 담긴다 (전체 삭제 가능)', () => {
    const result = validateProductFields({ detailBlocks: [] }, false);
    expect(result).not.toBeNull();
    expect(result!.detailBlocks).toEqual([]);
  });

  test('image 블록에 src가 없으면 거부된다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'image' }] },
      false,
    );
    expect(result).toBeNull();
  });

  test('알 수 없는 type이면 거부된다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'video', url: 'https://example.com/v.mp4' }] },
      false,
    );
    expect(result).toBeNull();
  });

  test('블록이 201개면 상한 초과로 거부된다', () => {
    const blocks = Array.from({ length: 201 }, () => ({ type: 'text', content: 'x' }));
    const result = validateProductFields({ detailBlocks: blocks }, false);
    expect(result).toBeNull();
  });

  test('alt 없는 image 블록은 통과하고 결과에 alt 키가 없다', () => {
    const result = validateProductFields(
      { detailBlocks: [{ type: 'image', src: '/a.webp' }] },
      false,
    );
    expect(result).not.toBeNull();
    expect(result!.detailBlocks![0]).not.toHaveProperty('alt');
  });
});

test.describe('description 완화', () => {
  test('생성 시 description을 빼도 통과하고 결과 description은 빈 문자열이다', () => {
    const body = minimalRequiredBody();
    const result = validateProductFields(body, true);
    expect(result).not.toBeNull();
    expect(result!.description).toBe('');
  });

  test('최소 필수 바디는 toInsertInput()이 null을 반환하지 않는다 (실제 생성 경로 통과)', () => {
    const body = minimalRequiredBody();
    const result = validateProductFields(body, true);
    expect(result).not.toBeNull();
    const insertInput = toInsertInput(result!);
    expect(insertInput).not.toBeNull();
  });

  test('lifestyleCategory가 빈 문자열이면 여전히 거부된다', () => {
    const body = { ...minimalRequiredBody(), lifestyleCategory: '' };
    const result = validateProductFields(body, true);
    expect(result).toBeNull();
  });

  test('image가 빈 문자열이면 여전히 거부된다', () => {
    const body = { ...minimalRequiredBody(), image: '' };
    const result = validateProductFields(body, true);
    expect(result).toBeNull();
  });
});

test.describe('구매 정보 3종', () => {
  test('deliveryEstimate, returnNotice, sellerName 모두 결과에 담긴다', () => {
    const result = validateProductFields(
      {
        deliveryEstimate: '결제 후 2~3일',
        returnNotice: '수령 후 7일',
        sellerName: '백조오브제',
      },
      false,
    );
    expect(result).not.toBeNull();
    expect(result!.deliveryEstimate).toBe('결제 후 2~3일');
    expect(result!.returnNotice).toBe('수령 후 7일');
    expect(result!.sellerName).toBe('백조오브제');
  });
});

test.describe('기존 계약 회귀 방지', () => {
  test('salePrice가 price보다 크면 거부된다', () => {
    const result = validateProductFields({ price: 1000, salePrice: 2000 }, false);
    expect(result).toBeNull();
  });

  test('알 수 없는 필드(id, createdAt)는 결과에서 드롭된다 (mass-assignment 차단)', () => {
    const result = validateProductFields(
      { name: '상품', id: '해커가_지정한_id', createdAt: '2020-01-01' },
      false,
    );
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty('id');
    expect(result).not.toHaveProperty('createdAt');
  });
});
