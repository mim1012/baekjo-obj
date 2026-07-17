import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { groupItemsByBrand } from '@/components/admin-new/orders/groupItemsByBrand';
import type { OrderItem, Shipment } from '@/types';

const root = path.resolve(__dirname, '..', '..');
const src = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

function item(over: Partial<OrderItem> = {}): OrderItem {
  return { productId: 'p1', productName: '상품', quantity: 1, price: 1000, ...over };
}

function shipment(over: Partial<Shipment> = {}): Shipment {
  return {
    id: 's1',
    orderId: 'o1',
    brandId: 'b1',
    deliveryStatus: '배송전',
    createdAt: '2026-07-17T00:00:00Z',
    ...over,
  };
}

test.describe('업체별 묶음배송 그룹핑(groupItemsByBrand)', () => {
  test('모든 아이템에 brandId 가 있으면 브랜드별로 묶고 등장 순서를 보존한다', () => {
    const items = [
      item({ productId: 'p1', brandId: 'b2', productName: 'A' }),
      item({ productId: 'p2', brandId: 'b1', productName: 'B' }),
      item({ productId: 'p3', brandId: 'b2', productName: 'C' }),
    ];
    const out = groupItemsByBrand(items, []);
    expect(out.mode).toBe('per-brand');
    expect(out.bundles.map((b) => b.brandId)).toEqual(['b2', 'b1']);
    expect(out.bundles[0].items.map((i) => i.productName)).toEqual(['A', 'C']);
    expect(out.bundles[1].items.map((i) => i.productName)).toEqual(['B']);
  });

  test('이미 존재하는 송장을 brandId 로 짝짓고, 없는 브랜드는 shipment=undefined', () => {
    const items = [item({ brandId: 'b1' }), item({ brandId: 'b2' })];
    const ships = [shipment({ brandId: 'b1', deliveryStatus: '배송중', trackingNumber: '123' })];
    const out = groupItemsByBrand(items, ships);
    const b1 = out.bundles.find((b) => b.brandId === 'b1')!;
    const b2 = out.bundles.find((b) => b.brandId === 'b2')!;
    expect(b1.shipment?.deliveryStatus).toBe('배송중');
    expect(b1.shipment?.trackingNumber).toBe('123');
    expect(b2.shipment).toBeUndefined();
  });

  test('brandId 가 하나라도 없으면 legacy 로 폴백한다(bundles 비움)', () => {
    const items = [item({ brandId: 'b1' }), item({ brandId: undefined })];
    const out = groupItemsByBrand(items, []);
    expect(out.mode).toBe('legacy');
    expect(out.bundles).toEqual([]);
  });

  test('아이템이 비면 legacy 로 폴백한다', () => {
    const out = groupItemsByBrand([], []);
    expect(out.mode).toBe('legacy');
    expect(out.bundles).toEqual([]);
  });

  test('같은 브랜드 송장이 여러 행이면 첫 행을 정본으로 둔다', () => {
    const items = [item({ brandId: 'b1' })];
    const ships = [
      shipment({ id: 's-a', brandId: 'b1', deliveryStatus: '배송중' }),
      shipment({ id: 's-b', brandId: 'b1', deliveryStatus: '배송완료' }),
    ];
    const out = groupItemsByBrand(items, ships);
    expect(out.bundles[0].shipment?.id).toBe('s-a');
  });
});

test.describe('업체별 배송 카드 배선(§4 콘센트)', () => {
  test('카드/패널은 storage 콘센트만 쓰고 직접 fetch 하지 않는다', () => {
    const panel = src('src', 'components', 'admin-new', 'orders', 'OrderShipmentsPanel.tsx');
    const card = src('src', 'components', 'admin-new', 'orders', 'BrandShipmentCard.tsx');

    expect(panel).toContain("import { getAdminOrderShipments, getAdminBrands } from '@/lib/storage'");
    expect(panel).toContain('groupItemsByBrand(order.items, shipments)');
    expect(panel).not.toContain('fetch(');
    expect(panel).not.toContain('localStorage');

    expect(card).toContain("import { updateOrderShipment } from '@/lib/storage'");
    expect(card).toContain('DELIVERY_STATUSES.map');
    expect(card).toContain('CARRIER_CODES.map');
    expect(card).not.toContain('fetch(');
    // 관리자는 '구매확정'을 세팅할 수 없다 — 상위집합을 select 에 쓰지 않는다.
    expect(card).not.toContain('SHIPMENT_DELIVERY_STATUSES');
  });
});
