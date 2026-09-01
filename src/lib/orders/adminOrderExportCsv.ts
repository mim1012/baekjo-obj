import type { Brand, DeliveryFeeBreakdown, Order, OrderItem } from '@/types';

export const CSV_UTF8_BOM = '\uFEFF';

const CSV_COLUMNS = [
  '주문일',
  '주문번호',
  '주문자',
  '연락처',
  '주소',
  '주문상태',
  '결제상태',
  '배송상태',
  '결제수단',
  '주문합계',
  '주문배송비',
  '총결제금액',
  '상품번호',
  '상품명',
  '옵션',
  '수량',
  '상품단가',
  '상품금액',
  '브랜드ID',
  '브랜드명',
  '브랜드상품합계',
  '브랜드기본배송비',
  '브랜드적용배송비',
  '브랜드무료배송',
  '브랜드무료배송기준',
  '택배사',
  '송장번호',
  '배송메모',
] as const;

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value);
}

function excelSafeCell(value: unknown): string {
  const raw = text(value);
  return /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
}

function csvCell(value: unknown): string {
  const safe = excelSafeCell(value);
  return `"${safe.replace(/"/g, '""')}"`;
}

function itemAmount(item: OrderItem): number {
  return item.price * item.quantity;
}

function breakdownForItem(
  item: OrderItem,
  breakdowns: readonly DeliveryFeeBreakdown[],
): DeliveryFeeBreakdown | undefined {
  return item.brandId ? breakdowns.find((row) => row.brandId === item.brandId) : undefined;
}

function brandNameForItem(
  item: OrderItem,
  breakdown: DeliveryFeeBreakdown | undefined,
  brandMap: ReadonlyMap<string, Brand>,
): string {
  if (breakdown?.brandName) return breakdown.brandName;
  if (item.brandId) return brandMap.get(item.brandId)?.name ?? '';
  return '';
}

function rowValues(order: Order, item: OrderItem, index: number, brandMap: ReadonlyMap<string, Brand>): string[] {
  const breakdown = breakdownForItem(item, order.deliveryFeeBreakdown ?? []);
  return [
    order.createdAt,
    order.id,
    order.customerName,
    order.phone,
    order.address,
    order.orderStatus,
    order.paymentStatus,
    order.deliveryStatus,
    order.paymentMethod,
    String(order.totalPrice),
    String(order.deliveryFee),
    String(order.totalPrice + order.deliveryFee),
    item.productId,
    item.productName,
    item.optionName ?? '',
    String(item.quantity),
    String(item.price),
    String(itemAmount(item)),
    item.brandId ?? '',
    brandNameForItem(item, breakdown, brandMap),
    breakdown ? String(breakdown.subtotal) : '',
    breakdown ? String(breakdown.shippingFee) : '',
    breakdown ? String(breakdown.appliedDeliveryFee) : '',
    breakdown ? (breakdown.isFreeShipping ? 'Y' : 'N') : '',
    breakdown?.freeShippingThreshold !== undefined ? String(breakdown.freeShippingThreshold) : '',
    order.carrier ?? '',
    order.trackingNumber ?? '',
    index === 0 ? (order.deliveryMemo ?? '') : '',
  ];
}

export function serializeAdminOrdersCsv(orders: readonly Order[], brands: readonly Brand[]): string {
  const brandMap = new Map(brands.map((brand) => [brand.id, brand]));
  const rows = [CSV_COLUMNS.map(csvCell).join(',')];
  for (const order of orders) {
    const items = order.items.length > 0 ? order.items : [undefined];
    for (const [index, item] of items.entries()) {
      const row = item
        ? rowValues(order, item, index, brandMap)
        : rowValues(
            order,
            { productId: '', productName: '상품 정보 없음', quantity: 0, price: 0 },
            index,
            brandMap,
          );
      rows.push(row.map(csvCell).join(','));
    }
  }
  return `${CSV_UTF8_BOM}${rows.join('\r\n')}\r\n`;
}
