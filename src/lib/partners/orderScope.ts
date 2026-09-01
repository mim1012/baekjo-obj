import type { OrderItem, Shipment } from '@/types';

export type ScopedOrderLike = {
  id: string;
  customerName: string;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
  totalPrice: number;
  deliveryFee: number;
  paymentMethod: string;
  items: OrderItem[];
};
export type PartnerOrderView = ScopedOrderLike & { shipment: Shipment | null };

export function projectPartnerOrder(order: ScopedOrderLike | null, brandIds: string[], shipments: Shipment[]): PartnerOrderView | null {
  if (!order) return null;
  const items = order.items.filter((item) => typeof item.brandId === 'string' && brandIds.includes(item.brandId));
  if (items.length === 0) return null;
  const brands = new Set(items.map((item) => item.brandId));
  return { ...order, items, shipment: shipments.find((shipment) => brands.has(shipment.brandId)) ?? null };
}
