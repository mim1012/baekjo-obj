import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { updateSellerAcceptance } from '@/lib/orders/sellerAcceptanceRepo';
import { getOrderById } from '@/lib/orders/repo';
import type { SellerAcceptance } from '@/types';
import { logServerError } from '@/lib/logServerError';

const STATUSES = new Set<SellerAcceptance['status']>(['pending', 'accepted', 'rejected', 'cancelled']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, context: { params: Promise<{ id: string; sellerKey: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return admin.response;
  const { id, sellerKey } = await context.params;
  let decodedSellerKey: string;
  try { decodedSellerKey = decodeURIComponent(sellerKey); }
  catch { return NextResponse.json({ error: 'not-found' }, { status: 404 }); }
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!UUID_RE.test(id) || decodedSellerKey.length === 0 || decodedSellerKey.length > 200) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }
  if (!body || typeof body.status !== 'string' || !STATUSES.has(body.status as SellerAcceptance['status'])
    || (body.note !== undefined && (typeof body.note !== 'string' || body.note.length > 1000))) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }
  try {
    const order = await getOrderById(id);
    if (!order) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    const terminal = order.orderStatus === '취소완료' || ['결제취소', '환불완료'].includes(order.paymentStatus);
    if (terminal && body.status !== 'cancelled') {
      return NextResponse.json({ error: 'terminal-order' }, { status: 409 });
    }
    const acceptance = await updateSellerAcceptance({ orderId: id, sellerKey: decodedSellerKey, status: body.status as SellerAcceptance['status'], note: typeof body.note === 'string' ? body.note.trim() : undefined });
    if (!acceptance) return NextResponse.json({ error: 'not-found' }, { status: 404 });
    return NextResponse.json({ acceptance });
  } catch (error) {
    if (error && typeof error === 'object' && (error as { message?: string }).message?.includes('TERMINAL_ORDER_ACCEPTANCE_LOCKED')) {
      return NextResponse.json({ error: 'terminal-order' }, { status: 409 });
    }
    logServerError('[PATCH seller-acceptances] 수정 실패', error);
    return NextResponse.json({ error: 'server-error' }, { status: 500 });
  }
}
