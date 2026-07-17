import type { Order } from '@/types';

export function getOrderGrossAmount(order: Pick<Order, 'totalPrice' | 'deliveryFee'>): number {
  return order.totalPrice + order.deliveryFee;
}

export function getOrderUsedPoints(order: Pick<Order, 'usedPoints'>): number {
  return Math.max(0, order.usedPoints ?? 0);
}

export function getOrderPayableAmount(order: Pick<Order, 'totalPrice' | 'deliveryFee' | 'payableAmount'>): number {
  return Math.max(0, order.payableAmount ?? getOrderGrossAmount(order));
}
