import type { Order, OrderItem, OrderStatus } from '@/types';

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

/** 아이템 자체의 취소 상태. 요청(request) 레벨 status와 값 집합은 같지만 의미가 다르다
 *  (요청 레벨은 아이템 상태에서 파생됨 — deriveRequestStatus). */
export type OrderActionRequestItemStatus = OrderActionRequestStatus;

/** DB에 저장된(id·상태 부여된) 아이템 — brandItems()가 만드는 생성 스냅샷(OrderActionRequestItem)과
 *  달리 id/status를 갖는다. OrderActionRequestRecord.items는 이 타입이다. */
export interface OrderActionRequestItemState extends OrderActionRequestItem {
  id: string;
  status: OrderActionRequestItemStatus;
}

export interface OrderActionRequestRecord {
  id: string;
  orderId: string;
  memberId: string;
  requestType: OrderActionRequestType;
  brandId: string;
  items: OrderActionRequestItemState[];
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

/** 아이템(라인) 단위 상태가 진실 소스다 — REJECTED 아이템만 잔여 수량을 해제하고,
 *  REQUESTED/APPROVED/COMPLETED 아이템은 계속 예약(잔여 수량에서 제외)된다. */
export function reservedQuantityByLine(requests: readonly OrderActionRequestRecord[]): Map<number, number> {
  const reserved = new Map<number, number>();
  for (const request of requests) {
    for (const item of request.items) {
      if (item.status === 'REJECTED') continue;
      reserved.set(item.lineIndex, (reserved.get(item.lineIndex) ?? 0) + item.quantity);
    }
  }
  return reserved;
}

/**
 * 아이템 상태 배열에서 요청(request) 레벨 status를 파생한다. 아이템 레벨 상태가 진실 소스가 된
 * 이후, order_action_requests.status 컬럼은 어드바이저리(advisory)일 뿐이다 — 실제 판정은 이 함수로.
 */
export function deriveRequestStatus(
  items: readonly { status: OrderActionRequestItemStatus }[],
): OrderActionRequestStatus {
  if (items.length === 0) return 'REQUESTED';
  const nonRejected = items.filter((item) => item.status !== 'REJECTED');
  if (nonRejected.length === 0) return 'REJECTED';
  if (nonRejected.every((item) => item.status === 'COMPLETED')) return 'COMPLETED';
  if (nonRejected.some((item) => item.status === 'APPROVED')) return 'APPROVED';
  if (nonRejected.some((item) => item.status === 'REQUESTED')) return 'REQUESTED';
  return 'APPROVED';
}

/**
 * 주문 전체의 취소 집계 상태(상품별 취소 요청들을 모아 주문 상태로 파생). 부분 수량만 완료됐을
 * 때 '취소완료'로 성급하게 올리지 않는 것이 이 함수의 핵심 재무 안전장치다.
 */
export function aggregateOrderCancelStatus(
  order: Pick<Order, 'items'>,
  requests: readonly OrderActionRequestRecord[],
): OrderStatus {
  const totalOrdered = order.items.reduce((sum, item) => sum + (item.quantity > 0 ? item.quantity : 0), 0);
  let completedQty = 0;
  let approvedQty = 0;
  let requestedQty = 0;
  for (const request of requests) {
    for (const item of request.items) {
      if (item.status === 'COMPLETED') completedQty += item.quantity;
      else if (item.status === 'APPROVED') approvedQty += item.quantity;
      else if (item.status === 'REQUESTED') requestedQty += item.quantity;
    }
  }
  if (totalOrdered > 0 && completedQty >= totalOrdered) return '취소완료';
  if (completedQty > 0) return '부분취소완료';
  if (approvedQty > 0) return '부분취소';
  if (requestedQty > 0) return '취소요청';
  return '주문접수';
}
