import { NextResponse, type NextRequest } from 'next/server';
import { requirePartnerOrAdmin } from '@/lib/admin/requireBrandScoped';
import { parseOrderDateRange } from '@/lib/orders/orderDateFilters';
import { listPartnerOrders } from '@/lib/partners/orderRead';

function firstQueryValue(params: URLSearchParams, key: string): string {
  return (params.get(key) ?? '').trim();
}

export async function GET(request: NextRequest) {
  const scoped = await requirePartnerOrAdmin();
  const member = scoped.ok ? scoped.requester : null;
  if (!member || (member.role !== 'partner' && member.role !== 'admin')) {
    return scoped.ok ? NextResponse.json({ error: 'forbidden' }, { status: 403 }) : scoped.response;
  }

  const parsedRange = parseOrderDateRange({
    createdFrom: firstQueryValue(request.nextUrl.searchParams, 'from'),
    createdTo: firstQueryValue(request.nextUrl.searchParams, 'to'),
  });
  if (!parsedRange.ok) {
    return NextResponse.json({ error: parsedRange.error }, { status: 400 });
  }

  const orders = await listPartnerOrders(
    member.role === 'admin' ? null : (member.managedBrandIds ?? []),
    parsedRange.range,
  );
  return NextResponse.json({ orders });
}
