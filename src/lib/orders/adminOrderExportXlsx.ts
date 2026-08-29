import ExcelJS from 'exceljs';
import type { Brand, DeliveryFeeBreakdown, Order, OrderItem } from '@/types';

const COLUMNS = [
  '주문번호', '주문일시', '브랜드명(업체명)', '상품명', '옵션', '판매수량', '상품 판매금액 합계', '배송비 합계',
  '최종 결제금액', '구매자명', '연락처', '주문상태', '취소·환불 여부', '송장번호',
] as const;

function safeCell(value: unknown): string | number {
  if (typeof value === 'number') return value;
  const text = value == null ? '' : String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function itemRow(order: Order, item: OrderItem, firstBrandRow: boolean, brandMap: ReadonlyMap<string, Brand>): (string | number)[] {
  const breakdown = item.brandId ? (order.deliveryFeeBreakdown ?? []).find((row: DeliveryFeeBreakdown) => row.brandId === item.brandId) : undefined;
  const brandName = breakdown?.brandName ?? (item.brandId ? brandMap.get(item.brandId)?.name ?? '' : '');
  const canceled = order.orderStatus === '취소요청' || order.orderStatus === '취소완료' || order.paymentStatus === '결제취소' || order.paymentStatus === '환불완료';
  return [
    order.id, order.createdAt, brandName, item.productName, item.optionName ?? '', item.quantity, item.price * item.quantity,
    firstBrandRow ? (breakdown?.appliedDeliveryFee ?? (item.brandId ? 0 : order.deliveryFee)) : 0,
    item.price * item.quantity + (firstBrandRow ? (breakdown?.appliedDeliveryFee ?? (item.brandId ? 0 : order.deliveryFee)) : 0), order.customerName, order.phone, order.orderStatus, canceled ? 'Y' : 'N', order.trackingNumber ?? '',
  ].map(safeCell);
}

export async function serializeAdminOrdersXlsx(orders: readonly Order[], brands: readonly Brand[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Baekjo Objet';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('주문내역');
  sheet.columns = COLUMNS.map((header) => ({ header, key: header, width: 14 }));
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F3B34' } };
  header.alignment = { vertical: 'middle' };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const brandMap = new Map(brands.map((brand) => [brand.id, brand]));
  const rowsByBrand = new Map<string, { rows: (string | number)[][]; quantity: number; productAmount: number; shipping: number; finalAmount: number; name: string }>();
  for (const order of orders) {
    const items = order.items.length > 0 ? order.items : [{ productId: '', productName: '상품 정보 없음', quantity: 0, price: 0 }];
    const seenOrderBrands = new Set<string>();
    for (const item of items) {
      const brandKey = item.brandId ?? '__legacy__';
      const firstBrandRow = !seenOrderBrands.has(brandKey);
      seenOrderBrands.add(brandKey);
      const row = itemRow(order, item, firstBrandRow, brandMap);
      const entry = rowsByBrand.get(brandKey) ?? { rows: [], quantity: 0, productAmount: 0, shipping: 0, finalAmount: 0, name: String(row[2] ?? '미지정 업체') };
      entry.rows.push(row);
      entry.quantity += item.quantity;
      entry.productAmount += item.price * item.quantity;
      entry.shipping += Number(row[7] ?? 0);
      entry.finalAmount += Number(row[8] ?? 0);
      rowsByBrand.set(brandKey, entry);
    }
  }
  for (const entry of rowsByBrand.values()) {
    entry.rows.forEach((row) => sheet.addRow(row));
    const subtotal = sheet.addRow(['', '', `${entry.name} 총합계`, '', '', entry.quantity, entry.productAmount, entry.shipping, entry.finalAmount, '', '', '', '', '']);
    subtotal.font = { bold: true };
    subtotal.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFECE3' } };
  }
  for (const column of sheet.columns) {
    let width = String(column.header ?? '').length + 2;
    if (column.eachCell) {
      column.eachCell({ includeEmpty: false }, (cell) => {
        width = Math.max(width, String(cell.value ?? '').length + 2);
      });
    }
    column.width = Math.max(12, Math.min(34, width));
  }
  const output = await workbook.xlsx.writeBuffer();
  return output;
}
