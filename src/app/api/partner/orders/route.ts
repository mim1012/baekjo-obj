import { NextResponse } from 'next/server';
import { requirePartnerOrAdmin } from '@/lib/admin/requireBrandScoped';
import { listPartnerOrders } from '@/lib/partners/orderRead';

export async function GET() {
  const scoped = await requirePartnerOrAdmin();
  const member = scoped.ok ? scoped.requester : null;
  if (!member || (member.role !== 'partner' && member.role !== 'admin')) {
    return scoped.ok ? NextResponse.json({ error: 'forbidden' }, { status: 403 }) : scoped.response;
  }
  const orders = await listPartnerOrders(member.role === 'admin' ? null : (member.managedBrandIds ?? []));
  return NextResponse.json({ orders });
}
