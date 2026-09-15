import type { Order, OrderItem, OrderStatus } from '@/types';
import type { OrderRefundRecord } from '@/lib/orders/refund';

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

/**
 * 아이템 자체의 취소/환불 처리 상태. 요청(request) 레벨 status와 값 집합은 같지만 의미가 다르다 —
 * 아이템 레벨이 진실 소스이고, 요청 레벨 status는 이 아이템들에서 deriveRequestStatus로 파생된
 * advisory 값이다(요청 1건에 상품이 여러 개면 상품별로 승인·반려·완료가 갈릴 수 있다).
 */
export type OrderActionRequestItemStatus = OrderActionRequestStatus;

/**
 * DB에 저장된(id·상태가 부여된) 아이템. brandItems()가 만드는 생성 시점 스냅샷(OrderActionRequestItem)과
 * 달리 id/status를 갖는다. OrderActionRequestRecord.items는 이 타입이다.
 */
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

/**
 * action-request 도메인 전용 에러 코드. SQL(RPC, PT409/40001 매핑) 예외 메시지를 서버(repo.ts)가 이
 * 코드로 매핑해 던진다 — 지금까지 이 도메인엔 코드 유니온이 없었으므로 refund.ts의 RefundValidationError
 * 패턴(코드 문자열 + Error 서브클래스)을 그대로 따른다.
 */
export const ORDER_ACTION_REQUEST_ERROR_CODES = [
  /** 결제대기·입금대기(미결제) 주문의 잔여 수량 중 일부만 승인분으로 완료 처리하려는 시도. 전량만 허용. */
  'ACTION_UNPAID_PARTIAL_NOT_SUPPORTED',
  /** 결제완료(카드) 주문의 완료 처리 승인분이 SUCCEEDED 환불로 아직 정산되지 않음. */
  'ACTION_REFUND_NOT_SETTLED',
  /** 결제완료이지만 payment_key가 없는(무통장 등) 주문 — 시스템이 자동 환불 증빙을 낼 수 없어 수기 처리 필요. */
  'ACTION_MANUAL_REFUND_REQUIRED',
] as const;
export type OrderActionRequestErrorCode = (typeof ORDER_ACTION_REQUEST_ERROR_CODES)[number];

export class OrderActionRequestError extends Error {
  constructor(public readonly code: OrderActionRequestErrorCode) {
    super(code);
    this.name = 'OrderActionRequestError';
  }
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
  // 같은 브랜드 안에 실제 판매자가 여러 곳이면 DeliveryFeeBreakdown 행이 브랜드당 여러 개다
  // (sellerKey로 구분). find()는 첫 행만 잡아 나머지 판매자 배송비를 누락한다(defect i) — orderPolicy.ts가
  // 전체 배송비를 낼 때 breakdown 전량을 reduce로 합산하는 관례와 맞춰 브랜드 일치 행 전량을 합산한다.
  return (order.deliveryFeeBreakdown ?? [])
    .filter((line) => line.brandId === brandId)
    .reduce((sum, line) => sum + line.appliedDeliveryFee, 0);
}

/**
 * 아이템(라인) 단위 상태가 진실 소스다 — REJECTED 아이템만 잔여 수량을 해제하고,
 * REQUESTED/APPROVED/COMPLETED 아이템은 계속 예약(잔여 수량에서 제외)된다.
 */
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
 * 아이템 상태 배열에서 요청(request) 레벨 status를 파생한다. 아이템 레벨 상태가 진실 소스가 된 이후
 * order_action_requests.status 컬럼은 advisory일 뿐이다 — 실제 판정은 이 함수로 한다.
 * 규칙: 전체 REJECTED면 REJECTED / COMPLETED가 있고 REQUESTED·APPROVED가 없으면 COMPLETED /
 * APPROVED가 있고 REQUESTED가 없으면 APPROVED / 그 외(REQUESTED가 남아있는 모든 경우)는 REQUESTED.
 */
export function deriveRequestStatus(
  items: readonly { status: OrderActionRequestItemStatus }[],
): OrderActionRequestStatus {
  if (items.length === 0) return 'REQUESTED';
  if (items.every((item) => item.status === 'REJECTED')) return 'REJECTED';

  const hasRequested = items.some((item) => item.status === 'REQUESTED');
  const hasApproved = items.some((item) => item.status === 'APPROVED');
  const hasCompleted = items.some((item) => item.status === 'COMPLETED');

  if (hasCompleted && !hasRequested && !hasApproved) return 'COMPLETED';
  if (hasApproved && !hasRequested) return 'APPROVED';
  return 'REQUESTED';
}

export interface AggregateOrderCancelStatusInput {
  order: Pick<Order, 'items' | 'orderStatus' | 'paymentStatus' | 'deliveryFee'>;
  /** 이 주문에 걸린 모든 액션 요청(브랜드·요청 종류 무관)의 아이템을 평평하게 모은 배열. */
  items: readonly OrderActionRequestItemState[];
  refunds: readonly OrderRefundRecord[];
}

/**
 * 주문 전체의 취소 집계 상태 — "취소 완료는 스스로 재고를 복원하지 않는다" 계약의 상태 축.
 * 우선순위(활성 > 완료 > 전량반려)가 곧 규칙이다:
 * 1. 행이 없으면(아직 액션 요청이 전혀 없음) 현재 orderStatus를 그대로 둔다.
 * 2. REQUESTED/APPROVED(활성) 수량이 있으면 전량이면 취소요청, 일부면 부분취소.
 * 3. 활성 수량이 없고 COMPLETED 수량이 있으면: 전량 커버 시 취소완료 — 단 결제완료+배송비>0인데
 *    배송비를 포함한 SUCCEEDED 환불이 아직 없으면 부분취소완료로 상한(배송비 환불 창구를 계속 열어둔다).
 *    부분 커버면 항상 부분취소완료.
 * 4. 활성·완료 수량이 모두 0이면(즉 전량 REJECTED) 현재값이 취소요청/부분취소일 때만 주문접수로
 *    되돌린다 — 그 외 상태(예: 이미 취소완료 등)는 절대 내려가지 않는다.
 */
export function aggregateOrderCancelStatus({
  order,
  items,
  refunds,
}: AggregateOrderCancelStatusInput): OrderStatus {
  if (items.length === 0) return order.orderStatus;

  const totalOrdered = order.items.reduce((sum, item) => sum + (item.quantity > 0 ? item.quantity : 0), 0);
  let activeQty = 0;
  let completedQty = 0;
  for (const item of items) {
    if (item.status === 'REQUESTED' || item.status === 'APPROVED') activeQty += item.quantity;
    else if (item.status === 'COMPLETED') completedQty += item.quantity;
  }

  if (activeQty > 0) {
    return activeQty >= totalOrdered ? '취소요청' : '부분취소';
  }

  if (completedQty > 0) {
    if (completedQty < totalOrdered) return '부분취소완료';
    const hasDeliveryFeeRefund = refunds.some((refund) => refund.status === 'SUCCEEDED' && refund.includeDeliveryFee);
    if (order.paymentStatus === '결제완료' && order.deliveryFee > 0 && !hasDeliveryFeeRefund) {
      return '부분취소완료';
    }
    return '취소완료';
  }

  if (order.orderStatus === '취소요청' || order.orderStatus === '부분취소') return '주문접수';
  return order.orderStatus;
}

/**
 * 특정 라인의 잔여(아직 취소·환불 요청/완료로 묶이지 않은) 수량. CANCEL/REFUND 요청 종류를 가리지
 * 않고 REJECTED가 아닌 모든 액션 요청 아이템과, 이미 SUCCEEDED로 정산된 환불 수량을 함께 뺀다 —
 * 두 트랙(액션 요청·환불)이 같은 라인을 동시에 건드릴 수 있어(defect) 어느 한쪽만 보면 초과 요청을 막지 못한다.
 */
export function remainingLineQuantity(
  order: Pick<Order, 'items'>,
  lineIndex: number,
  items: readonly OrderActionRequestItemState[],
  refunds: readonly OrderRefundRecord[],
): number {
  const orderItem = order.items[lineIndex];
  if (!orderItem) return 0;

  const reservedByActionRequest = items
    .filter((item) => item.lineIndex === lineIndex && item.status !== 'REJECTED')
    .reduce((sum, item) => sum + item.quantity, 0);

  let refundedQty = 0;
  for (const refund of refunds) {
    if (refund.status !== 'SUCCEEDED') continue;
    for (const refundItem of refund.items) {
      if (refundItem.lineIndex === lineIndex) refundedQty += refundItem.quantity;
    }
  }

  return Math.max(0, orderItem.quantity - reservedByActionRequest - refundedQty);
}
