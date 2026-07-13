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
 * @param action          decidePaymentAction의 반환값
 * @param orderId         대상 주문 id
 * @param confirmPaymentKey 'confirm' 적용 시에만 쓰인다 — setOrderPaid에 기록할 payment_key
 *                    (WHERE payment_status='승인중' AND payment_key=? 로 이중승인 방어 —
 *                    repo.setOrderPaid 참고. '결제대기' 주문에 대한 claim 선행은 호출부 책임이다.)
 *                    'restoreConfirming'은 이 인자를 쓰지 않는다 — action.paymentKey(decide가
 *                    실은 증거)를 그대로 0028 rpc에 전달한다.
 */
export async function applyPaymentAction(
  action: PaymentAction,
  orderId: string,
  confirmPaymentKey?: string,
): Promise<ApplyResult> {
  switch (action.kind) {
    case 'confirm': {
      if (!confirmPaymentKey) {
        throw new Error('applyPaymentAction: confirm 액션은 confirmPaymentKey가 필요합니다');
      }
      const affected = await setOrderPaid(orderId, { paymentKey: confirmPaymentKey, paidAt: new Date().toISOString() });
      return { applied: 'confirm', affected };
    }
    case 'restoreConfirming': {
      const restored = await cancelConfirmingAndRestore(orderId, action.paymentKey);
      return { applied: 'restore', restored };
    }
    case 'settled':
    case 'ignore':
    case 'retryLater':
    case 'proceedToClaim':
      return { applied: 'none' };
    default: {
      // exhaustive 강제 — decide.ts에 새 kind가 추가되면 여기서 컴파일 에러로 잡힌다.
      const exhaustiveCheck: never = action;
      throw new Error(`applyPaymentAction: 처리되지 않은 action.kind: ${JSON.stringify(exhaustiveCheck)}`);
    }
  }
}
