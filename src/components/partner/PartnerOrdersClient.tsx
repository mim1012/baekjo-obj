'use client';

import { useEffect, useState } from 'react';
import type { PartnerOrderView } from '@/lib/partners/orderScope';
import PartnerPasswordNoticeModal from '@/components/partner/PartnerPasswordNoticeModal';

export default function PartnerOrdersClient() {
  const [orders, setOrders] = useState<PartnerOrderView[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void fetch('/api/partner/orders')
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error('주문을 불러오지 못했습니다.'))))
      .then((payload: { orders: PartnerOrderView[] }) => setOrders(payload.orders))
      .catch((reason: Error) => setError(reason.message));
  }, []);
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <PartnerPasswordNoticeModal />
      <header className="mb-8">
        <p className="text-sm font-medium text-neutral-500">PARTNER OPERATIONS</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-neutral-900">내 브랜드 주문</h1>
        <p className="mt-2 text-sm text-neutral-600">관리 중인 브랜드 상품이 포함된 주문만 표시됩니다.</p>
      </header>
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p> : null}
      {!error && orders.length === 0 ? <p className="rounded-xl border border-neutral-200 bg-white p-8 text-neutral-600">현재 내 브랜드 주문이 없습니다.</p> : null}
      <section className="grid gap-4 lg:grid-cols-2" aria-label="내 브랜드 주문 목록">
        {orders.map((order) => (
          <article key={order.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-medium text-neutral-900">주문 {order.id}</h2>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700">{order.paymentStatus}</span>
            </div>
            <p className="mt-2 text-sm text-neutral-600">{order.customerName} · {order.orderStatus}</p>
            <ul className="mt-4 divide-y divide-neutral-100 border-y border-neutral-100">
              {order.items.map((item) => <li key={`${order.id}-${item.productId}`} className="py-3 text-sm text-neutral-800">{item.productName} × {item.quantity}</li>)}
            </ul>
            {order.shipment ? <p className="mt-4 text-sm text-neutral-600">배송: {order.shipment.deliveryStatus}{order.shipment.trackingNumber ? ` · ${order.shipment.trackingNumber}` : ''}</p> : null}
          </article>
        ))}
      </section>
    </main>
  );
}
