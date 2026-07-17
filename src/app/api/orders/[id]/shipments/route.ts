import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { findMemberById } from '@/lib/members/repo';
import { getOrderById } from '@/lib/orders/repo';
import { listShipmentsByOrder } from '@/lib/shipments/repo';
import { logServerError } from '@/lib/logServerError';

// order.id는 uuid 컬럼이라 형식이 잘못된 id를 그대로 조회하면 Supabase가 500을 던진다 — 형식만 먼저
// 걸러 존재하지 않는 주문과 동일하게 404로 접는다(존재 은폐 + 500 누출 방지).
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/orders/[id]/shipments — 내 주문의 업체별 송장 목록(마이페이지 배송 모달).
 * 소유자(session.memberId === order.memberId) 또는 admin일 때만 200. 그 외는 주문 존재 자체를
 * 은폐하기 위해 403이 아니라 404를 준다(IDOR 방지). admin 판정은 JWT role만 신뢰하지 않고 DB에서
 * findMemberById로 재확인한다(GET /api/orders/[id]와 동일 패턴). 게스트 주문은 이 경로를 쓰지 않는다.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  try {
    const session = await auth();
    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    const memberId = session?.user?.memberId;
    const isOwner = Boolean(memberId) && order.memberId === memberId;

    let isAdmin = false;
    if (!isOwner && session?.user?.role === 'admin' && session.user.memberId) {
      const requester = await findMemberById(session.user.memberId);
      isAdmin = requester !== null && requester.role === 'admin' && requester.status !== 'inactive';
    }

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    const shipments = await listShipmentsByOrder(id);
    return NextResponse.json({ shipments }, { status: 200 });
  } catch (error) {
    logServerError('[GET /api/orders/[id]/shipments] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
