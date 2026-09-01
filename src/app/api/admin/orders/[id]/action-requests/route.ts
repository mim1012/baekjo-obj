import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { getOrderById, listOrderActionRequests } from '@/lib/orders/repo';
import { logServerError } from '@/lib/logServerError';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
