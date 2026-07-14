'use client';

import React from 'react';
import Link from 'next/link';
import DataTable, { Column } from '@/components/admin-new/common/DataTable';
import StatusBadge from '@/components/admin-new/common/StatusBadge';
import { formatDate, formatPrice } from '@/lib/format';
import type { Order } from '@/types';

interface OrderDataTableProps {
  orders: Order[];
  isLoading: boolean;
}

export default function OrderDataTable({ orders, isLoading }: OrderDataTableProps) {
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

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case '결제대기': return <StatusBadge status="warning" label={status} />;
      case '결제완료': return <StatusBadge status="success" label={status} />;
      case '결제취소':
      case '환불완료': return <StatusBadge status="error" label={status} />;
      default: return <StatusBadge status="neutral" label={status} />;
    }
  };

  const getDeliveryStatusBadge = (status: string) => {
    switch (status) {
      case '배송전': return <StatusBadge status="neutral" label={status} />;
      case '배송준비': return <StatusBadge status="warning" label={status} />;
      case '배송중': return <StatusBadge status="info" label={status} />;
      case '배송완료': return <StatusBadge status="success" label={status} />;
      default: return <StatusBadge status="neutral" label={status} />;
    }
  };

  const columns: Column<Order>[] = [
    {
      key: 'id',
      header: '주문일/주문번호',
      render: (row) => (
        <div>
          <div className="text-gray-500 text-xs mb-1">{formatDate(row.createdAt)}</div>
          <div className="font-medium text-[#2F3B34]">{row.id}</div>
        </div>
      )
    },
    {
      key: 'customerName',
      header: '주문자(연락처)',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.customerName}</div>
          <div className="text-gray-500 text-xs">{row.phone}</div>
        </div>
      )
    },
    {
      key: 'items',
      header: '주문 상품',
      render: (row) => {
        const itemSummary = row.items.length > 1 
          ? `${row.items[0].productName} 외 ${row.items.length - 1}건` 
          : row.items[0].productName;
        return (
          <div className="text-gray-900 truncate max-w-[200px]" title={itemSummary}>
            {itemSummary}
          </div>
        );
      }
    },
    {
      key: 'totalPrice',
      header: '총 결제금액(결제수단)',
      render: (row) => (
        <div>
          <div className="font-bold text-gray-900">{formatPrice(row.totalPrice)}</div>
          <div className="text-gray-500 text-xs">{row.paymentMethod}</div>
        </div>
      )
    },
    {
      key: 'orderStatus',
      header: '주문 상태',
      render: (row) => getOrderStatusBadge(row.orderStatus)
    },
    {
      key: 'paymentStatus',
      header: '결제 상태',
      render: (row) => getPaymentStatusBadge(row.paymentStatus)
    },
    {
      key: 'deliveryStatus',
      header: '배송 상태',
      render: (row) => getDeliveryStatusBadge(row.deliveryStatus)
    },
    {
      key: 'actions',
      header: '관리',
      align: 'right',
      render: (row) => (
        <Link 
          href={`/admin/orders/${row.id}`}
          className="text-[#2F3B34] hover:underline font-medium text-xs border border-[#2F3B34] px-3 py-1.5 rounded-md inline-block"
        >
          상세보기
        </Link>
      )
    }
  ];

  return (
    <DataTable
      data={orders}
      columns={columns}
      keyExtractor={(row) => row.id}
      isLoading={isLoading}
    />
  );
}
