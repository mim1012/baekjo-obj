import { NextResponse } from 'next/server';
import { requireActiveMember } from '@/lib/members/requireActiveMember';
import { getOrderById, requestOrderCancellation } from '@/lib/orders/repo';
import { logServerError } from '@/lib/logServerError';
import { isCancellationRequestAllowed } from '@/lib/orders/cancellation';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'not-found' }, { status: 404 });

  const activeMember = await requireActiveMember();
  if (!activeMember.ok) return activeMember.response;

  try {
    const order = await getOrderById(id);
    if (!order || order.memberId !== activeMember.memberId) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }
    if (order.orderStatus === '취소요청') {
      return NextResponse.json({ ok: true, orderStatus: '취소요청' }, { status: 200 });
    }
    if (!isCancellationRequestAllowed(order)) {
      return NextResponse.json({ error: 'cancel-request-not-allowed' }, { status: 409 });
    }

    const requested = await requestOrderCancellation(id, activeMember.memberId);
    if (!requested) {
      return NextResponse.json({ error: 'cancel-request-conflict' }, { status: 409 });
    }
    return NextResponse.json({ ok: true, orderStatus: '취소요청' }, { status: 200 });
  } catch (error) {
    logServerError('[POST /api/orders/[id]/cancel-request] 취소 요청 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
