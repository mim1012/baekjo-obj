import { test, expect } from '@playwright/test';
import { cancelTossPaymentPartial } from '@/lib/payments/toss';

const originalFetch = globalThis.fetch;
const originalSecretKey = process.env.TOSS_SECRET_KEY;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSecretKey === undefined) delete process.env.TOSS_SECRET_KEY;
  else process.env.TOSS_SECRET_KEY = originalSecretKey;
});

test('부분취소는 cancelAmount와 Idempotency-Key를 Toss에 함께 전달한다', async () => {
  process.env.TOSS_SECRET_KEY = 'test-secret';
  let requestInit: RequestInit | undefined;
  globalThis.fetch = async (_input, init) => {
    requestInit = init;
    return new Response(
      JSON.stringify({
        paymentKey: 'payment-key-1',
        orderId: 'order-1',
        totalAmount: 10_000,
        status: 'PARTIAL_CANCELED',
        balanceAmount: 9_000,
        cancels: [
          {
            transactionKey: 'transaction-1',
            cancelAmount: 1_000,
            cancelReason: '상품 반품',
            refundableAmount: 9_000,
            canceledAt: '2026-08-01T00:00:00+09:00',
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const result = await cancelTossPaymentPartial('payment-key-1', '상품 반품', 1_000, 'refund-key-1');
  const headers = new Headers(requestInit?.headers);
  const body = JSON.parse(String(requestInit?.body)) as { cancelAmount: number; cancelReason: string };

  expect(headers.get('Idempotency-Key')).toBe('refund-key-1');
  expect(body).toEqual({ cancelReason: '상품 반품', cancelAmount: 1_000 });
  expect(result.balanceAmount).toBe(9_000);
  expect(result.cancels[0].transactionKey).toBe('transaction-1');
});
