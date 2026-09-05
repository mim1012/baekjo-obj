import type { Order, OrderItem } from '@/types';

export const REFUND_STATUSES = ['PROCESSING', 'SUCCEEDED', 'FAILED', 'UNKNOWN'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export interface RefundItemInput {
  lineIndex: number;
  productId: string;
  quantity: number;
}

export interface RefundItemSnapshot extends RefundItemInput {
  productName: string;
  optionId?: string;
  optionName?: string;
  unitPrice: number;
  amount: number;
}

export interface OrderRefundRecord {
  id: string;
  orderId: string;
  idempotencyKey: string;
  items: RefundItemSnapshot[];
  includeDeliveryFee: boolean;
  requestedAmount: number;
  approvedAmount?: number;
  status: RefundStatus;
  reason: string;
  paymentKey?: string;
  providerBalanceBefore?: number;
  providerBalanceAfter?: number;
  providerStatus?: string;
  transactionKey?: string;
  errorMessage?: string;
  createdBy?: string;
  createdAt: string;
  completedAt?: string;
}

export interface NormalizedRefundRequest {
  idempotencyKey: string;
  reason: string;
  includeDeliveryFee: boolean;
  requestedAmount: number;
  items: RefundItemSnapshot[];
}

export class RefundValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'RefundValidationError';
  }
}

function isSafePositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function readString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
}

function readItems(value: unknown): RefundItemInput[] {
  if (!Array.isArray(value) || value.length > 100) {
    throw new RefundValidationError('invalid-refund-items');
  }

  const seen = new Set<number>();
  return value.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new RefundValidationError('invalid-refund-item');
    const item = raw as Record<string, unknown>;
    const lineIndex = item.lineIndex;
    const productId = readString(item.productId, 200);
    const quantity = item.quantity;
    if (!Number.isSafeInteger(lineIndex) || (lineIndex as number) < 0 || !productId || !isSafePositiveInteger(quantity)) {
      throw new RefundValidationError('invalid-refund-item');
    }
    if (seen.has(lineIndex as number)) throw new RefundValidationError('duplicate-refund-item');
    seen.add(lineIndex as number);
    return { lineIndex: lineIndex as number, productId, quantity };
  });
}

function getOrderItem(order: Order, lineIndex: number): OrderItem {
  const item = order.items[lineIndex];
  if (!item) throw new RefundValidationError('refund-item-not-found');
  return item;
}

export function assertRefundableOrder(order: Order): void {
  if (order.paymentStatus !== '결제완료') {
    throw new RefundValidationError('refund-order-not-paid');
  }
  if (order.orderStatus === '취소완료') {
    throw new RefundValidationError('refund-order-canceled');
  }
  if (order.deliveryStatus && !['배송전', '배송준비'].includes(order.deliveryStatus)) {
    throw new RefundValidationError('refund-after-shipment-not-supported');
  }
}

/** Parse and compare replay payloads independently of the current order state. */
export function normalizeRefundPayload(order: Order, body: unknown): NormalizedRefundRequest {
  if (!body || typeof body !== 'object') throw new RefundValidationError('invalid-refund-input');

  const input = body as Record<string, unknown>;
  const idempotencyKey = readString(input.idempotencyKey, 300);
  const reason = readString(input.reason, 200);
  if (!idempotencyKey) throw new RefundValidationError('invalid-refund-idempotency-key');
  if (!reason) throw new RefundValidationError('invalid-refund-reason');
  if (input.includeDeliveryFee !== undefined && typeof input.includeDeliveryFee !== 'boolean') {
    throw new RefundValidationError('invalid-refund-delivery-fee');
  }

  const includeDeliveryFee = input.includeDeliveryFee === true;
  const items = readItems(input.items).map((requested) => {
    const source = getOrderItem(order, requested.lineIndex);
    if (source.productId !== requested.productId || requested.quantity > source.quantity) {
      throw new RefundValidationError('refund-quantity-exceeds-order');
    }
    if (!isSafePositiveInteger(source.price)) {
      throw new RefundValidationError('refund-item-price-invalid');
    }
    const amount = source.price * requested.quantity;
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new RefundValidationError('refund-amount-invalid');
    }
    return {
      ...requested,
      productName: source.productName,
      ...(source.optionId ? { optionId: source.optionId } : {}),
      ...(source.optionName ? { optionName: source.optionName } : {}),
      unitPrice: source.price,
      amount,
    };
  });

  const itemAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const requestedAmount = itemAmount + (includeDeliveryFee ? order.deliveryFee : 0);
  if (!Number.isSafeInteger(requestedAmount) || requestedAmount <= 0) {
    throw new RefundValidationError('refund-amount-invalid');
  }
  if (items.length === 0 && !includeDeliveryFee) {
    throw new RefundValidationError('refund-items-required');
  }

  return { idempotencyKey, reason, includeDeliveryFee, requestedAmount, items };
}

export function normalizeRefundRequest(order: Order, body: unknown): NormalizedRefundRequest {
  assertRefundableOrder(order);
  return normalizeRefundPayload(order, body);
}

export function refundedQuantityByLine(refunds: OrderRefundRecord[]): Map<number, number> {
  const result = new Map<number, number>();
  for (const refund of refunds) {
    if (refund.status !== 'SUCCEEDED') continue;
    for (const item of refund.items) {
      result.set(item.lineIndex, (result.get(item.lineIndex) ?? 0) + item.quantity);
    }
  }
  return result;
}

export function remainingQuantity(orderItem: OrderItem, lineIndex: number, refunds: OrderRefundRecord[]): number {
  const refunded = refundedQuantityByLine(refunds).get(lineIndex) ?? 0;
  return Math.max(0, orderItem.quantity - refunded);
}

export function allRemainingItemsSelected(
  order: Order,
  items: RefundItemInput[],
  refunds: OrderRefundRecord[],
): boolean {
  const requestedByLine = new Map(items.map((item) => [item.lineIndex, item.quantity]));
  return order.items.every(
    (item, lineIndex) => (requestedByLine.get(lineIndex) ?? 0) === remainingQuantity(item, lineIndex, refunds),
  );
}

export function refundStatusLabel(status: RefundStatus): string {
  switch (status) {
    case 'PROCESSING':
      return '처리 중';
    case 'SUCCEEDED':
      return '완료';
    case 'FAILED':
      return '실패';
    case 'UNKNOWN':
      return '확인 필요';
  }
}

