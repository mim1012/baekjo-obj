import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getCustomerServiceRequestById, updateCustomerServiceRequest } from '@/lib/orders/customerServiceRepo';
import { isCustomerServiceRequestTransitionAllowed } from '@/lib/orders/customerServiceState';
import type { CustomerServiceRequestStatus } from '@/types';
import { logServerError } from '@/lib/logServerError';

const STATUSES = new Set<CustomerServiceRequestStatus>(['received', 'reviewing', 'approved', 'rejected', 'completed']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { id } = await context.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.status !== 'string' || !STATUSES.has(body.status as CustomerServiceRequestStatus)
    || (body.adminNote !== undefined && (typeof body.adminNote !== 'string' || body.adminNote.length > 2000))) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  try {
    const current = await getCustomerServiceRequestById(id);
    if (!current) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    if (!isCustomerServiceRequestTransitionAllowed(current.status, body.status as CustomerServiceRequestStatus)) {
      return NextResponse.json({ error: 'invalid-status-transition' }, { status: 409 });
    }
    const serviceRequest = await updateCustomerServiceRequest(id, { status: body.status as CustomerServiceRequestStatus, adminNote: typeof body.adminNote === 'string' ? body.adminNote.trim() : undefined });
    if (!serviceRequest) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({ request: serviceRequest });
  } catch (error) {
    if (error && typeof error === 'object' && (error as { message?: string }).message?.includes('INVALID_CUSTOMER_REQUEST_STATUS_TRANSITION')) {
      return NextResponse.json({ error: 'invalid-status-transition' }, { status: 409 });
    }
    logServerError('[PATCH /api/admin/order-requests/[id]] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
