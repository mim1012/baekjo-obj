'use client';

import React from 'react';
import Link from 'next/link';
import MobileDataCard from '@/components/admin-new/common/MobileDataCard';
import { formatDate, formatPrice } from '@/lib/format';
import type { Brand, Order } from '@/types';
import { deriveFunnelStage, stageAction } from './orderFunnel';
import OrderFunnelBadge from './OrderFunnelBadge';
import DepositConfirmButton, { type OrderStatusUpdate } from './DepositConfirmButton';
import ShipActionPopover from './ShipActionPopover';

interface OrderMobileCardProps {
  order: Order;
  saving?: boolean;
  onDepositConfirm: (id: string, updates: OrderStatusUpdate) => void;
  brandMap: Record<string, Brand>;
  onShipped: () => void | Promise<void>;
}

export default function OrderMobileCard({
  order,
  saving = false,
  onDepositConfirm,
  brandMap,
  onShipped,
}: OrderMobileCardProps) {
  const stage = deriveFunnelStage(order);
  const action = stageAction(stage);

  const itemSummary = order.items.length > 1
    ? `${order.items[0].productName} 외 ${order.items.length - 1}건`
    : order.items[0]?.productName || '상품 정보 없음';
  const finalAmount = order.totalPrice + order.deliveryFee;

  return (
    <MobileDataCard
      title={itemSummary}
      subtitle={`${order.id} · ${formatDate(order.createdAt)}`}
      status={<OrderFunnelBadge stage={stage} />}
      details={[
        { label: '주문자', value: `${order.customerName} (${order.phone})` },
        { label: '결제금액', value: formatPrice(finalAmount) },
        { label: '결제수단', value: order.paymentMethod },
      ]}
      action={
        <div className="space-y-3 w-full">
          {action === 'depositConfirm' && (
            <DepositConfirmButton
              order={order}
              disabled={saving}
              className="w-full"
              onStatusChange={onDepositConfirm}
            />
          )}
          {action === 'ship' && (
            <ShipActionPopover order={order} brandMap={brandMap} onShipped={onShipped} />
          )}
          <Link
            href={`/admin/orders/${order.id}`}
            className="text-[#2F3B34] hover:bg-gray-50 font-medium text-[13px] border border-[#2F3B34] px-3 py-1.5 rounded-md inline-block w-full text-center"
          >
            상세보기
          </Link>
        </div>
      }
    />
  );
}
