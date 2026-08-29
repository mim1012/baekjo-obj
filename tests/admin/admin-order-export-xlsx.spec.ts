import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import type { Brand, Order } from '../../src/types';
import { serializeAdminOrdersXlsx } from '../../src/lib/orders/adminOrderExportXlsx';

const brand: Brand = {
  id: 'b1', slug: 'b1', name: '테스트 브랜드', logo: '', description: '', philosophy: '', auditPoints: [],
  representativeProductIds: [], relatedConcernSlugs: [], isRecommended: false, isVisible: true,
};

const order: Order = {
  id: 'order-1', customerName: '=FORMULA', phone: '010-0000-0000', address: '서울', items: [
    { productId: 'p1', productName: '상품', optionName: 'S', quantity: 2, price: 1000, brandId: 'b1' },
  ], totalPrice: 2000, deliveryFee: 3000, paymentMethod: '카드', orderStatus: '주문접수',
  paymentStatus: '결제완료', deliveryStatus: '배송준비', createdAt: '2026-08-30T00:00:00.000Z',
  deliveryFeeBreakdown: [{ brandId: 'b1', brandName: '테스트 브랜드', subtotal: 2000, shippingFee: 3000, appliedDeliveryFee: 3000, isFreeShipping: false, freeShippingThreshold: 50000 }],
};

test('XLSX export creates an Excel workbook with safe values and product rows', async () => {
  const bytes = await serializeAdminOrdersXlsx([order], [brand]);
  expect(new Uint8Array(bytes).slice(0, 2)).toEqual(new Uint8Array([0x50, 0x4b]));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const sheet = workbook.getWorksheet('주문내역');
  expect(sheet).toBeTruthy();
  expect(sheet?.getRow(1).getCell(1).value).toBe('주문번호');
  expect(sheet?.getRow(2).getCell(1).value).toBe('order-1');
  expect(sheet?.getRow(2).getCell(10).value).toBe("'=FORMULA");
  expect(sheet?.getRow(2).getCell(4).value).toBe('상품');
  expect(sheet?.getRow(2).getCell(8).value).toBe(3000);
});
