import type { Order, OrderItem } from '@/types';

export const ORDER_ACTION_REQUEST_TYPES = ['CANCEL', 'REFUND'] as const;
export type OrderActionRequestType = (typeof ORDER_ACTION_REQUEST_TYPES)[number];
export const ORDER_ACTION_REQUEST_STATUSES = ['REQUESTED', 'APPROVED', 'REJECTED', 'COMPLETED'] as const;
export type OrderActionRequestStatus = (typeof ORDER_ACTION_REQUEST_STATUSES)[number];

export interface OrderActionRequestItem {
  lineIndex: number;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  optionName?: string;
}

export interface OrderActionRequestRecord {
  id: string;
  orderId: string;
  memberId: string;
  requestType: OrderActionRequestType;
  brandId: string;
  items: OrderActionRequestItem[];
  requestedAmount: number;
  reason: string;
  status: OrderActionRequestStatus;
  createdAt: string;
  updatedAt: string;
}

export function brandIdForItem(item: OrderItem): string | null {
  return item.brandId ?? null;
}

export function brandItems(order: Order, brandId: string): OrderActionRequestItem[] {
  return order.items.flatMap((item, lineIndex) => {
    if (item.brandId !== brandId || item.quantity <= 0 || item.price <= 0) return [];
    return [{
      lineIndex,
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.price,
      amount: item.price * item.quantity,
      ...(item.optionName ? { optionName: item.optionName } : {}),
    }];
  });
}

export function brandDeliveryFee(order: Order, brandId: string): number {
  return order.deliveryFeeBreakdown?.find((line) => line.brandId === brandId)?.appliedDeliveryFee ?? 0;
}
