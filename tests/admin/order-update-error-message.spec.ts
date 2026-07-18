import { test, expect } from '@playwright/test';
import {
  orderUpdateErrorMessage,
  summarizeBulkFailures,
} from '../../src/components/admin-new/orders/orderUpdateErrorMessage';

/**
 * 관리자 주문 상태변경 실패 문구 매핑 회귀 — 브라우저·DB 없이 순수 함수만 검증한다(admin project).
 * 서버 409 두 코드(invalid-payment-transition·payment-status-conflict)가 storage 를 통해
 * Error.message 로 전달된다는 계약을 UI 문구가 구분해 반영하는지 확인한다.
 */

test.describe('orderUpdateErrorMessage', () => {
  test('invalid-payment-transition 은 전이 거부 문구', () => {
    const msg = orderUpdateErrorMessage(new Error('invalid-payment-transition'));
    expect(msg).toContain('허용되지 않는 상태 변경');
  });

  test('payment-status-conflict 는 동시 수정 충돌 문구', () => {
    const msg = orderUpdateErrorMessage(new Error('payment-status-conflict'));
    expect(msg).toContain('다른 관리자가 동시에');
  });

  test('알 수 없는 코드는 일반 실패 폴백', () => {
    expect(orderUpdateErrorMessage(new Error('order-update-failed'))).toContain('잠시 후 다시 시도');
  });

  test('Error 가 아닌 입력(문자열·null)도 폴백으로 안전 처리', () => {
    expect(orderUpdateErrorMessage('payment-status-conflict')).toContain('잠시 후 다시 시도');
    expect(orderUpdateErrorMessage(null)).toContain('잠시 후 다시 시도');
    expect(orderUpdateErrorMessage(undefined)).toContain('잠시 후 다시 시도');
  });
});

test.describe('summarizeBulkFailures', () => {
  test('세 분류를 코드별 건수·주문번호로 구분 표기한다', () => {
    const summary = summarizeBulkFailures(4, 1, [
      { id: 'a1', code: 'invalid-payment-transition' },
      { id: 'b2', code: 'payment-status-conflict' },
      { id: 'c3', code: 'order-update-failed' },
    ]);
    expect(summary).toContain('4건 중 1건 완료, 3건 실패');
    expect(summary).toContain('이미 처리됐거나 허용되지 않는 변경: 1건 (주문 a1)');
    expect(summary).toContain('동시 수정 충돌(재시도 가능): 1건 (주문 b2)');
    expect(summary).toContain('기타 오류: 1건 (주문 c3)');
  });

  test('건수 0인 분류의 줄은 생략한다', () => {
    const summary = summarizeBulkFailures(3, 1, [
      { id: 'a1', code: 'payment-status-conflict' },
      { id: 'a2', code: 'payment-status-conflict' },
    ]);
    expect(summary).toContain('동시 수정 충돌(재시도 가능): 2건 (주문 a1, a2)');
    expect(summary).not.toContain('기타 오류');
    expect(summary).not.toContain('허용되지 않는 변경');
  });
});
