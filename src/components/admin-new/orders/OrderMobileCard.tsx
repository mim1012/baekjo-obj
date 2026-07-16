'use client';

import React from 'react';
import Link from 'next/link';
import MobileDataCard from '@/components/admin-new/common/MobileDataCard';
import StatusBadge from '@/components/admin-new/common/StatusBadge';
import { formatDate, formatPrice } from '@/lib/format';
import type { Order } from '@/types';

interface OrderMobileCardProps {
  order: Order;
}

export default function OrderMobileCard({ order }: OrderMobileCardProps) {
  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case '주문접수': return <StatusBadge status="neutral" label={status} />;
      case '결제완료': return <StatusBadge status="info" label={status} />;
      case '배송준비': return <StatusBadge status="warning" label={status} />;
      case '배송중': return <StatusBadge status="warning" label={status} />;
      case '배송완료': return <StatusBadge status="success" label={status} />;
      case '취소요청':
      case '취소완료':
      case '환불완료': return <StatusBadge status="error" label={status} />;
      default: return <StatusBadge status="neutral" label={status} />;
    }
  };

  const itemSummary = order.items.length > 1 
    ? `${order.items[0].productName} 외 ${order.items.length - 1}건` 
    : order.items[0]?.productName || '상품 정보 없음';
  const finalAmount = order.totalPrice + order.deliveryFee;

  return (
    <MobileDataCard
      title={itemSummary}
      subtitle={`${order.id} · ${formatDate(order.createdAt)}`}
      status={getOrderStatusBadge(order.orderStatus)}
      details={[
        { label: '주문자', value: `${order.customerName} (${order.phone})` },
        { label: '결제금액', value: formatPrice(finalAmount) },
        { label: '결제상태', value: order.paymentStatus },
        { label: '배송상태', value: order.deliveryStatus },
      ]}
      action={
        <Link 
          href={`/admin/orders/${order.id}`}
          className="text-[#2F3B34] hover:bg-gray-50 font-medium text-[13px] border border-[#2F3B34] px-3 py-1.5 rounded-md inline-block w-full text-center"
        >
          상세보기
        </Link>
      }
    />
  );
}
