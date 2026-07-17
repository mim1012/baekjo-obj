import { test, expect } from '@playwright/test';
import type { Order } from '../../src/types';
import {
  deriveFunnelStage,
  funnelBadgeLabel,
  stageCounts,
  stageAction,
} from '../../src/components/admin-new/orders/orderFunnel';

/**
 * 관리자 주문 퍼널 파생 로직 회귀 테스트 — 브라우저·DB 없이 순수 함수만 검증한다(admin project).
 * 핵심은 우선순위: 취소 > 입금대기 > 결제진행중 > 발송대기(결제완료 필수) > 배송중 > 배송완료.
 */

function makeOrder(overrides: Partial<Order>): Order {
  return {
    id: 'ORD-1',
    customerName: '홍길동',
    phone: '010-0000-0000',
    address: '서울시',
    items: [],
    totalPrice: 10000,
    deliveryFee: 3000,
    paymentMethod: '카드',
    orderStatus: '결제완료',
    paymentStatus: '결제완료',
    deliveryStatus: '배송전',
    createdAt: '2026-07-17T00:00:00.000Z',
    ...overrides,
  };
}

test.describe('deriveFunnelStage 우선순위', () => {
  test('취소·반품 주문상태는 결제·배송과 무관하게 최우선으로 취소반품', () => {
    for (const orderStatus of ['취소요청', '취소완료', '환불완료'] as const) {
      const order = makeOrder({ orderStatus, paymentStatus: '결제완료', deliveryStatus: '배송중' });
      expect(deriveFunnelStage(order)).toBe('취소반품');
    }
  });

  test('취소는 입금대기보다 우선한다(취소요청 + 입금대기 → 취소반품)', () => {
    const order = makeOrder({ orderStatus: '취소요청', paymentStatus: '입금대기', deliveryStatus: '배송전' });
    expect(deriveFunnelStage(order)).toBe('취소반품');
  });

  test('무통장 입금대기는 입금대기 단계', () => {
    const order = makeOrder({ orderStatus: '주문접수', paymentStatus: '입금대기', deliveryStatus: '배송전' });
    expect(deriveFunnelStage(order)).toBe('입금대기');
  });

  test('결제대기·승인중은 결제진행중 단계', () => {
    for (const paymentStatus of ['결제대기', '승인중'] as const) {
      const order = makeOrder({ orderStatus: '주문접수', paymentStatus, deliveryStatus: '배송전' });
      expect(deriveFunnelStage(order)).toBe('결제진행중');
    }
  });

  test('발송대기는 결제완료 + 배송전/배송준비일 때만', () => {
    for (const deliveryStatus of ['배송전', '배송준비'] as const) {
      const paid = makeOrder({ paymentStatus: '결제완료', deliveryStatus });
      expect(deriveFunnelStage(paid)).toBe('발송대기');
    }
    // 결제완료가 아니면(입금대기) 배송전이어도 발송대기가 아니라 입금대기다.
    const unpaid = makeOrder({ paymentStatus: '입금대기', deliveryStatus: '배송준비' });
    expect(deriveFunnelStage(unpaid)).toBe('입금대기');
  });

  test('배송중·배송완료는 배송상태에서 파생', () => {
    expect(deriveFunnelStage(makeOrder({ paymentStatus: '결제완료', deliveryStatus: '배송중' }))).toBe('배송중');
    expect(deriveFunnelStage(makeOrder({ paymentStatus: '결제완료', deliveryStatus: '배송완료' }))).toBe('배송완료');
  });

  test('어느 규칙에도 안 맞으면 기타', () => {
    const order = makeOrder({ orderStatus: '주문접수', paymentStatus: '결제취소', deliveryStatus: '배송전' });
    expect(deriveFunnelStage(order)).toBe('기타');
  });
});

test.describe('stageCounts / funnelBadgeLabel / stageAction', () => {
  test('stageCounts 는 단계별 건수를 집계한다', () => {
    const orders = [
      makeOrder({ id: 'a', paymentStatus: '입금대기', orderStatus: '주문접수' }),
      makeOrder({ id: 'b', paymentStatus: '입금대기', orderStatus: '주문접수' }),
      makeOrder({ id: 'c', paymentStatus: '결제완료', deliveryStatus: '배송전' }),
      makeOrder({ id: 'd', paymentStatus: '결제완료', deliveryStatus: '배송중' }),
      makeOrder({ id: 'e', orderStatus: '취소완료' }),
    ];
    const counts = stageCounts(orders);
    expect(counts['입금대기']).toBe(2);
    expect(counts['발송대기']).toBe(1);
    expect(counts['배송중']).toBe(1);
    expect(counts['취소반품']).toBe(1);
    expect(counts['배송완료']).toBe(0);
  });

  test('funnelBadgeLabel 은 취소반품만 가운뎃점 표기로 다듬는다', () => {
    expect(funnelBadgeLabel('취소반품')).toBe('취소·반품');
    expect(funnelBadgeLabel('입금대기')).toBe('입금대기');
    expect(funnelBadgeLabel('발송대기')).toBe('발송대기');
  });

  test('stageAction 은 입금대기→입금확인, 발송대기→발송, 그 외 없음', () => {
    expect(stageAction('입금대기')).toBe('depositConfirm');
    expect(stageAction('발송대기')).toBe('ship');
    expect(stageAction('배송중')).toBe('none');
    expect(stageAction('배송완료')).toBe('none');
    expect(stageAction('취소반품')).toBe('none');
    expect(stageAction('결제진행중')).toBe('none');
    expect(stageAction('기타')).toBe('none');
  });
});
