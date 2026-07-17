'use client';

import React from 'react';
import type { Order } from '@/types';
import { DELIVERY_STATUSES, ORDER_STATUSES, PAYMENT_STATUSES } from '@/types';


export type OrderInlineStatusUpdate = Partial<
  Pick<Order, 'orderStatus' | 'paymentStatus' | 'deliveryStatus'>
>;

interface OrderInlineStatusControlsProps {
  order: Order;
  disabled?: boolean;
  layout?: 'row' | 'stack';
  onChange: (id: string, updates: OrderInlineStatusUpdate) => void;
}

const labelClass = 'space-y-1 text-[11px] font-medium text-gray-500';
const selectClass =
  'w-full min-w-[92px] rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-[#17201B] focus:border-[#2F3B34] focus:outline-none focus:ring-1 focus:ring-[#2F3B34] disabled:cursor-wait disabled:bg-gray-50 disabled:text-gray-400';

export default function OrderInlineStatusControls({
  order,
  disabled = false,
  layout = 'row',
  onChange,
}: OrderInlineStatusControlsProps) {
  const containerClass =
    layout === 'stack'
      ? 'grid grid-cols-1 gap-2'
      : 'grid min-w-[320px] grid-cols-3 gap-2';

  return (
    <div className={containerClass} aria-busy={disabled}>
      <label className={labelClass}>
        <span>주문</span>
        <select
          aria-label={`주문 상태 변경: ${order.id}`}
          value={order.orderStatus}
          disabled={disabled}
          onChange={(event) => onChange(order.id, { orderStatus: event.target.value as Order['orderStatus'] })}
          className={selectClass}
        >
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        <span>결제</span>
        <select
          aria-label={`결제 상태 변경: ${order.id}`}
          value={order.paymentStatus}
          disabled={disabled}
          onChange={(event) => onChange(order.id, { paymentStatus: event.target.value })}
          className={selectClass}
        >
          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status} disabled={status === '승인중'}>
              {status === '승인중' ? '승인중(자동)' : status}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        <span>배송</span>
        <select
          aria-label={`배송 상태 변경: ${order.id}`}
          value={order.deliveryStatus}
          disabled={disabled}
          onChange={(event) => onChange(order.id, { deliveryStatus: event.target.value })}
          className={selectClass}
        >
          {DELIVERY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
