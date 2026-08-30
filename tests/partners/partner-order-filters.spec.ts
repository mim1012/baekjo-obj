import { expect, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { projectPartnerOrder } from '@/lib/partners/orderScope';
import {
  getQuickOrderDateRange,
  matchesOrderDateRange,
  parseOrderDateRange,
  toOrderDateRangeIso,
} from '@/lib/orders/orderDateFilters';

const read = (filePath: string) => fs.readFileSync(path.resolve(__dirname, '../../', filePath), 'utf8');

const scopedOrder = {
  id: 'order-1',
  customerName: '구매자',
  orderStatus: '주문접수',
  paymentStatus: '입금대기',
  createdAt: '2026-07-10T10:00:00.000Z',
  totalPrice: 3000,
  deliveryFee: 0,
  paymentMethod: '무통장입금',
  items: [
    { productId: 'a', productName: '브랜드 A 상품', quantity: 1, price: 1000, brandId: 'brand-a' },
    { productId: 'b', productName: '브랜드 B 상품', quantity: 1, price: 2000, brandId: 'brand-b' },
  ],
};

test.describe('partner order date range contract', () => {
  test('유효한 기간과 한쪽 날짜 누락을 API 조회 경계로 변환한다', () => {
    expect(parseOrderDateRange({ createdFrom: '2026-07-10', createdTo: '2026-07-12' })).toEqual({
      ok: true,
      range: { createdFrom: '2026-07-10', createdTo: '2026-07-12' },
      dbRange: {
        createdFromIso: '2026-07-10T00:00:00.000Z',
        createdToExclusiveIso: '2026-07-13T00:00:00.000Z',
      },
    });
    expect(toOrderDateRangeIso({ createdFrom: '2026-07-10', createdTo: '' })).toEqual({
      createdFromIso: '2026-07-10T00:00:00.000Z',
    });
    expect(toOrderDateRangeIso({ createdFrom: '', createdTo: '2026-07-12' })).toEqual({
      createdToExclusiveIso: '2026-07-13T00:00:00.000Z',
    });
  });

  test('잘못된 날짜와 역전 범위를 거부한다', () => {
    expect(parseOrderDateRange({ createdFrom: '2026-02-30', createdTo: '' })).toEqual({
      ok: false,
      error: 'invalid-date',
    });
    expect(parseOrderDateRange({ createdFrom: '2026-07-12', createdTo: '2026-07-10' })).toEqual({
      ok: false,
      error: 'invalid-date-range',
    });
  });

  test('빠른 선택과 주문 매칭은 관리자와 같은 포함 경계를 사용한다', () => {
    expect(getQuickOrderDateRange(30, new Date('2026-08-31T00:00:00.000Z'))).toEqual({
      createdFrom: '2026-08-02',
      createdTo: '2026-08-31',
    });

    const range = { createdFrom: '2026-07-10', createdTo: '2026-07-12' };
    expect(matchesOrderDateRange({ createdAt: '2026-07-10T00:00:00.000Z' }, range)).toBe(true);
    expect(matchesOrderDateRange({ createdAt: '2026-07-12T23:59:59.999Z' }, range)).toBe(true);
    expect(matchesOrderDateRange({ createdAt: '2026-07-13T00:00:00.000Z' }, range)).toBe(false);
  });

  test('날짜 필터 이후에도 partner 브랜드 권한 투영은 완화되지 않는다', () => {
    expect(matchesOrderDateRange(scopedOrder, { createdFrom: '2026-07-01', createdTo: '2026-07-31' })).toBe(true);

    const view = projectPartnerOrder(scopedOrder, ['brand-a'], [
      { id: 'shipment-a', orderId: 'order-1', brandId: 'brand-a', deliveryStatus: '배송중', createdAt: scopedOrder.createdAt },
      { id: 'shipment-b', orderId: 'order-1', brandId: 'brand-b', deliveryStatus: '배송완료', createdAt: scopedOrder.createdAt },
    ]);

    expect(view?.items.map((item) => item.brandId)).toEqual(['brand-a']);
    expect(view?.shipment?.brandId).toBe('brand-a');
  });
});

test.describe('partner order API and client source contract', () => {
  test('partner API는 인증/권한 확인 뒤 from/to를 검증하고 범위 조회에 전달한다', () => {
    const route = read('src/app/api/partner/orders/route.ts');

    expect(route.indexOf('await requirePartnerOrAdmin()')).toBeLessThan(route.indexOf('parseOrderDateRange({'));
    expect(route).toContain("firstQueryValue(request.nextUrl.searchParams, 'from')");
    expect(route).toContain("firstQueryValue(request.nextUrl.searchParams, 'to')");
    expect(route).toContain("NextResponse.json({ error: parsedRange.error }, { status: 400 })");
    expect(route).toContain('member.role === \'admin\' ? null : (member.managedBrandIds ?? [])');
    expect(route).toContain('parsedRange.range');
  });

  test('repo와 partner read 계층은 created_at DB 경계와 브랜드 범위 전달을 함께 유지한다', () => {
    const repo = read('src/lib/orders/repo.ts');
    const orderRead = read('src/lib/partners/orderRead.ts');

    expect(repo).toContain('export async function listAllOrders(range?: OrderDateRange)');
    expect(repo).toContain("query = query.gte('created_at', dbRange.createdFromIso)");
    expect(repo).toContain("query = query.lt('created_at', dbRange.createdToExclusiveIso)");
    expect(repo.indexOf(".order('created_at', { ascending: false })")).toBeLessThan(repo.indexOf('.limit(ORDERS_LIST_CAP)'));
    expect(orderRead).toContain('export async function listPartnerOrders(brandIds: string[] | null, range?: OrderDateRange)');
    expect(orderRead).toContain('if (brandIds && brandIds.length === 0) return []');
    expect(orderRead).toContain('const orders = await listAllOrders(range)');
  });

  test('partner client는 공통 날짜 UI와 from/to query string, 요청 취소, 기간 빈 상태를 연결한다', () => {
    const client = read('src/components/partner/PartnerOrdersClient.tsx');

    expect(client).toContain('<OrderDateRangeFilter');
    expect(client).toContain('ariaLabel="내 브랜드 주문 빠른 기간 선택"');
    expect(client).toContain("params.set('from', range.createdFrom)");
    expect(client).toContain("params.set('to', range.createdTo)");
    expect(client).toContain('const controller = new AbortController()');
    expect(client).toContain('controller.abort()');
    expect(client).toContain('setExpandedOrderId(null)');
    expect(client).toContain('선택한 기간에 해당하는 내 브랜드 주문이 없습니다.');
  });
});
