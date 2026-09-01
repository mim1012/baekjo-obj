import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..', '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('관리자 주문 목록·상세·엑셀은 배송지와 배송 메모를 노출한다', () => {
  const table = read('src/components/admin-new/orders/OrderDataTable.tsx');
  const mobile = read('src/components/admin-new/orders/OrderMobileCard.tsx');
  const detail = read('src/components/admin-new/orders/OrderDetailPage.tsx');
  const report = read('src/lib/orders/adminOrderReporting.ts');
  const xlsx = read('src/lib/orders/adminOrderExportXlsx.ts');
  expect(table).toContain("header: '배송 정보'");
  expect(table).toContain('row.deliveryMemo');
  expect(mobile).toContain("label: '배송지'");
  expect(mobile).toContain("label: '배송 메모'");
  expect(detail).toContain('배송 메모');
  expect(report).toContain("'배송 메모'");
  expect(report).toContain('deliveryMemo: order.deliveryMemo ??');
  expect(xlsx).toContain('row.deliveryMemo');
});
