import { test, expect } from '@playwright/test';
import type { OrderItem, Shipment } from '@/types';
import {
  autoConfirmCutoff,
  deriveOrderDeliveryStatus,
  orderBrandIds,
  resolveShipmentStamps,
  validateAdminShipmentPatch,
} from '@/lib/shipments/derive';

// 픽스처 팩토리 — 스펙이 상태값에만 집중하도록 나머지 필드를 기본값으로 채운다.
function item(brandId: string | undefined, productId = 'p1'): OrderItem {
  return { productId, productName: '상품', quantity: 1, price: 1000, brandId };
}

function shipment(brandId: string, deliveryStatus: string, extra: Partial<Shipment> = {}): Shipment {
  return {
    id: `s-${brandId}`,
    orderId: 'o1',
    brandId,
    deliveryStatus,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  };
}

test.describe('orderBrandIds', () => {
  test('중복 브랜드를 제거해 유일 목록을 만든다', () => {
    expect(orderBrandIds([item('b1'), item('b2', 'p2'), item('b1', 'p3')])).toEqual(['b1', 'b2']);
  });

  test('item 하나라도 brandId가 없으면 null(레거시 주문 → 주문단위 파생 금지)', () => {
    expect(orderBrandIds([item('b1'), item(undefined, 'p2')])).toBeNull();
  });

  test('빈 주문은 null이 아니라 빈 배열', () => {
    expect(orderBrandIds([])).toEqual([]);
  });
});

test.describe('deriveOrderDeliveryStatus', () => {
  test('모든 번들 배송완료 → 배송완료', () => {
    const bids = ['b1', 'b2'];
    const ships = [shipment('b1', '배송완료'), shipment('b2', '배송완료')];
    expect(deriveOrderDeliveryStatus(bids, ships)).toBe('배송완료');
  });

  test('배송완료 + 구매확정 → 배송완료(구매확정은 배송완료 이상)', () => {
    const bids = ['b1', 'b2'];
    const ships = [shipment('b1', '배송완료'), shipment('b2', '구매확정')];
    expect(deriveOrderDeliveryStatus(bids, ships)).toBe('배송완료');
  });

  test('하나라도 배송중 → 배송중', () => {
    const bids = ['b1', 'b2'];
    const ships = [shipment('b1', '배송완료'), shipment('b2', '배송중')];
    expect(deriveOrderDeliveryStatus(bids, ships)).toBe('배송중');
  });

  test('배송완료 + 배송전(행 없음) 혼합 → 배송중', () => {
    // b2는 송장 행이 없어 rank 0(배송전) — every≥3 실패, some≥2(b1=배송완료) 성공.
    const bids = ['b1', 'b2'];
    const ships = [shipment('b1', '배송완료')];
    expect(deriveOrderDeliveryStatus(bids, ships)).toBe('배송중');
  });

  test('배송준비만 있으면 → 배송준비', () => {
    const bids = ['b1'];
    const ships = [shipment('b1', '배송준비')];
    expect(deriveOrderDeliveryStatus(bids, ships)).toBe('배송준비');
  });

  test('송장 행이 전혀 없으면 → 배송전', () => {
    expect(deriveOrderDeliveryStatus(['b1', 'b2'], [])).toBe('배송전');
  });

  test('미지 상태 문자열은 rank 0(배송전)으로 취급한다', () => {
    const ships = [shipment('b1', '반품요청')];
    expect(deriveOrderDeliveryStatus(['b1'], ships)).toBe('배송전');
  });
});

test.describe('validateAdminShipmentPatch', () => {
  test('정상 carrier는 통과한다', () => {
    expect(validateAdminShipmentPatch({ carrier: 'cj' })).toEqual({ carrier: 'cj' });
  });

  test("빈 carrier('')는 해제 신호로 통과한다", () => {
    expect(validateAdminShipmentPatch({ carrier: '' })).toEqual({ carrier: '' });
  });

  test('미지 carrier는 null', () => {
    expect(validateAdminShipmentPatch({ carrier: 'unknown' })).toBeNull();
  });

  test("'구매확정'은 관리자 PATCH에서 거부(null) — 고객 confirm/자동확정 크론만 만드는 종결 상태", () => {
    expect(validateAdminShipmentPatch({ deliveryStatus: '구매확정' })).toBeNull();
  });

  test("잘못된/빈('') deliveryStatus는 null", () => {
    expect(validateAdminShipmentPatch({ deliveryStatus: '없는상태' })).toBeNull();
    expect(validateAdminShipmentPatch({ deliveryStatus: '' })).toBeNull();
  });

  test('빈 객체는 null(반영할 필드 없음)', () => {
    expect(validateAdminShipmentPatch({})).toBeNull();
  });

  test('trackingNumber 101자는 null', () => {
    expect(validateAdminShipmentPatch({ trackingNumber: 'x'.repeat(101) })).toBeNull();
  });
});

test.describe('resolveShipmentStamps', () => {
  const NOW = '2026-07-17T00:00:00.000Z';

  test('배송중 전이 시 shippedAt만 찍는다', () => {
    expect(resolveShipmentStamps(undefined, '배송중', NOW)).toEqual({ shippedAt: NOW });
  });

  test('배송완료 직행(스탬프 없던 경우) 시 shippedAt+deliveredAt 동시', () => {
    expect(resolveShipmentStamps(undefined, '배송완료', NOW)).toEqual({
      shippedAt: NOW,
      deliveredAt: NOW,
    });
  });

  test('이미 shippedAt이 있으면 재스탬프하지 않는다', () => {
    const current = shipment('b1', '배송중', { shippedAt: '2026-07-01T00:00:00.000Z' });
    expect(resolveShipmentStamps(current, '배송중', NOW)).toEqual({});
  });

  test('역전이(배송준비)는 스탬프를 지우지 않고 {} 반환', () => {
    const current = shipment('b1', '배송완료', {
      shippedAt: '2026-07-01T00:00:00.000Z',
      deliveredAt: '2026-07-05T00:00:00.000Z',
    });
    expect(resolveShipmentStamps(current, '배송준비', NOW)).toEqual({});
  });

  test('구매확정 시 confirmedAt을 찍는다(선행 스탬프는 이미 있음)', () => {
    const current = shipment('b1', '배송완료', {
      shippedAt: '2026-07-01T00:00:00.000Z',
      deliveredAt: '2026-07-05T00:00:00.000Z',
    });
    expect(resolveShipmentStamps(current, '구매확정', NOW)).toEqual({ confirmedAt: NOW });
  });
});

test.describe('autoConfirmCutoff', () => {
  test('now 로부터 7일 이전 시각을 ISO로 돌려준다(D-2 기준)', () => {
    const now = new Date('2026-07-17T18:00:00.000Z');
    expect(autoConfirmCutoff(now, 7)).toBe('2026-07-10T18:00:00.000Z');
  });

  test('days=0 이면 now 그대로', () => {
    const now = new Date('2026-07-17T18:00:00.000Z');
    expect(autoConfirmCutoff(now, 0)).toBe('2026-07-17T18:00:00.000Z');
  });

  test('월 경계를 넘겨도 정확히 계산한다', () => {
    const now = new Date('2026-08-03T00:00:00.000Z');
    expect(autoConfirmCutoff(now, 7)).toBe('2026-07-27T00:00:00.000Z');
  });
});
