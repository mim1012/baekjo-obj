import { test, expect } from '@playwright/test';
import type { Order } from '../../src/types';
import {
  ALL_ORDER_FILTER_VALUE,
  DEFAULT_ADMIN_ORDER_FILTERS,
  applyAdminOrderFilters,
  adminOrderFiltersToSearchParams,
  parseAdminOrderExportQuery,
} from '../../src/lib/orders/adminOrderFilters';

function makeOrder(overrides: Partial<Order>): Order {
  return {
    id: 'order-1',
    customerName: '홍길동',
    phone: '010-1111-2222',
    address: '서울시',
    items: [{ productId: 'p1', productName: '기본 상품', quantity: 1, price: 10000, brandId: 'brand-a' }],
    totalPrice: 10000,
    deliveryFee: 3000,
    paymentMethod: '카드',
    orderStatus: '주문접수',
    paymentStatus: '결제완료',
    deliveryStatus: '배송전',
    createdAt: '2026-07-02T03:00:00.000Z',
    ...overrides,
  };
}

test.describe('applyAdminOrderFilters', () => {
  test('검색어와 퍼널 탭에 기간·브랜드·결제·배송 필터를 함께 적용한다', () => {
    const matching = makeOrder({
      id: 'match',
      customerName: '김백조',
      items: [{ productId: 'p-match', productName: '프리미엄 하네스', quantity: 1, price: 10000, brandId: 'brand-b' }],
      createdAt: '2026-07-10T10:00:00.000Z',
      paymentStatus: '결제완료',
      deliveryStatus: '배송준비',
    });
    const orders = [
      makeOrder({ id: 'old', customerName: '김백조', createdAt: '2026-06-30T10:00:00.000Z', deliveryStatus: '배송준비' }),
      makeOrder({ id: 'brand', customerName: '김백조', deliveryStatus: '배송준비', items: [{ productId: 'p', productName: '프리미엄 하네스', quantity: 1, price: 10000, brandId: 'brand-a' }] }),
      makeOrder({ id: 'payment', customerName: '김백조', paymentStatus: '입금대기', deliveryStatus: '배송준비' }),
      matching,
    ];

    const result = applyAdminOrderFilters(orders, {
      searchTerm: '하네스',
      funnelTab: '발송대기',
      createdFrom: '2026-07-01',
      createdTo: '2026-07-31',
      brandId: 'brand-b',
      paymentStatus: '결제완료',
      deliveryStatus: '배송준비',
    });

    expect(result.map((order) => order.id)).toEqual(['match']);
  });

  test('기본 필터는 최신 주문순 정렬만 적용한다', () => {
    const older = makeOrder({ id: 'older', createdAt: '2026-07-01T00:00:00.000Z' });
    const newer = makeOrder({ id: 'newer', createdAt: '2026-07-03T00:00:00.000Z' });

    const result = applyAdminOrderFilters([older, newer], DEFAULT_ADMIN_ORDER_FILTERS);

    expect(result.map((order) => order.id)).toEqual(['newer', 'older']);
  });
});

test.describe('admin order export query parsing', () => {
  test('화면 필터 모델을 query string으로 보존한다', () => {
    const params = adminOrderFiltersToSearchParams({
      searchTerm: '김백조',
      funnelTab: '배송중',
      createdFrom: '2026-07-01',
      createdTo: '2026-07-31',
      brandId: 'brand-b',
      paymentStatus: '결제완료',
      deliveryStatus: '배송중',
    });

    expect(params.toString()).toContain('q=%EA%B9%80%EB%B0%B1%EC%A1%B0');
    expect(params.get('funnel')).toBe('배송중');
    expect(params.get('from')).toBe('2026-07-01');
    expect(params.get('to')).toBe('2026-07-31');
    expect(params.get('brandId')).toBe('brand-b');
    expect(params.get('paymentStatus')).toBe('결제완료');
    expect(params.get('deliveryStatus')).toBe('배송중');
  });

  test('기간이 366일을 넘으면 export 요청을 거부한다', () => {
    const params = new URLSearchParams({ from: '2026-01-01', to: '2027-01-02' });

    const result = parseAdminOrderExportQuery(params);

    expect(result).toEqual({ ok: false, error: 'date-range-too-large' });
  });

  test('알 수 없는 상태값은 export 요청에서 거부한다', () => {
    const params = new URLSearchParams({
      paymentStatus: '결제됨',
      deliveryStatus: ALL_ORDER_FILTER_VALUE,
    });

    const result = parseAdminOrderExportQuery(params);

    expect(result).toEqual({ ok: false, error: 'invalid-payment-status' });
  });
});
