import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { brandDeliveryFee, brandItems, reservedQuantityByLine } from '../../src/lib/orders/actionRequests';
import type { Order } from '../../src/types';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const order = (): Order => ({
  id: 'order-1', customerName: '고객', phone: '010', address: '주소',
  items: [
    { productId: 'p1', productName: '브랜드 A 상품', brandId: 'brand-a', quantity: 2, price: 1000 },
    { productId: 'p2', productName: '브랜드 B 상품', brandId: 'brand-b', quantity: 1, price: 2000 },
  ], totalPrice: 4000, deliveryFee: 5000,
  deliveryFeeBreakdown: [
    { brandId: 'brand-a', subtotal: 2000, shippingFee: 3000, appliedDeliveryFee: 3000, isFreeShipping: false },
    { brandId: 'brand-b', subtotal: 2000, shippingFee: 2000, appliedDeliveryFee: 2000, isFreeShipping: false },
  ],
  paymentMethod: '신용카드', orderStatus: '주문접수', paymentStatus: '결제완료', deliveryStatus: '배송전', createdAt: '2026-01-01',
});

test.describe('브랜드별 취소·환불 요청 계산', () => {
  test('브랜드 상품만 추려 환불 요청 금액에 해당 브랜드 배송비를 더한다', () => {
    const current = order();
    const items = brandItems(current, 'brand-a');
    expect(items).toHaveLength(1);
    expect(items[0]?.amount).toBe(2000);
    expect(brandDeliveryFee(current, 'brand-a')).toBe(3000);
  });

  test('브랜드 상품 수량을 선택하면 선택한 수량만 요청 항목과 금액에 반영한다', () => {
    const current = order();
    const items = brandItems(current, 'brand-a', [{ lineIndex: 0, quantity: 1 }]);
    expect(items[0]).toMatchObject({ lineIndex: 0, quantity: 1, amount: 1000 });
    expect(brandDeliveryFee(current, 'brand-a', [{ lineIndex: 0, quantity: 1 }])).toBe(0);
  });

  test('이미 접수되거나 완료된 취소 수량은 잔여 수량에서 예약한다', () => {
    const reserved = reservedQuantityByLine([
      {
        id: 'request-1', orderId: 'order-1', memberId: 'member-1', requestType: 'CANCEL', brandId: 'brand-a',
        items: [{
          id: 'item-1', lineIndex: 0, productId: 'p1', productName: 'A', quantity: 1, unitPrice: 1000,
          amount: 1000, status: 'REQUESTED',
        }],
        requestedAmount: 1000, reason: '고객 요청', status: 'REQUESTED', createdAt: '2026-01-01', updatedAt: '2026-01-01',
      },
      {
        id: 'request-2', orderId: 'order-1', memberId: 'member-1', requestType: 'CANCEL', brandId: 'brand-a',
        items: [{
          id: 'item-2', lineIndex: 1, productId: 'p2', productName: 'B', quantity: 1, unitPrice: 2000,
          amount: 2000, status: 'REJECTED',
        }],
        requestedAmount: 2000, reason: '고객 요청', status: 'REJECTED', createdAt: '2026-01-01', updatedAt: '2026-01-01',
      },
    ]);
    expect(reserved.get(0)).toBe(1);
    expect(reserved.get(1)).toBeUndefined();
  });
});

test.describe('관리자 취소·환불 요청 패널(OrderActionRequestsPanel) 렌더링 — PR4 U4', () => {
  test('요청 상태별로 승인/반려(REQUESTED), 완료(APPROVED) 버튼만 노출한다', () => {
    const page = src('src', 'components', 'admin-new', 'orders', 'OrderActionRequestsPanel.tsx');

    expect(page).toContain("request.status === 'REQUESTED'");
    expect(page).toContain("request.status === 'APPROVED'");
    expect(page).toContain("'처리 중...' : '승인'");
    expect(page).toContain("'처리 중...' : '반려'");
    expect(page).toContain("'처리 중...' : '완료'");
  });

  test('아이템(상품/수량) 단위 상태 배지를 보여준다', () => {
    const page = src('src', 'components', 'admin-new', 'orders', 'OrderActionRequestsPanel.tsx');

    expect(page).toContain('request.items.map((item) =>');
    expect(page).toContain('ITEM_STATUS_BADGE_STYLE[item.status]');
  });

  test('409 실패 시 서버 message를 보여주고, 미결제 부분완료 코드에는 안내 힌트를 덧붙인다', () => {
    const page = src('src', 'components', 'admin-new', 'orders', 'OrderActionRequestsPanel.tsx');

    expect(page).toContain('AdminActionRequestConflictError');
    expect(page).toContain("error.code === 'ACTION_UNPAID_PARTIAL_NOT_SUPPORTED'");
    expect(page).toContain('결제 전 주문은 전량 취소만 완료할 수 있습니다');
  });

  test('성공 응답의 requests로 목록을 갱신하고 onUpdate로 주문을 재조회한다', () => {
    const page = src('src', 'components', 'admin-new', 'orders', 'OrderActionRequestsPanel.tsx');

    expect(page).toContain('transitionAdminOrderActionRequest(order.id, requestId, action)');
    expect(page).toContain('setRequests(updated)');
    expect(page).toContain('await onUpdate?.()');
  });
});

test.describe('관리자 storage 래퍼(transitionAdminOrderActionRequest) — PR4 U4', () => {
  test('POST 성공 시 {ok, requests}에서 requests를 반환하고, 실패 시 {error, message}를 보존한 에러를 던진다', () => {
    const page = src('src', 'lib', 'storage.ts');

    expect(page).toContain('export class AdminActionRequestConflictError extends Error');
    expect(page).toContain('export async function transitionAdminOrderActionRequest(');
    expect(page).toContain("method: 'POST'");
    expect(page).toContain('throw new AdminActionRequestConflictError(code, message)');
  });
});

test.describe('OrderStatusPanel — 파생 상태(부분취소/부분취소완료)는 읽기 전용, PATCH는 변경분만 — PR4 U4', () => {
  test('파생 상태면 select 대신 읽기 전용 텍스트를 렌더하고 저장 payload에서 제외한다', () => {
    const page = src('src', 'components', 'admin-new', 'orders', 'OrderStatusPanel.tsx');

    expect(page).toContain('DERIVED_ORDER_STATUSES');
    expect(page).toContain('isDerivedOrderStatus');
    expect(page).toContain('!isDerivedOrderStatus && formData.orderStatus !== order.orderStatus');
  });

  test('결제/배송/메모 필드도 변경된 값만 PATCH payload에 담는다(무변경 저장이 400을 유발하지 않게)', () => {
    const page = src('src', 'components', 'admin-new', 'orders', 'OrderStatusPanel.tsx');

    expect(page).toContain("formData.paymentStatus !== order.paymentStatus");
    expect(page).toContain("formData.deliveryStatus !== order.deliveryStatus");
    expect(page).toContain('if (Object.keys(payload).length > 0)');
  });

  test('택배사·운송장은 둘 중 하나만 바뀌어도 항상 함께 보낸다(서버 페어링 요구 대비)', () => {
    const page = src('src', 'components', 'admin-new', 'orders', 'OrderStatusPanel.tsx');

    expect(page).toContain('const trackingChanged =');
    expect(page).toContain('const carrierChanged =');
    expect(page).toContain('if (trackingChanged || carrierChanged)');
  });
});
