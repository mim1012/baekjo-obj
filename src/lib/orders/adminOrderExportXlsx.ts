import ExcelJS from 'exceljs';
import {
  ADMIN_ORDER_BRAND_SUMMARY_COLUMNS,
  ADMIN_ORDER_DETAIL_COLUMNS,
  buildAdminOrderReport,
  type AdminOrderReportDetailRow,
  type AdminOrderReportInput,
  type AdminOrderProductSummaryRow,
} from '@/lib/orders/adminOrderReporting';

function safeCell(value: unknown): string | number {
  if (typeof value === 'number') return value;
  const text = value == null ? '' : String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function detailValues(row: AdminOrderReportDetailRow): (string | number)[] {
  return [
    row.orderId,
    row.createdAt,
    row.brandName,
    row.productName,
    row.optionName,
    row.quantity,
    row.productAmount,
    row.shipping,
    row.finalAmount,
    row.customerName,
    row.phone,
    row.address,
    row.orderStatus,
    row.cancelRefundFlag,
    row.trackingNumber,
  ].map(safeCell);
}

function summaryValues(brandName: string, row: AdminOrderProductSummaryRow): (string | number)[] {
  return [
    brandName,
    row.productName,
    row.optionName,
    row.quantity,
    row.productAmount,
    row.shipping,
    row.finalAmount,
  ].map(safeCell);
}

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2F3B34' } };
  row.alignment = { vertical: 'middle' };
}

function styleTotal(row: ExcelJS.Row): void {
  row.font = { bold: true };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFECE3' } };
}

function fitColumnWidths(sheet: ExcelJS.Worksheet): void {
  for (const column of sheet.columns) {
    let width = String(column.header ?? '').length + 2;
    if (column.eachCell) {
      column.eachCell({ includeEmpty: false }, (cell) => {
        width = Math.max(width, String(cell.value ?? '').length + 2);
      });
    }
    column.width = Math.max(12, Math.min(36, width));
  }
}

export async function serializeAdminOrdersXlsx(input: AdminOrderReportInput): Promise<ArrayBuffer> {
  const report = buildAdminOrderReport(input);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Baekjo Objet';
  workbook.created = new Date();

  const detailSheet = workbook.addWorksheet('주문내역');
  detailSheet.columns = ADMIN_ORDER_DETAIL_COLUMNS.map((header) => ({ header, key: header, width: 14 }));
  styleHeader(detailSheet.getRow(1));
  detailSheet.views = [{ state: 'frozen', ySplit: 1 }];
  for (const row of report.detailRows) {
    detailSheet.addRow(detailValues(row));
  }
  fitColumnWidths(detailSheet);

  const summarySheet = workbook.addWorksheet('브랜드별 집계');
  summarySheet.columns = ADMIN_ORDER_BRAND_SUMMARY_COLUMNS.map((header) => ({ header, key: header, width: 18 }));
  styleHeader(summarySheet.getRow(1));
  summarySheet.views = [{ state: 'frozen', ySplit: 1 }];
  for (const brand of report.brands) {
    for (const row of brand.products) {
      summarySheet.addRow(summaryValues(brand.brandName, row));
    }
    const total = summarySheet.addRow([
      brand.brandName,
      `${brand.brandName} 총합계`,
      '',
      brand.total.quantity,
      brand.total.productAmount,
      brand.total.shipping,
      brand.total.finalAmount,
    ]);
    styleTotal(total);
  }
  const overall = summarySheet.addRow([
    '전체',
    '조회기간 총합계',
    '',
    report.overall.quantity,
    report.overall.productAmount,
    report.overall.shipping,
    report.overall.finalAmount,
  ]);
  styleTotal(overall);
  fitColumnWidths(summarySheet);

  const output = await workbook.xlsx.writeBuffer();
  return output;
}
