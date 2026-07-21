import { test, expect } from '@playwright/test';
import {
  applyOrderUpdates,
  OrderNotFoundError,
  PaymentTransitionError,
  PaymentStatusConflictError,
  ConflictingOrderUpdateRequestError,
  type OrderUpdatePorts,
} from '@/lib/orders/applyOrderUpdates';
import type { OrderFieldsUpdate } from '@/lib/orders/repo';
import { TossConfirmError } from '@/lib/payments/toss';

// applyOrderUpdates 오케스트레이션 회귀 — RPC/CAS 를 격리 검증하는 db.spec 과 달리, 실제 라우트가
// 태우는 결정·순서 로직을 fake ports 로 그대로 구동한다(codex 지적: 회귀 테스트는 applyOrderUpdates
// 경로를 태워야 한다). 특히 취소 fallback 리플레이 우회로(opus/codex CRITICAL)를 3단계로 재현한다.

interface FakeOrder {
  paymentStatus: string;
  orderStatus: string;
  trackingNumber?: string;
  paymentKey?: string | null;
}

// 0031/0050 RPC / CAS 시맨틱을 흉내내는 인메모리 fake. restores 로 재고 복원 횟수를 센다(이중 복원 감지).
// tossCancels 로 Toss 취소 호출 횟수를 세어 "카드=호출/무통장=미호출"과 순서를 검증한다.
function makeFake(initial: FakeOrder) {
  const state: FakeOrder = { ...initial };
  let restores = 0;
  let tossCancels = 0;
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
    getOrderPaymentInfo: async () => {
      calls.push('getOrderPaymentInfo');
      return { paymentStatus: state.paymentStatus, paymentKey: state.paymentKey ?? null };
    },
    cancelTossPayment: async () => {
      calls.push('cancelTossPayment');
      tossCancels += 1;
    },
    // 기본값: 재조정을 호출할 일이 없는(취소가 성공하는) 대다수 테스트를 위해 null(불명) 고정.
    // 재조정 시나리오를 검증하는 테스트는 이 port 를 override 한다.
    queryTossCancelStatus: async () => {
      calls.push('queryTossCancelStatus');
      return null;
    },
    refundOrderAndRestore: async () => {
      calls.push('refundRPC');
      // 0050: WHERE payment_status='결제완료' 일 때만 환불 전이+복원, 아니면 false(경합/이미처리).
      if (state.paymentStatus === '결제완료') {
        state.paymentStatus = '환불완료';
        restores += 1;
        return true;
      }
      return false;
    },
  };

  return { state, ports, calls, restoreCount: () => restores, tossCancelCount: () => tossCancels };
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

// 카드 환불 실연동(§8-6 자기개선 루프) — 수정 전에는 관리자 '환불완료' 전이가 Toss 취소 API를
// 호출하지 않고 재고도 복원하지 않은 채 라벨만 바꿨다(§ "돈 먼저, 라벨 나중" 위반). 아래 (b)는 그
// 실패조건("라벨만 바뀌고 재고는 그대로")을 명시적으로 재현해 회귀를 막는다.
test.describe('applyOrderUpdates — 환불(Toss 취소 + 재고 복원)', () => {
  test('(a) 카드 결제완료 주문 환불 — Toss 취소 → RPC 순서로 호출되고 재고가 복원된다', async () => {
    const fake = makeFake({ paymentStatus: '결제완료', orderStatus: '주문접수', paymentKey: 'pk_1' });
    await applyOrderUpdates('r1', { paymentStatus: '환불완료' }, fake.ports);

    expect(fake.state.paymentStatus).toBe('환불완료');
    expect(fake.tossCancelCount()).toBe(1);
    expect(fake.restoreCount()).toBe(1);
    // 순서 보장: Toss 취소가 RPC(재고 복원)보다 먼저 호출돼야 한다 — 뒤바뀌면 "재고만 복원되고
    // 카드값은 그대로"인 반대 방향 사고가 재현된다.
    expect(fake.calls.indexOf('cancelTossPayment')).toBeLessThan(fake.calls.indexOf('refundRPC'));
  });

  test('(b) Toss 취소 실패 시 RPC를 호출하지 않고 상태·재고가 그대로다(수정 전 실패조건의 반대 재현)', async () => {
    const fake = makeFake({ paymentStatus: '결제완료', orderStatus: '주문접수', paymentKey: 'pk_2' });
    const failingPorts: OrderUpdatePorts = {
      ...fake.ports,
      cancelTossPayment: async () => {
        throw new Error('toss-cancel-failed');
      },
    };

    await expect(
      applyOrderUpdates('r2', { paymentStatus: '환불완료' }, failingPorts),
    ).rejects.toThrow('toss-cancel-failed');

    // ★ pre-seed 검증: 수정 전 버그는 여기서 payment_status가 '환불완료'로 바뀌고 재고도
    // 복원되지 않는 상태였다(카드값 미환불 + 라벨만 환불완료). 수정 후에는 상태가 전혀 안 바뀐다.
    expect(fake.state.paymentStatus).toBe('결제완료');
    expect(fake.calls).not.toContain('refundRPC');
    expect(fake.restoreCount()).toBe(0);
  });

  test('(c) 결제완료가 아닌 주문의 환불 요청은 PaymentTransitionError(409)로 거절된다', async () => {
    const fake = makeFake({ paymentStatus: '입금대기', orderStatus: '주문접수' });
    await expect(
      applyOrderUpdates('r3', { paymentStatus: '환불완료' }, fake.ports),
    ).rejects.toThrow(PaymentTransitionError);
    expect(fake.calls).not.toContain('cancelTossPayment');
    expect(fake.calls).not.toContain('refundRPC');
  });

  test('(d) 무통장(paymentKey 없음) 주문 환불은 Toss 호출 없이 RPC만 태운다', async () => {
    const fake = makeFake({
      paymentStatus: '결제완료',
      orderStatus: '주문접수',
      paymentKey: null,
    });
    await applyOrderUpdates('r4', { paymentStatus: '환불완료' }, fake.ports);

    expect(fake.state.paymentStatus).toBe('환불완료');
    expect(fake.tossCancelCount()).toBe(0); // ★ Toss 호출 없음 — 청구된 적 없는 결제라서
    expect(fake.restoreCount()).toBe(1);
  });

  test('환불 RPC 0행(경합)은 PaymentStatusConflictError', async () => {
    const fake = makeFake({ paymentStatus: '결제완료', orderStatus: '주문접수', paymentKey: 'pk_5' });
    const racingPorts: OrderUpdatePorts = { ...fake.ports, refundOrderAndRestore: async () => false };
    await expect(
      applyOrderUpdates('r5', { paymentStatus: '환불완료' }, racingPorts),
    ).rejects.toThrow(PaymentStatusConflictError);
  });

  test('취소+환불 동시 요청({취소완료, 환불완료})은 ConflictingOrderUpdateRequestError(400)로 즉시 거절된다(codex LOW-2)', async () => {
    const fake = makeFake({ paymentStatus: '결제완료', orderStatus: '주문접수', paymentKey: 'pk_6' });
    await expect(
      applyOrderUpdates('r6', { orderStatus: '취소완료', paymentStatus: '환불완료' }, fake.ports),
    ).rejects.toThrow(ConflictingOrderUpdateRequestError);
    // ★ pre-seed 검증: 수정 전 버그는 취소 브랜치로 빠져 환불 요청이 조용히 무시됐다(카드값 미환불).
    // 수정 후에는 어떤 포트도 호출되지 않고 상태가 전혀 안 바뀐다.
    expect(fake.calls).toEqual([]);
    expect(fake.state.paymentStatus).toBe('결제완료');
  });
});

// 크래시 윈도우 재조정(§8-6 codex HIGH) — cancelTossPayment 성공 직후, refundOrderAndRestore 호출
// 전에 프로세스가 죽으면 DB는 '결제완료'로 남고 재고는 미복원인 채 재시도가 온다. 이때 Toss에 다시
// 취소를 요청하면 이미 CANCELED라 4xx로 거절돼, 그대로 에러를 전파하면 영구 409 데드락이 된다.
test.describe('applyOrderUpdates — 환불 크래시 윈도우 재조정', () => {
  test('Toss 4xx 거절 + 재조회 결과 이미 전액취소(CANCELED) → 에러 대신 RPC로 정합을 복구한다(멱등 재시도)', async () => {
    const fake = makeFake({ paymentStatus: '결제완료', orderStatus: '주문접수', paymentKey: 'pk_7' });
    const retryPorts: OrderUpdatePorts = {
      ...fake.ports,
      cancelTossPayment: async () => {
        fake.calls.push('cancelTossPayment');
        throw new TossConfirmError('ALREADY_CANCELED_PAYMENT', 'ALREADY_CANCELED_PAYMENT', 400);
      },
      queryTossCancelStatus: async () => {
        fake.calls.push('queryTossCancelStatus');
        return { status: 'CANCELED', balanceAmount: 0 };
      },
    };

    await applyOrderUpdates('r7', { paymentStatus: '환불완료' }, retryPorts);

    expect(fake.state.paymentStatus).toBe('환불완료');
    expect(fake.restoreCount()).toBe(1);
    expect(fake.calls).toContain('queryTossCancelStatus');
    expect(fake.calls).toContain('refundRPC');
    // 재조정 조회가 취소 시도 이후, RPC 이전에 일어나야 한다.
    expect(fake.calls.indexOf('cancelTossPayment')).toBeLessThan(fake.calls.indexOf('queryTossCancelStatus'));
    expect(fake.calls.indexOf('queryTossCancelStatus')).toBeLessThan(fake.calls.indexOf('refundRPC'));
  });

  test('Toss 4xx 거절 + 재조회 결과 취소 아님(DONE 등) → 재조정 포기하고 원래 에러를 전파, RPC 미호출', async () => {
    const fake = makeFake({ paymentStatus: '결제완료', orderStatus: '주문접수', paymentKey: 'pk_8' });
    const failPorts: OrderUpdatePorts = {
      ...fake.ports,
      cancelTossPayment: async () => {
        throw new TossConfirmError('REJECT_CARD_PAYMENT', 'REJECT_CARD_PAYMENT', 400);
      },
      queryTossCancelStatus: async () => ({ status: 'DONE', balanceAmount: 10000 }),
    };

    await expect(
      applyOrderUpdates('r8', { paymentStatus: '환불완료' }, failPorts),
    ).rejects.toThrow(TossConfirmError);
    expect(fake.state.paymentStatus).toBe('결제완료'); // 상태 불변
    expect(fake.calls).not.toContain('refundRPC');
  });

  test('Toss 네트워크/타임아웃(httpStatus null) 실패는 재조정을 시도하지 않고 즉시 전파한다', async () => {
    const fake = makeFake({ paymentStatus: '결제완료', orderStatus: '주문접수', paymentKey: 'pk_9' });
    let queryCalled = false;
    const networkFailPorts: OrderUpdatePorts = {
      ...fake.ports,
      cancelTossPayment: async () => {
        throw new TossConfirmError('toss-network-error', null, null);
      },
      queryTossCancelStatus: async () => {
        queryCalled = true;
        return { status: 'CANCELED', balanceAmount: 0 };
      },
    };

    await expect(
      applyOrderUpdates('r9', { paymentStatus: '환불완료' }, networkFailPorts),
    ).rejects.toThrow(TossConfirmError);
    // ★ 네트워크/타임아웃(결과 불명)은 "돈 먼저" 원칙상 재조회조차 시도하지 않는다 —
    // 5xx/불명일 때 재조회는 스펙상 4xx 전용이다.
    expect(queryCalled).toBe(false);
    expect(fake.state.paymentStatus).toBe('결제완료');
    expect(fake.calls).not.toContain('refundRPC');
  });

  test('Toss 4xx 거절 + 재조회 자체가 실패(catch)하면 재조정을 포기하고 원래 에러를 전파한다', async () => {
    const fake = makeFake({ paymentStatus: '결제완료', orderStatus: '주문접수', paymentKey: 'pk_10' });
    const cancelError = new TossConfirmError('ALREADY_CANCELED_PAYMENT', 'ALREADY_CANCELED_PAYMENT', 400);
    const queryFailsPorts: OrderUpdatePorts = {
      ...fake.ports,
      cancelTossPayment: async () => {
        throw cancelError;
      },
      queryTossCancelStatus: async () => {
        throw new Error('query-also-failed');
      },
    };

    await expect(
      applyOrderUpdates('r10', { paymentStatus: '환불완료' }, queryFailsPorts),
    ).rejects.toThrow(cancelError.message);
    expect(fake.state.paymentStatus).toBe('결제완료');
    expect(fake.calls).not.toContain('refundRPC');
  });
});
