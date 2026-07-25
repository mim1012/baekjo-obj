import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listOrdersByMember } from '@/lib/orders/repo';
import { listShipmentsByOrders } from '@/lib/shipments/repo';
import { logServerError } from '@/lib/logServerError';

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' };

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'no-session' }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const memberId = session.user.memberId;
  if (!memberId) {
    return NextResponse.json({ shipments: [] }, { status: 200, headers: NO_STORE_HEADERS });
  }

  try {
    const orders = await listOrdersByMember(memberId);
    const shipments = await listShipmentsByOrders(orders.map((order) => order.id));
    return NextResponse.json({ shipments }, { status: 200, headers: NO_STORE_HEADERS });
  } catch (error) {
    logServerError('[GET /api/orders/mine/shipments] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
