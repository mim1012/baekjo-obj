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
