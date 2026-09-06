import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { listAllCustomerServiceRequests } from '@/lib/orders/customerServiceRepo';
import { logServerError } from '@/lib/logServerError';

export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  try {
    return NextResponse.json({ requests: await listAllCustomerServiceRequests() });
  } catch (error) {
    logServerError('[GET /api/admin/order-requests] 조회 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
