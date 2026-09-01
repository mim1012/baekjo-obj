import type { Shipment } from '@/types';
import { listAllOrders } from '@/lib/orders/repo';
import { listShipmentsByOrder } from '@/lib/shipments/repo';
import type { OrderDateRange } from '@/lib/orders/orderDateFilters';
import { projectPartnerOrder, type PartnerOrderView } from '@/lib/partners/orderScope';

export async function listPartnerOrders(brandIds: string[] | null, range?: OrderDateRange): Promise<PartnerOrderView[]> {
  if (brandIds && brandIds.length === 0) return [];
  const orders = await listAllOrders(range);
  const result: PartnerOrderView[] = [];
  for (const order of orders) {
    const shipments: Shipment[] = await listShipmentsByOrder(order.id);
    const view = brandIds ? projectPartnerOrder(order, brandIds, shipments) : { ...order, shipment: shipments[0] ?? null };
    if (view) result.push(view);
  }
  return result;
}
