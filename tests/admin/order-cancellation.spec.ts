import { test, expect } from '@playwright/test';
import { isCancellationRequestAllowed } from '@/lib/orders/cancellation';

test.describe('주문 취소 요청 가능 조건', () => {
  test('출고 전 주문접수 상태는 취소 요청이 가능하다', () => {
    expect(
      isCancellationRequestAllowed({ orderStatus: '주문접수', paymentStatus: '결제완료', deliveryStatus: '배송준비' }),
    ).toBe(true);
  });

  test('배송이 시작됐거나 이미 처리된 주문은 취소 요청이 불가능하다', () => {
    expect(
      isCancellationRequestAllowed({ orderStatus: '주문접수', paymentStatus: '결제완료', deliveryStatus: '배송중' }),
    ).toBe(false);
    expect(
      isCancellationRequestAllowed({ orderStatus: '취소요청', paymentStatus: '결제완료', deliveryStatus: '배송전' }),
    ).toBe(false);
  });
});
