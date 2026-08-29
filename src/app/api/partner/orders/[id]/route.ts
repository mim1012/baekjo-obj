import { NextResponse } from 'next/server';
import { requirePartnerOrAdmin } from '@/lib/admin/requireBrandScoped';
import { getOrderById } from '@/lib/orders/repo';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const scoped = await requirePartnerOrAdmin();
  if (!scoped.ok) return scoped.response;
  const { id } = await context.params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  const brandIds = scoped.requester.role === 'admin' ? null : (scoped.requester.managedBrandIds ?? []);
  const items = brandIds ? order.items.filter((item) => item.brandId && brandIds.includes(item.brandId)) : order.items;
  if (items.length === 0) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  return NextResponse.json({ order: { id: order.id, customerName: order.customerName, orderStatus: order.orderStatus, paymentStatus: order.paymentStatus, items } });
}
