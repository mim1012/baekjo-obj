import { test, expect } from '@playwright/test';
import type { OrderItem } from '@/types';
import {
  TIMELINE_STEPS,
  timelineRank,
  timelineFill,
  groupOrderItemsByBundle,
} from '@/lib/shipments/timeline';

function item(brandId: string | undefined, productId = 'p1'): OrderItem {
  return { productId, productName: '상품', quantity: 1, price: 1000, brandId };
}

test.describe('TIMELINE_STEPS', () => {
  test('배송전→구매확정 5단계를 순서대로 담는다', () => {
    expect([...TIMELINE_STEPS]).toEqual(['배송전', '배송준비', '배송중', '배송완료', '구매확정']);
  });
});

test.describe('timelineRank', () => {
  test('각 단계의 서열을 0~4로 매긴다', () => {
    expect(timelineRank('배송전')).toBe(0);
    expect(timelineRank('배송준비')).toBe(1);
    expect(timelineRank('배송중')).toBe(2);
    expect(timelineRank('배송완료')).toBe(3);
    expect(timelineRank('구매확정')).toBe(4);
  });

  test('undefined·미지·레거시 상태는 rank 0(배송전)', () => {
    expect(timelineRank(undefined)).toBe(0);
    expect(timelineRank('결제완료')).toBe(0);
    expect(timelineRank('반품요청')).toBe(0);
  });
});

test.describe('timelineFill', () => {
  test('현재 단계까지(포함) 채운다', () => {
    expect(timelineFill('배송중')).toEqual([true, true, true, false, false]);
  });

  test('구매확정이면 5단계 전부 채움', () => {
    expect(timelineFill('구매확정')).toEqual([true, true, true, true, true]);
  });

  test('미지·레거시 상태는 첫 단계(배송전)만 채움', () => {
    expect(timelineFill('결제완료')).toEqual([true, false, false, false, false]);
    expect(timelineFill(undefined)).toEqual([true, false, false, false, false]);
  });
});

test.describe('groupOrderItemsByBundle', () => {
  test('브랜드별로 묶고 첫 등장 순서를 보존한다', () => {
    const bundles = groupOrderItemsByBundle([
      item('b1', 'p1'),
      item('b2', 'p2'),
      item('b1', 'p3'),
    ]);
    expect(bundles.map((b) => b.brandId)).toEqual(['b1', 'b2']);
    expect(bundles[0].items.map((i) => i.productId)).toEqual(['p1', 'p3']);
    expect(bundles[1].items.map((i) => i.productId)).toEqual(['p2']);
  });

  test('brandId 없는 레거시 아이템은 하나의 null 번들로 접힌다', () => {
    const bundles = groupOrderItemsByBundle([item(undefined, 'p1'), item(undefined, 'p2')]);
    expect(bundles).toHaveLength(1);
    expect(bundles[0].brandId).toBeNull();
    expect(bundles[0].items).toHaveLength(2);
  });

  test('브랜드 번들과 레거시 번들이 섞여도 각각 유지된다', () => {
    const bundles = groupOrderItemsByBundle([item('b1'), item(undefined, 'p2'), item('b1', 'p3')]);
    expect(bundles.map((b) => b.brandId)).toEqual(['b1', null]);
    expect(bundles[0].items).toHaveLength(2);
    expect(bundles[1].items).toHaveLength(1);
  });

  test('빈 주문은 빈 번들 목록', () => {
    expect(groupOrderItemsByBundle([])).toEqual([]);
  });
});
