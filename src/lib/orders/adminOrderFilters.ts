import type { Order, PaymentStatus, DeliveryStatus } from '@/types';
import { DELIVERY_STATUSES, PAYMENT_STATUSES } from '@/types';
import { deriveFunnelStage, type FunnelStage } from '@/lib/orders/orderFunnel';
import { matchesOrderSearch } from '@/lib/orders/orderSearch';

export const ALL_ORDER_FILTER_VALUE = 'all';
export type AllOrderFilterValue = typeof ALL_ORDER_FILTER_VALUE;
export type AdminOrderFunnelTab = FunnelStage | '전체';

export interface AdminOrderFilters {
  readonly searchTerm: string;
  readonly funnelTab: AdminOrderFunnelTab;
  readonly createdFrom: string;
  readonly createdTo: string;
  readonly brandId: string;
  readonly paymentStatus: PaymentStatus | AllOrderFilterValue;
  readonly deliveryStatus: DeliveryStatus | AllOrderFilterValue;
}

export const DEFAULT_ADMIN_ORDER_FILTERS: AdminOrderFilters = {
  searchTerm: '',
  funnelTab: '전체',
  createdFrom: '',
  createdTo: '',
  brandId: ALL_ORDER_FILTER_VALUE,
  paymentStatus: ALL_ORDER_FILTER_VALUE,
  deliveryStatus: ALL_ORDER_FILTER_VALUE,
};

export const MAX_ADMIN_ORDER_EXPORT_ROWS = 5000;
export const MAX_ADMIN_ORDER_EXPORT_DAYS = 366;

export type AdminOrderExportParseResult =
  | { readonly ok: true; readonly filters: AdminOrderFilters; readonly dbRange: AdminOrderDateRange }
  | { readonly ok: false; readonly error: AdminOrderExportParseError };

export type AdminOrderExportParseError =
  | 'invalid-date'
  | 'invalid-date-range'
  | 'date-range-too-large'
  | 'invalid-funnel'
  | 'invalid-payment-status'
  | 'invalid-delivery-status';

export interface AdminOrderDateRange {
  readonly createdFromIso?: string;
  readonly createdToExclusiveIso?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FUNNEL_TABS: readonly AdminOrderFunnelTab[] = [
  '전체',
  '입금대기',
  '결제진행중',
  '발송대기',
  '배송중',
  '배송완료',
  '취소반품',
  '기타',
];

function firstQueryValue(params: URLSearchParams, key: string): string {
  return (params.get(key) ?? '').trim();
}

function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

function isDeliveryStatus(value: string): value is DeliveryStatus {
  return (DELIVERY_STATUSES as readonly string[]).includes(value);
}

function isFunnelTab(value: string): value is AdminOrderFunnelTab {
  return (FUNNEL_TABS as readonly string[]).includes(value);
}

function dateKey(value: string): string | null {
  if (!DATE_PATTERN.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === value ? value : null;
}

function addDays(date: string, days: number): string {
  const time = new Date(`${date}T00:00:00.000Z`).getTime();
  return new Date(time + days * DAY_MS).toISOString().slice(0, 10);
}

function daysBetweenInclusive(from: string, to: string): number {
  const fromTime = new Date(`${from}T00:00:00.000Z`).getTime();
  const toTime = new Date(`${to}T00:00:00.000Z`).getTime();
  return Math.floor((toTime - fromTime) / DAY_MS) + 1;
}

function orderCreatedDateKey(order: Order): string {
  return order.createdAt.slice(0, 10);
}

function matchesBrand(order: Order, brandId: string): boolean {
  return order.items.some((item) => item?.brandId === brandId);
}

export function applyAdminOrderFilters(orders: readonly Order[], filters: AdminOrderFilters): Order[] {
  const term = filters.searchTerm.trim().toLowerCase();
  return [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .filter((order) => {
      if (term && !matchesOrderSearch(order, term)) return false;
      if (filters.funnelTab !== '전체' && deriveFunnelStage(order) !== filters.funnelTab) return false;
      if (filters.createdFrom && orderCreatedDateKey(order) < filters.createdFrom) return false;
      if (filters.createdTo && orderCreatedDateKey(order) > filters.createdTo) return false;
      if (filters.brandId !== ALL_ORDER_FILTER_VALUE && !matchesBrand(order, filters.brandId)) return false;
      if (filters.paymentStatus !== ALL_ORDER_FILTER_VALUE && order.paymentStatus !== filters.paymentStatus) {
        return false;
      }
      if (filters.deliveryStatus !== ALL_ORDER_FILTER_VALUE && order.deliveryStatus !== filters.deliveryStatus) {
        return false;
      }
      return true;
    });
}

export function adminOrderFiltersToSearchParams(filters: AdminOrderFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.searchTerm.trim()) params.set('q', filters.searchTerm.trim());
  if (filters.funnelTab !== '전체') params.set('funnel', filters.funnelTab);
  if (filters.createdFrom) params.set('from', filters.createdFrom);
  if (filters.createdTo) params.set('to', filters.createdTo);
  if (filters.brandId !== ALL_ORDER_FILTER_VALUE) params.set('brandId', filters.brandId);
  if (filters.paymentStatus !== ALL_ORDER_FILTER_VALUE) params.set('paymentStatus', filters.paymentStatus);
  if (filters.deliveryStatus !== ALL_ORDER_FILTER_VALUE) params.set('deliveryStatus', filters.deliveryStatus);
  return params;
}

export function parseAdminOrderExportQuery(params: URLSearchParams): AdminOrderExportParseResult {
  const searchTerm = firstQueryValue(params, 'q');
  const funnel = firstQueryValue(params, 'funnel') || DEFAULT_ADMIN_ORDER_FILTERS.funnelTab;
  const createdFrom = firstQueryValue(params, 'from');
  const createdTo = firstQueryValue(params, 'to');
  const brandId = firstQueryValue(params, 'brandId') || ALL_ORDER_FILTER_VALUE;
  const paymentStatus = firstQueryValue(params, 'paymentStatus') || ALL_ORDER_FILTER_VALUE;
  const deliveryStatus = firstQueryValue(params, 'deliveryStatus') || ALL_ORDER_FILTER_VALUE;

  if (!isFunnelTab(funnel)) return { ok: false, error: 'invalid-funnel' };
  if (paymentStatus !== ALL_ORDER_FILTER_VALUE && !isPaymentStatus(paymentStatus)) {
    return { ok: false, error: 'invalid-payment-status' };
  }
  if (deliveryStatus !== ALL_ORDER_FILTER_VALUE && !isDeliveryStatus(deliveryStatus)) {
    return { ok: false, error: 'invalid-delivery-status' };
  }

  const fromKey = createdFrom ? dateKey(createdFrom) : null;
  const toKey = createdTo ? dateKey(createdTo) : null;
  if ((createdFrom && !fromKey) || (createdTo && !toKey)) return { ok: false, error: 'invalid-date' };
  if (fromKey && toKey && fromKey > toKey) return { ok: false, error: 'invalid-date-range' };
  if (fromKey && toKey && daysBetweenInclusive(fromKey, toKey) > MAX_ADMIN_ORDER_EXPORT_DAYS) {
    return { ok: false, error: 'date-range-too-large' };
  }

  const filters: AdminOrderFilters = {
    searchTerm,
    funnelTab: funnel,
    createdFrom: fromKey ?? '',
    createdTo: toKey ?? '',
    brandId,
    paymentStatus,
    deliveryStatus,
  };
  const dbRange: AdminOrderDateRange = {
    ...(fromKey ? { createdFromIso: `${fromKey}T00:00:00.000Z` } : {}),
    ...(toKey ? { createdToExclusiveIso: `${addDays(toKey, 1)}T00:00:00.000Z` } : {}),
  };
  return { ok: true, filters, dbRange };
}
