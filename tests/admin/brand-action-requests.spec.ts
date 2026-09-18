import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { brandDeliveryFee, brandItems, reservedQuantityByLine } from '../../src/lib/orders/actionRequests';
import { isDerivedOrderStatus } from '../../src/types';
import type { Order } from '../../src/types';
import {
  ADMIN_ACTION_REQUEST_ITEM_BADGE_STYLE,
  ADMIN_ACTION_REQUEST_ITEM_LABEL,
  hasRejectedActionRequestItem,
  MEMBER_ACTION_REQUEST_ITEM_LABEL,
} from '../../src/lib/orders/actionRequestPresentation';

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
  test('요청 상태별로 승인/반려(REQUESTED), 완료·반려(APPROVED) 버튼을 노출한다', () => {
    const page = src('src', 'components', 'admin-new', 'orders', 'OrderActionRequestsPanel.tsx');

    expect(page).toContain("request.status === 'REQUESTED'");
    expect(page).toContain("request.status === 'APPROVED'");
    expect(page).toContain("'처리 중...' : '승인'");
    expect(page).toContain("'처리 중...' : '반려'");
    expect(page).toContain("'처리 중...' : '완료'");
  });

  // 미결제 부분취소 고착 탈출 — SQL 계약(0170_order_action_request_contract.sql
  // transition_action_request)은 APPROVED→REJECTED 전이를 허용하는데, 이전에는 패널이
  // REQUESTED에서만 반려 버튼을 그려 관리자가 승인된 요청을 되돌릴 UI 경로가 없었다.
  test('APPROVED 상태에서도 완료 옆에 반려 버튼이 렌더된다', () => {
    const page = src('src', 'components', 'admin-new', 'orders', 'OrderActionRequestsPanel.tsx');

    // "{request.status === 'APPROVED' && (" 단독 조건(선행 '{' — 위쪽 "(REQUESTED ||
    // APPROVED) &&" 결합 조건과 구분)만 골라 그 마커 이후 구간을 잘라 완료·반려 버튼이
    // 함께 있는지 확인한다. 창 길이는 3000자로 넉넉히 잡아, 실제 블록 길이(2026-09-16 실측
    // 약 1100자)가 포맷팅 등으로 다소 늘어나도 여유가 205자뿐인 이전 1300자 고정값처럼
    // 쉽게 깨지지 않게 한다.
    const marker = "{request.status === 'APPROVED' && (";
    const markerIndex = page.indexOf(marker);
    expect(markerIndex, 'APPROVED 조건 렌더 블록을 찾을 수 없다').toBeGreaterThan(-1);
    const approvedBlock = page.slice(markerIndex, markerIndex + 3000);
    expect(approvedBlock).toContain("runAction(request.id, 'complete')");
    expect(approvedBlock).toContain("runAction(request.id, 'reject')");
    expect(approvedBlock).toContain("'처리 중...' : '완료'");
    expect(approvedBlock).toContain("'처리 중...' : '반려'");
  });

  // APPROVED 반려는 회원에게 이미 보여진 결정(승인)을 번복하는 되돌리기라 확인창을 거친다.
  // REQUESTED 반려는 확정된 변화가 없어 확인창 없이 그대로 진행해야 한다(회귀 방지).
  test('APPROVED 반려는 confirm을 거치고, REQUESTED 반려는 확인창 없이 진행한다', () => {
    const page = src('src', 'components', 'admin-new', 'orders', 'OrderActionRequestsPanel.tsx');

    expect(page).toContain("action === 'reject' &&");
    expect(page).toContain("?.status === 'APPROVED'");
    expect(page).toContain('예약된 취소 수량이 풀리고 주문 상태가 되돌아갑니다');
  });

  test('아이템(상품/수량) 단위 상태 배지를 보여준다', () => {
    const page = src('src', 'components', 'admin-new', 'orders', 'OrderActionRequestsPanel.tsx');

    expect(page).toContain('request.items.map((item) =>');
    expect(page).toContain('ITEM_STATUS_BADGE_STYLE[item.status]');
  });

  // B2 회귀 방지 — 배지가 실제로 렌더할 값(라벨·색 클래스)을 REJECTED에 대해 직접 검증한다.
  // React Testing이 없는 저장소라 렌더는 못 하지만, 렌더가 참조하는 순수 맵을 직접 검증하면
  // "REJECTED인데 라벨/클래스가 undefined"(B2가 실제로 냈던 증상)를 그대로 재현·방지한다.
  test('관리자 패널의 REJECTED 아이템은 "반려" 라벨과 전용 배지 색을 갖는다(undefined가 아니다)', () => {
    expect(ADMIN_ACTION_REQUEST_ITEM_LABEL.REJECTED).toBe('반려');
    expect(ADMIN_ACTION_REQUEST_ITEM_BADGE_STYLE.REJECTED).toBe('bg-[#F7E3DF] text-[#A65348]');
    for (const status of ['REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'] as const) {
      expect(typeof ADMIN_ACTION_REQUEST_ITEM_LABEL[status]).toBe('string');
      expect(typeof ADMIN_ACTION_REQUEST_ITEM_BADGE_STYLE[status]).toBe('string');
    }
  });

  test('마이페이지의 REJECTED 아이템은 "취소반려" 라벨을 갖고, 하나라도 있으면 반려 배지 조건이 참이다', () => {
    expect(MEMBER_ACTION_REQUEST_ITEM_LABEL.REJECTED).toBe('취소반려');
    expect(
      hasRejectedActionRequestItem([
        { items: [{ status: 'REQUESTED' }, { status: 'REJECTED' }] },
      ]),
    ).toBe(true);
    expect(
      hasRejectedActionRequestItem([
        { items: [{ status: 'REQUESTED' }, { status: 'APPROVED' }] },
      ]),
    ).toBe(false);
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
  // 이전에는 이 판정 로직이 컴포넌트 바디 안의 지역 변수라 소스 텍스트만 grep했다(데이터 모양
  // 회귀를 못 잡는다) — B1 수정으로 isDerivedOrderStatus를 '@/types'의 순수 함수로 뽑아 실제
  // 판정 결과를 직접 검증한다.
  test('부분취소/부분취소완료는 파생 상태로 판정되고, 그 외(수동 화이트리스트)는 아니다', () => {
    expect(isDerivedOrderStatus('부분취소')).toBe(true);
    expect(isDerivedOrderStatus('부분취소완료')).toBe(true);
    expect(isDerivedOrderStatus('주문접수')).toBe(false);
    expect(isDerivedOrderStatus('취소요청')).toBe(false);
    expect(isDerivedOrderStatus('취소완료')).toBe(false);
  });

  test('OrderStatusPanel은 판정을 재구현하지 않고 공용 isDerivedOrderStatus를 그대로 쓴다(select 숨김·PATCH 제외 둘 다)', () => {
    const page = src('src', 'components', 'admin-new', 'orders', 'OrderStatusPanel.tsx');

    expect(page).toContain('isDerivedOrderStatus');
    expect(page).toContain('!orderStatusIsDerived && formData.orderStatus !== order.orderStatus');
    expect(page).toContain('orderStatusIsDerived ? (');
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
