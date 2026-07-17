import { test, expect } from '@playwright/test';
import { decideShipmentConfirm, isTerminalShipment } from '@/lib/shipments/derive';
import type { Shipment } from '@/types';

// 구매확정 가드 순수 판정 스펙 — W4(구매확정 후퇴 가드 + 미결제 확정 차단).
// 브라우저·DB 불필요(순수 함수). DB 레벨 경합 안전(CAS)은 confirm-guard.db.spec.ts가 잠근다.

function shipment(over: Partial<Shipment> = {}): Shipment {
  return {
    id: 's1',
    orderId: 'o1',
    brandId: 'b1',
    deliveryStatus: '배송완료',
    createdAt: '2026-07-17T00:00:00Z',
    ...over,
  };
}

test.describe('decideShipmentConfirm — 결제·멱등 사전 판정', () => {
  test('결제완료 + 배송완료 송장이면 proceed(조건부 UPDATE 시도 허용)', () => {
    expect(decideShipmentConfirm('결제완료', shipment({ deliveryStatus: '배송완료' }))).toBe('proceed');
  });

  test('결제완료 + 송장 행이 아직 없어도 proceed(confirmShipmentIfDelivered가 0행으로 걸러냄)', () => {
    expect(decideShipmentConfirm('결제완료', undefined)).toBe('proceed');
  });

  test('미결제(결제대기) 주문의 미확정 송장은 blocked-unpaid — 미결제 구매확정 차단', () => {
    expect(decideShipmentConfirm('결제대기', shipment({ deliveryStatus: '배송완료' }))).toBe('blocked-unpaid');
  });

  test('환불(결제취소) 주문의 미확정 송장도 blocked-unpaid', () => {
    expect(decideShipmentConfirm('결제취소', shipment({ deliveryStatus: '배송중' }))).toBe('blocked-unpaid');
  });

  test('이미 구매확정된 송장은 결제상태와 무관하게 idempotent-ok(재확정 비파괴)', () => {
    expect(decideShipmentConfirm('결제완료', shipment({ deliveryStatus: '구매확정' }))).toBe('idempotent-ok');
    // ⭐ 확정 후 환불된 주문의 재확정 클릭이 blocked-unpaid로 퇴행하면 안 된다(멱등 판정이 결제 검사보다 앞).
    expect(decideShipmentConfirm('결제취소', shipment({ deliveryStatus: '구매확정' }))).toBe('idempotent-ok');
  });
});

test.describe('isTerminalShipment — 관리자 PATCH 후퇴 사전 차단', () => {
  test('delivery_status가 구매확정이면 종결', () => {
    expect(isTerminalShipment(shipment({ deliveryStatus: '구매확정' }))).toBe(true);
  });

  test('confirmed_at이 찍혔으면(설령 status가 어긋나 있어도) 종결로 본다', () => {
    expect(isTerminalShipment(shipment({ deliveryStatus: '배송중', confirmedAt: '2026-07-17T01:00:00Z' }))).toBe(true);
  });

  test('배송완료 등 미확정 행은 종결이 아니다(정상 전이 허용)', () => {
    expect(isTerminalShipment(shipment({ deliveryStatus: '배송완료' }))).toBe(false);
    expect(isTerminalShipment(shipment({ deliveryStatus: '배송중' }))).toBe(false);
  });

  test('송장 행이 없으면 종결이 아니다', () => {
    expect(isTerminalShipment(undefined)).toBe(false);
  });
});
