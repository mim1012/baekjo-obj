import { NextResponse } from 'next/server';
import { requireActiveMember } from '@/lib/members/requireActiveMember';
import { createOrderActionRequest, getOrderById, listOrderActionRequests } from '@/lib/orders/repo';
import { listShipmentsByOrder } from '@/lib/shipments/repo';
import {
  brandDeliveryFee,
  brandItems,
  ORDER_ACTION_REQUEST_TYPES,
  reservedQuantityByLine,
  type OrderActionRequestItemInput,
  type OrderActionRequestType,
} from '@/lib/orders/actionRequests';
import { logServerError } from '@/lib/logServerError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REQUESTABLE_DELIVERY = ['배송전', '배송준비'] as const;

function readSelectedItems(value: unknown): OrderActionRequestItemInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) return null;
  const seen = new Set<number>();
  const items: OrderActionRequestItemInput[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') return null;
    const item = raw as Record<string, unknown>;
    if (
      typeof item.lineIndex !== 'number' ||
      !Number.isSafeInteger(item.lineIndex) ||
      item.lineIndex < 0 ||
      typeof item.quantity !== 'number' ||
      !Number.isSafeInteger(item.quantity) ||
      item.quantity <= 0 ||
      seen.has(item.lineIndex)
    ) return null;
    seen.add(item.lineIndex);
    items.push({ lineIndex: item.lineIndex, quantity: item.quantity });
  }
  return items;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  const member = await requireActiveMember();
  if (!member.ok) return member.response;
  try {
    const order = await getOrderById(id);
    if (!order || order.memberId !== member.memberId) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    if (order.orderStatus === '취소완료' || order.paymentStatus === '결제취소' || order.paymentStatus === '환불완료') {
      return NextResponse.json({ error: 'action-request-order-closed' }, { status: 409 });
    }
    return NextResponse.json({ requests: await listOrderActionRequests(id, member.memberId) });
  } catch (error) {
    logServerError('[GET /api/orders/[id]/action-requests] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  const member = await requireActiveMember();
  if (!member.ok) return member.response;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const order = await getOrderById(id);
    if (!order || order.memberId !== member.memberId) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    const requestType: OrderActionRequestType | null = body.requestType === 'CANCEL' || body.requestType === 'REFUND' ? body.requestType : null;
    const brandId = typeof body.brandId === 'string' ? body.brandId.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    const selectedItems = readSelectedItems(body.items);
    if (!requestType || !ORDER_ACTION_REQUEST_TYPES.includes(requestType) || !brandId || !selectedItems || reason.length === 0 || reason.length > 200) {
      return NextResponse.json({ error: 'invalid-action-request' }, { status: 422 });
    }
    const requests = await listOrderActionRequests(id, member.memberId);
    const reserved = reservedQuantityByLine(requests);
    for (const selected of selectedItems) {
      const source = order.items[selected.lineIndex];
      const remaining = source ? source.quantity - (reserved.get(selected.lineIndex) ?? 0) : 0;
      if (!source || source.brandId !== brandId || selected.quantity > remaining) {
        return NextResponse.json({ error: 'action-request-quantity-exceeds-remaining' }, { status: 409 });
      }
    }
    const items = brandItems(order, brandId, selectedItems);
    if (items.length !== selectedItems.length) return NextResponse.json({ error: 'brand-items-not-found' }, { status: 422 });
    const shipment = (await listShipmentsByOrder(id)).find((candidate) => candidate.brandId === brandId)?.deliveryStatus ?? order.deliveryStatus;
    if (requestType === 'CANCEL' && !REQUESTABLE_DELIVERY.includes(shipment as (typeof REQUESTABLE_DELIVERY)[number])) {
      return NextResponse.json({ error: 'action-request-after-shipment-not-supported' }, { status: 409 });
    }
    if (requestType === 'REFUND' && order.paymentStatus !== '결제완료') {
      return NextResponse.json({ error: 'refund-order-not-paid' }, { status: 409 });
    }
    const requestedAmount = items.reduce((sum, item) => sum + item.amount, 0) + brandDeliveryFee(order, brandId, selectedItems);
    const created = await createOrderActionRequest({ orderId: id, memberId: member.memberId, requestType, brandId, items, requestedAmount, reason });
    return NextResponse.json({ request: created }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'action-request-already-exists') return NextResponse.json({ error: error.message }, { status: 409 });
    logServerError('[POST /api/orders/[id]/action-requests] 생성 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
