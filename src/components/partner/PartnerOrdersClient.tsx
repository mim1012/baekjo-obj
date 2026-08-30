'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, LogOut } from 'lucide-react';
import type { PartnerOrderView } from '@/lib/partners/orderScope';
import PartnerPasswordNoticeModal from '@/components/partner/PartnerPasswordNoticeModal';
import { OrderDateRangeFilter } from '@/components/orders/OrderDateRangeFilter';
import { EMPTY_ORDER_DATE_RANGE, type OrderDateRange } from '@/lib/orders/orderDateFilters';
import { formatDate, formatPrice } from '@/lib/format';
import { logout } from '@/lib/storage';

type PartnerOrdersResponse = {
  readonly orders: PartnerOrderView[];
};

function isPartnerOrdersResponse(value: unknown): value is PartnerOrdersResponse {
  return typeof value === 'object' && value !== null && 'orders' in value && Array.isArray(value.orders);
}

export function buildPartnerOrdersRequestPath(range: OrderDateRange): string {
  const params = new URLSearchParams();
  if (range.createdFrom) params.set('from', range.createdFrom);
  if (range.createdTo) params.set('to', range.createdTo);
  const query = params.toString();
  return query ? `/api/partner/orders?${query}` : '/api/partner/orders';
}

export default function PartnerOrdersClient() {
  const [dateRange, setDateRange] = useState<OrderDateRange>(EMPTY_ORDER_DATE_RANGE);
  const [orders, setOrders] = useState<PartnerOrderView[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadOrders(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(buildPartnerOrdersRequestPath(dateRange), { signal: controller.signal });
        if (!response.ok) throw new Error('주문을 불러오지 못했습니다.');
        const payload: unknown = await response.json();
        if (!isPartnerOrdersResponse(payload)) throw new Error('주문 응답 형식이 올바르지 않습니다.');
        if (active) setOrders(payload.orders);
      } catch (reason) {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        if (active) {
          setOrders([]);
          setError(reason instanceof Error ? reason.message : '주문을 불러오지 못했습니다.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadOrders();
    return () => {
      active = false;
      controller.abort();
    };
  }, [dateRange]);

  function handleDateRangeChange(range: OrderDateRange): void {
    setDateRange(range);
    setExpandedOrderId(null);
  }

  const hasDateFilter = Boolean(dateRange.createdFrom || dateRange.createdTo);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <PartnerPasswordNoticeModal />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E0D5] pb-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[#59615B] transition-colors hover:text-[#17211D]">
          <ArrowLeft className="size-4" />
          쇼핑몰로 돌아가기
        </Link>
        <button
          type="button"
          onClick={() => { void logout().finally(() => { window.location.href = '/login'; }); }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#59615B] transition-colors hover:text-[#17211D]"
        >
          <LogOut className="size-4" />
          로그아웃
        </button>
      </div>
      <header className="mb-8">
        <p className="text-sm font-medium text-neutral-500">PARTNER OPERATIONS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">내 브랜드 주문</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">관리 중인 브랜드 상품이 포함된 주문만 표시됩니다. 주문을 펼치면 상품별 금액과 배송 상태를 확인할 수 있습니다.</p>
      </header>
      <section className="mb-4 rounded-md border border-gray-200 bg-white p-3" aria-label="내 브랜드 주문 기간 필터">
        <div className="flex flex-wrap items-center gap-3">
          <OrderDateRangeFilter
            createdFrom={dateRange.createdFrom}
            createdTo={dateRange.createdTo}
            onChange={handleDateRangeChange}
            ariaLabel="내 브랜드 주문 빠른 기간 선택"
          />
        </div>
      </section>
      {loading ? <p role="status" className="rounded-xl border border-neutral-200 bg-white p-4 text-neutral-600">주문을 불러오는 중입니다.</p> : null}
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p> : null}
      {!loading && !error && orders.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white p-8 text-neutral-600">
          {hasDateFilter ? '선택한 기간에 해당하는 내 브랜드 주문이 없습니다.' : '현재 내 브랜드 주문이 없습니다.'}
        </p>
      ) : null}
      <section className="grid gap-4 lg:grid-cols-2" aria-label="내 브랜드 주문 목록">
        {orders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium text-neutral-900">주문 {order.id}</h2>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">{order.paymentStatus}</span>
            </div>
            <p className="mt-2 text-sm text-neutral-600">{order.customerName} · {order.orderStatus}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-neutral-100 py-4 text-sm">
              <div><dt className="text-neutral-500">주문일</dt><dd className="mt-1 font-medium text-neutral-900">{formatDate(order.createdAt)}</dd></div>
              <div><dt className="text-neutral-500">결제금액</dt><dd className="mt-1 font-medium text-neutral-900">{formatPrice(order.totalPrice + order.deliveryFee)}</dd></div>
            </dl>
            <ul className="mt-4 divide-y divide-neutral-100 border-y border-neutral-100">
              {order.items.map((item) => <li key={`${order.id}-${item.productId}-${item.optionName ?? 'default'}`} className="flex items-center justify-between gap-3 py-3 text-sm text-neutral-800"><span>{item.productName}{item.optionName ? ` · ${item.optionName}` : ''} × {item.quantity}</span><span className="shrink-0 text-neutral-500">{formatPrice(item.price * item.quantity)}</span></li>)}
            </ul>
            {order.shipment ? <p className="mt-4 text-sm text-neutral-600">배송: {order.shipment.deliveryStatus}{order.shipment.trackingNumber ? ` · ${order.shipment.trackingNumber}` : ''}</p> : null}
            <button
              type="button"
              aria-expanded={expandedOrderId === order.id}
              onClick={() => setExpandedOrderId((current) => current === order.id ? null : order.id)}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 border-t border-neutral-100 pt-4 text-sm font-semibold text-[#2F3B34] transition-colors hover:text-[#59615B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F3B34] focus-visible:ring-offset-2"
            >
              {expandedOrderId === order.id ? '상세 접기' : '주문 상세 보기'}
              <ChevronDown className={`size-4 transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`} />
            </button>
            {expandedOrderId === order.id ? (
              <div className="mt-4 rounded-xl bg-[#F8F6F0] p-4 text-sm text-neutral-700">
                <p>결제수단: {order.paymentMethod}</p>
                <p className="mt-2">배송비: {formatPrice(order.deliveryFee)}</p>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
