import { NextResponse } from 'next/server';
import { requireActiveMember } from '@/lib/members/requireActiveMember';
import { getOrderById } from '@/lib/orders/repo';
import { insertCustomerServiceRequest, listCustomerServiceRequestsByMember } from '@/lib/orders/customerServiceRepo';
import type { CustomerServiceRequestType } from '@/types';
import { logServerError } from '@/lib/logServerError';

const TYPES = new Set<CustomerServiceRequestType>(['exchange', 'return']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET() {
  const member = await requireActiveMember();
  if (!member.ok) return member.response;
  try {
    return NextResponse.json({ requests: await listCustomerServiceRequestsByMember(member.memberId) });
  } catch (error) {
    logServerError('[GET /api/orders/requests] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const member = await requireActiveMember();
  if (!member.ok) return member.response;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.orderId !== 'string' || !UUID_RE.test(body.orderId)
    || typeof body.sellerKey !== 'string' || body.sellerKey.length === 0 || body.sellerKey.length > 200
    || typeof body.type !== 'string' || !TYPES.has(body.type as CustomerServiceRequestType)
    || typeof body.reason !== 'string' || body.reason.trim().length < 5 || body.reason.length > 1000) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  try {
    const order = await getOrderById(body.orderId);
    if (!order || order.memberId !== member.memberId) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    if (['취소요청', '부분취소', '취소완료'].includes(order.orderStatus) || order.paymentStatus !== '결제완료') {
      return NextResponse.json({ error: 'request-not-allowed' }, { status: 409 });
    }
    if (!(order.sellerGroups ?? []).some((group) => group.key === body.sellerKey)) {
      return NextResponse.json({ error: 'invalid-seller' }, { status: 400 });
    }
    const serviceRequest = await insertCustomerServiceRequest({
      orderId: order.id,
      memberId: member.memberId,
      sellerKey: body.sellerKey,
      type: body.type as CustomerServiceRequestType,
      reason: body.reason.trim(),
    });
    return NextResponse.json({ request: serviceRequest }, { status: 201 });
  } catch (error) {
    if (error && typeof error === 'object' && (error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'request-already-open' }, { status: 409 });
    }
    if (error && typeof error === 'object' && (error as { message?: string }).message?.includes('CUSTOMER_REQUEST_NOT_ALLOWED')) {
      return NextResponse.json({ error: 'request-not-allowed' }, { status: 409 });
    }
    logServerError('[POST /api/orders/requests] 생성 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
