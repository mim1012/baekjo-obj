import { test, expect } from '@playwright/test';
import { splitProductInput } from '@/lib/products/splitProductInput';

// splitProductInput 회귀 스펙 — 순수 함수, 브라우저·DB·네트워크 불필요.
// 배경: products.brand_id 는 FK(on delete set null). 브랜드가 삭제된 상품은 rowToProduct 에서
// '' 로 읽히고, 노출-전용(read-modify-write) PATCH가 그 값을 다시 brand_id='' 로 써서
// Postgres 23503(FK 위반) → {"error":"invalid-brand"} 로 숨김/수정이 막혔다.
// splitProductInput 이 brand_id 빈 문자열을 NULL 로 정규화해 FK(on delete set null)를 만족시킨다.

test.describe('splitProductInput — brand_id 정규화', () => {
  test('brandId가 빈 문자열이면 brand_id 컬럼이 null로 정규화된다', () => {
    const { columns } = splitProductInput({ brandId: '' });
    expect(columns.brand_id).toBeNull();
  });

  test('유효한 brandId는 그대로 보존된다', () => {
    const { columns } = splitProductInput({ brandId: 'b1' });
    expect(columns.brand_id).toBe('b1');
  });

  test('노출 여부만 수정하는 패치는 brand_id 컬럼을 건드리지 않는다', () => {
    const { columns } = splitProductInput({ isVisible: false });
    expect(columns.is_visible).toBe(false);
    expect('brand_id' in columns).toBe(false);
  });
});

// PR3: petType 다중 선택(JSON 문자열)·concernTags(태그 slug)를 새로 다루지만, 이 파일은 컬럼
// 매핑만 하는 순수 함수라 두 값 모두 "그 자체로 통째 위임"이면 충분하다 — 직렬화/역직렬화는
// @/lib/products/petTypes(U5가 호출부에서 미리 처리)가 담당하고, 여긴 관여하지 않는다.
test.describe('splitProductInput — petType/concernTags 통째 위임(PR3 회귀 방지)', () => {
  test('petType 복수 선택 JSON 문자열도 pet_type 컬럼에 그대로 담긴다', () => {
    const petType = JSON.stringify(['dog', 'small']);
    const { columns } = splitProductInput({ petType });
    expect(columns.pet_type).toBe(petType);
  });

  test('petType 레거시 both도 pet_type 컬럼에 그대로 담긴다', () => {
    const { columns } = splitProductInput({ petType: 'both' });
    expect(columns.pet_type).toBe('both');
  });

  test('concernTags는 컬럼이 아니라 detail(jsonb)에 담긴다', () => {
    const { columns, detail } = splitProductInput({ concernTags: ['skin', 'joint'] });
    expect('concern_tags' in columns).toBe(false);
    expect(detail.concernTags).toEqual(['skin', 'joint']);
  });
});
