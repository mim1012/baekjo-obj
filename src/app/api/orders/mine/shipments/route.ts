import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listOrdersByMember } from '@/lib/orders/repo';
import { listShipmentsByOrderIds } from '@/lib/shipments/repo';
import { logServerError } from '@/lib/logServerError';
import type { Shipment } from '@/types';

/**
 * GET /api/orders/mine/shipments — 본인 전체 주문의 업체별 배송 정보를 한 번에 반환(배치).
 * (2026-07-24 신설 — 마이페이지가 주문마다 GET /api/orders/[id]/shipments 를 개별 발사하던
 * N+1 폭풍의 대체 경로. 주문 소유권은 "내 주문 목록에서 시작"하므로 별도 검증이 불필요하다 —
 * listOrdersByMember(memberId)가 반환한 주문 id만 조회 대상이 된다.)
 * 응답: { shipmentsByOrder: Record<orderId, Shipment[]> }
 */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'no-session' }, { status: 401 });
  }

  const memberId = session.user.memberId;
  if (!memberId) {
    return NextResponse.json({ shipmentsByOrder: {} }, { status: 200 });
  }

  try {
    const orders = await listOrdersByMember(memberId);
    const shipments = await listShipmentsByOrderIds(orders.map((order) => order.id));
    const shipmentsByOrder: Record<string, Shipment[]> = {};
    for (const shipment of shipments) {
      (shipmentsByOrder[shipment.orderId] ??= []).push(shipment);
    }
    return NextResponse.json({ shipmentsByOrder }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/orders/mine/shipments] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
