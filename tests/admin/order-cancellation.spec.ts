import { test, expect } from '@playwright/test';
import { isCancellationRequestAllowed } from '@/lib/orders/cancellation';

test.describe('주문 취소 요청 가능 조건', () => {
  test('출고 전 주문접수 상태는 취소 요청이 가능하다', () => {
    expect(
      isCancellationRequestAllowed({ orderStatus: '주문접수', paymentStatus: '결제완료', deliveryStatus: '배송준비' }),
    ).toBe(true);
  });

  test('배송이 시작된 뒤에도 취소 요청 접수가 가능하다', () => {
    expect(
      isCancellationRequestAllowed({ orderStatus: '주문접수', paymentStatus: '결제완료', deliveryStatus: '배송중' }),
    ).toBe(true);
    expect(
      isCancellationRequestAllowed({ orderStatus: '주문접수', paymentStatus: '결제완료', deliveryStatus: '배송완료' }),
    ).toBe(true);
  });

  test('이미 취소 처리된 주문은 다시 취소 요청할 수 없다', () => {
    expect(
      isCancellationRequestAllowed({ orderStatus: '취소요청', paymentStatus: '결제완료', deliveryStatus: '배송전' }),
    ).toBe(false);
  });
});
