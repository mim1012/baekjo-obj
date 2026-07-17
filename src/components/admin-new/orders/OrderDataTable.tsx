'use client';

import React from 'react';
import Link from 'next/link';
import DataTable, { Column } from '@/components/admin-new/common/DataTable';
import { formatDate, formatPrice } from '@/lib/format';
import type { Order } from '@/types';
import OrderInlineStatusControls, { type OrderInlineStatusUpdate } from './OrderInlineStatusControls';
import DepositConfirmButton from './DepositConfirmButton';

interface OrderDataTableProps {
  orders: Order[];
  isLoading: boolean;
  savingOrderIds?: Set<string>;
  onStatusChange: (id: string, updates: OrderInlineStatusUpdate) => void;
}

export default function OrderDataTable({ orders, isLoading, savingOrderIds = new Set(), onStatusChange }: OrderDataTableProps) {

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
        const firstItemName = row.items[0]?.productName || '상품 정보 없음';
        const itemSummary = row.items.length > 1
          ? `${firstItemName} 외 ${row.items.length - 1}건`
          : firstItemName;
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
      render: (row) => {
        const finalAmount = row.totalPrice + row.deliveryFee;
        return (
          <div>
            <div className="font-bold text-gray-900">{formatPrice(finalAmount)}</div>
            <div className="text-gray-500 text-xs">{row.paymentMethod}</div>
          </div>
        );
      }
    },
    {
      key: 'statusControls',
      header: '상태 변경',
      render: (row) => (
        <OrderInlineStatusControls
          order={row}
          disabled={savingOrderIds.has(row.id)}
          onChange={onStatusChange}
        />
      )
    },
    {
      key: 'actions',
      header: '관리',
      align: 'right',
      render: (row) => (
        <div className="flex flex-col items-end gap-2">
          <DepositConfirmButton
            order={row}
            disabled={savingOrderIds.has(row.id)}
            onStatusChange={onStatusChange}
          />
          <Link
            href={`/admin/orders/${row.id}`}
            className="text-[#2F3B34] hover:underline font-medium text-xs border border-[#2F3B34] px-3 py-1.5 rounded-md inline-block"
          >
            상세보기
          </Link>
        </div>
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
