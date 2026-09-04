import type { Order } from '@/types';

const CANCELLABLE_PAYMENT_STATUSES = ['결제대기', '입금대기', '결제완료'] as const;
export const CANCELLABLE_DELIVERY_STATUSES = ['배송전', '배송준비', '배송중', '배송완료'] as const;

export function isCancellationRequestAllowed(
  order: Pick<Order, 'orderStatus' | 'paymentStatus' | 'deliveryStatus'>,
): boolean {
  return (
    order.orderStatus === '주문접수' &&
    CANCELLABLE_PAYMENT_STATUSES.includes(order.paymentStatus as (typeof CANCELLABLE_PAYMENT_STATUSES)[number]) &&
    CANCELLABLE_DELIVERY_STATUSES.includes(order.deliveryStatus as (typeof CANCELLABLE_DELIVERY_STATUSES)[number])
  );
}
