import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getOrderById } from '@/lib/orders/repo';
import { listShipmentsByOrder } from '@/lib/shipments/repo';
import { logServerError } from '@/lib/logServerError';

// order.id는 uuid 컬럼이라 형식이 잘못된 id를 그대로 조회하면 Supabase가 "invalid input syntax for
// type uuid" 에러를 던져 500으로 새 나간다 — 형식만 먼저 걸러 존재하지 않는 주문과 동일하게 404로 접는다.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/admin/orders/[id]/shipments — 관리자 주문 상세가 한 주문에 딸린 모든 업체별 송장을 읽는다.
 * proxy 1차 가드 + requireAdmin DB 재검증(강등/비활성 stale JWT 차단).
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  try {
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    const shipments = await listShipmentsByOrder(id);
    return NextResponse.json({ shipments }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/admin/orders/[id]/shipments] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
