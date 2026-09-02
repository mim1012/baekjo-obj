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

export interface OrderActionRequestItemInput {
  lineIndex: number;
  quantity: number;
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

export function brandItems(
  order: Order,
  brandId: string,
  selectedItems?: readonly OrderActionRequestItemInput[],
): OrderActionRequestItem[] {
  const selectedByLine = selectedItems ? new Map(selectedItems.map((item) => [item.lineIndex, item.quantity])) : null;
  return order.items.flatMap((item, lineIndex) => {
    const quantity = selectedByLine ? selectedByLine.get(lineIndex) ?? 0 : item.quantity;
    if (item.brandId !== brandId || quantity <= 0 || item.quantity <= 0 || item.price <= 0) return [];
    return [{
      lineIndex,
      productId: item.productId,
      productName: item.productName,
      quantity,
      unitPrice: item.price,
      amount: item.price * quantity,
      ...(item.optionName ? { optionName: item.optionName } : {}),
    }];
  });
}

export function brandDeliveryFee(
  order: Order,
  brandId: string,
  selectedItems?: readonly OrderActionRequestItemInput[] | readonly OrderActionRequestItem[],
): number {
  const brandOrderItems = order.items
    .map((item, lineIndex) => ({ item, lineIndex }))
    .filter(({ item }) => item.brandId === brandId);
  const selectedByLine = selectedItems ? new Map(selectedItems.map((item) => [item.lineIndex, item.quantity])) : null;
  const cancelsWholeBrand = brandOrderItems.every(({ item, lineIndex }) => {
    const quantity = selectedByLine ? selectedByLine.get(lineIndex) ?? 0 : item.quantity;
    return quantity >= item.quantity;
  });
  if (!cancelsWholeBrand) return 0;
  return order.deliveryFeeBreakdown?.find((line) => line.brandId === brandId)?.appliedDeliveryFee ?? 0;
}

export function reservedQuantityByLine(requests: readonly OrderActionRequestRecord[]): Map<number, number> {
  const reserved = new Map<number, number>();
  for (const request of requests) {
    if (request.status === 'REJECTED') continue;
    for (const item of request.items) {
      reserved.set(item.lineIndex, (reserved.get(item.lineIndex) ?? 0) + item.quantity);
    }
  }
  return reserved;
}
