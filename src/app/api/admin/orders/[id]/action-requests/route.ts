import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  completeOrderActionRequest,
  getOrderById,
  listOrderActionRequests,
  transitionOrderActionRequest,
} from '@/lib/orders/repo';
import { logServerError } from '@/lib/logServerError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = ['approve', 'reject', 'complete'] as const;
type ActionRequestAction = (typeof ACTIONS)[number];

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  try {
    if (!(await getOrderById(id))) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({ requests: await listOrderActionRequests(id) });
  } catch (error) {
    logServerError('[GET /api/admin/orders/[id]/action-requests] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}

/**
 * 관리자 승인/반려/취소완료. requestId가 실제로 이 주문(id) 소속인지 listOrderActionRequests로
 * 먼저 확인해(IDOR 방지) RPC 에러 코드를 도메인 에러(HTTP)로 매핑한다.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const requestId = body && typeof body.requestId === 'string' ? body.requestId : '';
    const action = body && typeof body.action === 'string' ? (body.action as string) : '';
    if (!UUID_RE.test(requestId) || !ACTIONS.includes(action as ActionRequestAction)) {
      return NextResponse.json({ error: 'invalid-action-request' }, { status: 422 });
    }

    if (!(await getOrderById(id))) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    const requests = await listOrderActionRequests(id);
    if (!requests.some((candidate) => candidate.id === requestId)) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    const updated =
      action === 'approve'
        ? await transitionOrderActionRequest(requestId, 'APPROVE')
        : action === 'reject'
          ? await transitionOrderActionRequest(requestId, 'REJECT')
          : await completeOrderActionRequest(requestId);

    return NextResponse.json({ request: updated });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'ACTION_REQUEST_NOT_FOUND') return NextResponse.json({ error: 'not-found' }, { status: 404 });
    if (code === 'ACTION_INVALID_TRANSITION' || code === 'ACTION_INVALID_ACTION') {
      return NextResponse.json({ error: 'action-request-invalid-transition' }, { status: 409 });
    }
    if (code === 'ACTION_MANUAL_REFUND_REQUIRED') {
      return NextResponse.json({ error: 'action-request-manual-refund-required' }, { status: 409 });
    }
    if (code === 'ACTION_REFUND_NOT_SETTLED') {
      return NextResponse.json({ error: 'action-request-refund-not-settled' }, { status: 409 });
    }
    logServerError('[POST /api/admin/orders/[id]/action-requests] 처리 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
