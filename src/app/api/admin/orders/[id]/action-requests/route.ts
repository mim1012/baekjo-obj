import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import {
  completeOrderActionRequest,
  getOrderById,
  listOrderActionRequests,
  transitionOrderActionRequest,
} from '@/lib/orders/repo';
import { OrderActionRequestError, type OrderActionRequestErrorCode } from '@/lib/orders/actionRequests';
import { logServerError } from '@/lib/logServerError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIONS = ['approve', 'reject', 'complete'] as const;
type ActionRequestAction = (typeof ACTIONS)[number];

// 관리자 화면에 그대로 노출하는 운영자용 한국어 문구 — OrderActionRequestError의 3코드 +
// 상태전이 실패(ACTION_INVALID_TRANSITION/ACTION_INVALID_ACTION, transition_action_request/
// complete_action_request_and_restore가 raise)를 포함한다.
const ACTION_REQUEST_ERROR_MESSAGES: Record<string, string> = {
  ACTION_UNPAID_PARTIAL_NOT_SUPPORTED: '결제 전 주문은 부분 취소 완료를 지원하지 않습니다 — 전량 취소만 가능합니다',
  ACTION_REFUND_NOT_SETTLED: '환불이 완료된 뒤에만 취소 완료 처리할 수 있습니다',
  ACTION_MANUAL_REFUND_REQUIRED: '무통장 결제 주문은 환불 처리 후 완료할 수 있습니다',
  ACTION_INVALID_TRANSITION: '현재 상태에서는 수행할 수 없는 작업입니다',
};

// 위 표에 없는 나머지 도메인 코드(ACTION_INVALID_ACTION·ACTION_REQUEST_ALREADY_EXISTS·
// ACTION_QUANTITY_EXCEEDS_REMAINING·ACTION_CONFLICT 등, 이 라우트에선 정상 경로로는 안 나오지만
// repo.ts가 미래의 새 SQL 코드까지 안전하게 폴백시킨다)는 이 기본 문구로 409 처리한다 — 500으로
// 흘려 관리자가 "서버 오류"로 오인하지 않게 한다.
const DEFAULT_ACTION_REQUEST_CONFLICT_MESSAGE = '현재 상태에서는 수행할 수 없는 작업입니다';

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
 * 먼저 확인해(IDOR 방지) RPC 도메인 에러를 운영자 문구가 붙은 409로 매핑한다.
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
      return NextResponse.json({ error: 'invalid-action-request' }, { status: 400 });
    }

    if (!(await getOrderById(id))) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    const requests = await listOrderActionRequests(id);
    if (!requests.some((candidate) => candidate.id === requestId)) {
      return NextResponse.json({ error: 'not-found' }, { status: 404 });
    }

    if (action === 'approve' || action === 'reject') {
      await transitionOrderActionRequest({ orderId: id, requestId, action, actorId: admin.requester.id });
    } else {
      await completeOrderActionRequest({ orderId: id, requestId, actorId: admin.requester.id });
    }

    return NextResponse.json({ ok: true, requests: await listOrderActionRequests(id) });
  } catch (error) {
    if (error instanceof OrderActionRequestError) {
      const code: OrderActionRequestErrorCode = error.code;
      return NextResponse.json(
        { error: code, message: ACTION_REQUEST_ERROR_MESSAGES[code] ?? DEFAULT_ACTION_REQUEST_CONFLICT_MESSAGE },
        { status: 409 },
      );
    }
    const code = error instanceof Error ? error.message : '';
    if (code === 'ACTION_REQUEST_NOT_FOUND') return NextResponse.json({ error: 'not-found' }, { status: 404 });
    if (code.startsWith('ACTION_')) {
      return NextResponse.json(
        { error: code, message: ACTION_REQUEST_ERROR_MESSAGES[code] ?? DEFAULT_ACTION_REQUEST_CONFLICT_MESSAGE },
        { status: 409 },
      );
    }
    logServerError('[POST /api/admin/orders/[id]/action-requests] 처리 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
