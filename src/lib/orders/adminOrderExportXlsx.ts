import ExcelJS from 'exceljs';
import type { Brand, DeliveryFeeBreakdown, Order, OrderItem } from '@/types';

const COLUMNS = [
  '주문일', '주문번호', '주문자', '연락처', '주소', '주문상태', '결제상태', '배송상태', '결제수단',
  '주문합계', '주문배송비', '총결제금액', '상품번호', '상품명', '옵션', '수량', '상품단가', '상품금액',
  '브랜드ID', '브랜드명', '브랜드상품합계', '브랜드기본배송비', '브랜드적용배송비', '브랜드무료배송',
  '브랜드무료배송기준', '택배사', '송장번호', '배송메모',
] as const;

function safeCell(value: unknown): string | number {
  if (typeof value === 'number') return value;
  const text = value == null ? '' : String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function itemRow(order: Order, item: OrderItem, index: number, brandMap: ReadonlyMap<string, Brand>): (string | number)[] {
  const breakdown = item.brandId ? (order.deliveryFeeBreakdown ?? []).find((row: DeliveryFeeBreakdown) => row.brandId === item.brandId) : undefined;
  const brandName = breakdown?.brandName ?? (item.brandId ? brandMap.get(item.brandId)?.name ?? '' : '');
  return [
    order.createdAt, order.id, order.customerName, order.phone, order.address, order.orderStatus, order.paymentStatus,
    order.deliveryStatus, order.paymentMethod, order.totalPrice, order.deliveryFee, order.totalPrice + order.deliveryFee,
    item.productId, item.productName, item.optionName ?? '', item.quantity, item.price, item.price * item.quantity,
    item.brandId ?? '', brandName, breakdown?.subtotal ?? '', breakdown?.shippingFee ?? '', breakdown?.appliedDeliveryFee ?? '',
    breakdown ? (breakdown.isFreeShipping ? 'Y' : 'N') : '', breakdown?.freeShippingThreshold ?? '', order.carrier ?? '',
    order.trackingNumber ?? '', index === 0 ? order.deliveryMemo ?? '' : '',
  ].map(safeCell);
}

export async function serializeAdminOrdersXlsx(orders: readonly Order[], brands: readonly Brand[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Baekjo Objet';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('주문내역');
  sheet.columns = COLUMNS.map((header) => ({ header, key: header, width: Math.max(12, Math.min(28, header.length + 8)) }));
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F3B34' } };
  header.alignment = { vertical: 'middle' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const brandMap = new Map(brands.map((brand) => [brand.id, brand]));
  for (const order of orders) {
    const items = order.items.length > 0 ? order.items : [{ productId: '', productName: '상품 정보 없음', quantity: 0, price: 0 }];
    items.forEach((item, index) => sheet.addRow(itemRow(order, item, index, brandMap)));
  }
  const output = await workbook.xlsx.writeBuffer();
  return output;
}
