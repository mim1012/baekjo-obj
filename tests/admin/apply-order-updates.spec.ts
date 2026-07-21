import { test, expect } from '@playwright/test';
import {
  applyOrderUpdates,
  OrderNotFoundError,
  PaymentTransitionError,
  PaymentStatusConflictError,
  type OrderUpdatePorts,
} from '@/lib/orders/applyOrderUpdates';
import type { OrderFieldsUpdate } from '@/lib/orders/repo';

// applyOrderUpdates 오케스트레이션 회귀 — RPC/CAS 를 격리 검증하는 db.spec 과 달리, 실제 라우트가
// 태우는 결정·순서 로직을 fake ports 로 그대로 구동한다(codex 지적: 회귀 테스트는 applyOrderUpdates
// 경로를 태워야 한다). 특히 취소 fallback 리플레이 우회로(opus/codex CRITICAL)를 3단계로 재현한다.

interface FakeOrder {
  paymentStatus: string;
  orderStatus: string;
  trackingNumber?: string;
}

// 0031 RPC / CAS 시맨틱을 흉내내는 인메모리 fake. restores 로 재고 복원 횟수를 센다(이중 복원 감지).
function makeFake(initial: FakeOrder) {
  const state: FakeOrder = { ...initial };
  let restores = 0;
  const calls: string[] = [];

  const applyFields = (fields: OrderFieldsUpdate) => {
    if (fields.orderStatus !== undefined) state.orderStatus = fields.orderStatus;
    if (fields.trackingNumber !== undefined) state.trackingNumber = fields.trackingNumber;
  };

  const ports: OrderUpdatePorts = {
    cancelReservationAndRestore: async () => {
      calls.push('cancelRPC');
      // 0031: WHERE payment_status in ('결제대기','입금대기') 일 때만 취소+복원, 아니면 false(멱등).
      if (state.paymentStatus === '결제대기' || state.paymentStatus === '입금대기') {
        state.orderStatus = '취소완료';
        state.paymentStatus = '결제취소';
        restores += 1;
        return true;
      }
      return false;
    },
    getOrderById: async () => {
      calls.push('getOrderById');
      return { paymentStatus: state.paymentStatus };
    },
    updateOrderStatus: async (_id, fields) => {
      calls.push('updateOrderStatus');
      applyFields(fields);
    },
    updatePaymentStatusGuarded: async (_id, from, to, extra) => {
      calls.push('updatePaymentStatusGuarded');
      if (state.paymentStatus !== from) return 0; // CAS 0행
      state.paymentStatus = to;
      if (extra) applyFields(extra);
      return 1;
    },
  };

  return { state, ports, calls, restoreCount: () => restores };
}

test.describe('applyOrderUpdates — 취소 fallback 리플레이 봉합(오케스트레이션)', () => {
  test('3단계 리플레이 — 취소 후 crafted {취소완료+입금대기} 재요청이 와도 재고가 2차 복원되지 않는다', async () => {
    const fake = makeFake({ paymentStatus: '입금대기', orderStatus: '주문접수' });

    // 1) 정상 취소 → RPC 복원 1회, 결제취소.
    await applyOrderUpdates('o1', { orderStatus: '취소완료', paymentStatus: '결제취소' }, fake.ports);
    expect(fake.state.paymentStatus).toBe('결제취소');
    expect(fake.restoreCount()).toBe(1);

    // 2) 공격: orderStatus='취소완료' 로 취소 브랜치 재진입 + paymentStatus='입금대기' 로 되돌리기 시도.
    //    RPC 0행 → fallback 은 '입금대기'를 기록하지 않는다 → payment_status 는 여전히 결제취소.
    await applyOrderUpdates('o1', { orderStatus: '취소완료', paymentStatus: '입금대기' }, fake.ports);
    expect(fake.state.paymentStatus).toBe('결제취소'); // ★ 입금대기로 되돌아가지 않았다

    // 3) 재취소 → RPC 는 결제취소 주문에 매치 안 됨 → 복원 없음.
    await applyOrderUpdates('o1', { orderStatus: '취소완료', paymentStatus: '결제취소' }, fake.ports);
    expect(fake.restoreCount()).toBe(1); // ★ 여전히 1 — 재고 이중 복원 없음
  });

  test('결제완료 확정 주문 취소 요청은 취소완료로 기록하고 결제취소로 남긴다(재고 미복원, 환불 별도)', async () => {
    const fake = makeFake({ paymentStatus: '결제완료', orderStatus: '주문접수' });
    await applyOrderUpdates('o2', { orderStatus: '취소완료', paymentStatus: '결제취소' }, fake.ports);
    expect(fake.state.orderStatus).toBe('취소완료');
    expect(fake.state.paymentStatus).toBe('결제취소');
    expect(fake.restoreCount()).toBe(0); // 확정 주문은 재고 복원하지 않는다
  });
});

test.describe('applyOrderUpdates — 비취소 결제상태 전이', () => {
  test('입금대기 → 결제완료 전이는 화이트리스트를 통과해 반영된다', async () => {
    const fake = makeFake({ paymentStatus: '입금대기', orderStatus: '주문접수' });
    await applyOrderUpdates('o3', { paymentStatus: '결제완료' }, fake.ports);
    expect(fake.state.paymentStatus).toBe('결제완료');
  });

  test('결제취소 → 입금대기 역전이는 PaymentTransitionError(리플레이 차단)', async () => {
    const fake = makeFake({ paymentStatus: '결제취소', orderStatus: '취소완료' });
    await expect(
      applyOrderUpdates('o4', { paymentStatus: '입금대기' }, fake.ports),
    ).rejects.toThrow(PaymentTransitionError);
    expect(fake.state.paymentStatus).toBe('결제취소'); // 상태 불변
  });

  test('원자성 — 전이 + 동반 필드는 updatePaymentStatusGuarded 한 번에 실려 별도 updateOrderStatus 를 부르지 않는다', async () => {
    const fake = makeFake({ paymentStatus: '입금대기', orderStatus: '주문접수' });
    await applyOrderUpdates(
      'o5',
      { paymentStatus: '결제완료', orderStatus: '주문접수', trackingNumber: '123' },
      fake.ports,
    );
    expect(fake.state.paymentStatus).toBe('결제완료');
    expect(fake.state.orderStatus).toBe('주문접수');
    expect(fake.state.trackingNumber).toBe('123');
    // 부분 쓰기 방지: 필드가 CAS 한 방에 실렸으므로 updateOrderStatus 는 호출되지 않는다.
    expect(fake.calls).toContain('updatePaymentStatusGuarded');
    expect(fake.calls).not.toContain('updateOrderStatus');
  });

  test('무변경 결제상태 재전송(같은 값)은 CAS 없이 나머지 필드만 반영한다', async () => {
    const fake = makeFake({ paymentStatus: '결제완료', orderStatus: '주문접수' });
    await applyOrderUpdates('o6', { paymentStatus: '결제완료', trackingNumber: '999' }, fake.ports);
    expect(fake.state.trackingNumber).toBe('999');
    expect(fake.calls).not.toContain('updatePaymentStatusGuarded'); // 전이 아님 → CAS 미호출
    expect(fake.calls).toContain('updateOrderStatus');
  });

  test('CAS 경합(0행)은 PaymentStatusConflictError', async () => {
    const fake = makeFake({ paymentStatus: '입금대기', orderStatus: '주문접수' });
    // getOrderById 후 CAS 직전에 다른 요청이 상태를 바꾼 상황을 흉내: from 이 안 맞게 만든다.
    const racingPorts: OrderUpdatePorts = {
      ...fake.ports,
      updatePaymentStatusGuarded: async () => 0,
    };
    await expect(
      applyOrderUpdates('o7', { paymentStatus: '결제완료' }, racingPorts),
    ).rejects.toThrow(PaymentStatusConflictError);
  });

  test('주문이 없으면 OrderNotFoundError', async () => {
    const fake = makeFake({ paymentStatus: '입금대기', orderStatus: '주문접수' });
    const missingPorts: OrderUpdatePorts = { ...fake.ports, getOrderById: async () => null };
    await expect(
      applyOrderUpdates('o8', { paymentStatus: '결제완료' }, missingPorts),
    ).rejects.toThrow(OrderNotFoundError);
  });
});
