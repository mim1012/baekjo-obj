import type { Order, OrderItem, Shipment } from '@/types';

export function isShipmentPurchaseConfirmed(
  shipment: Pick<Shipment, 'deliveryStatus' | 'confirmedAt'> | undefined,
): boolean {
  return shipment?.deliveryStatus === '구매확정' || Boolean(shipment?.confirmedAt);
}

export function canReviewOrderItem(
  order: Pick<Order, 'id'>,
  item: Pick<OrderItem, 'brandId'>,
  shipments: readonly Shipment[],
): boolean {
  if (!item.brandId) return false;
  return shipments.some(
    (shipment) =>
      shipment.orderId === order.id &&
      shipment.brandId === item.brandId &&
      isShipmentPurchaseConfirmed(shipment),
  );
}
