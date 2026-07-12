/**
 * decidePaymentAction이 정한 행동을 실제로 적용하는 얇은 실행기. repo 호출만 담당하고
 * 판단은 전혀 하지 않는다 — confirm/webhook/reconcile 세 라우트가 공유한다.
 */
import { setOrderPaid, cancelConfirmingAndRestore } from '@/lib/orders/repo';
import type { PaymentAction } from './decide';

export type ApplyResult =
  | { applied: 'confirm'; affected: number }
  | { applied: 'restore'; restored: boolean }
  | { applied: 'none' };

/**
 * @param action    decidePaymentAction의 반환값
 * @param orderId   대상 주문 id
 * @param paymentKey 'confirm' 적용 시 setOrderPaid에 기록할 payment_key
 *                    (WHERE payment_status='승인중' AND payment_key=? 로 이중승인 방어 —
 *                    repo.setOrderPaid 참고. '결제대기' 주문에 대한 claim 선행은 호출부 책임이다.)
 */
export async function applyPaymentAction(
  action: PaymentAction,
  orderId: string,
  paymentKey: string,
): Promise<ApplyResult> {
  switch (action.kind) {
    case 'confirm': {
      const affected = await setOrderPaid(orderId, { paymentKey, paidAt: new Date().toISOString() });
      return { applied: 'confirm', affected };
    }
    case 'restoreConfirming': {
      const restored = await cancelConfirmingAndRestore(orderId);
      return { applied: 'restore', restored };
    }
    case 'settled':
    case 'ignore':
    case 'retryLater':
      return { applied: 'none' };
  }
}
