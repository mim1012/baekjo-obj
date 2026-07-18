'use client';

import React from 'react';
import Link from 'next/link';
import DataTable, { Column } from '@/components/admin-new/common/DataTable';
import { formatDate, formatPrice } from '@/lib/format';
import type { Brand, Order } from '@/types';
import { deriveFunnelStage, stageAction } from './orderFunnel';
import OrderFunnelBadge from './OrderFunnelBadge';
import DepositConfirmButton, { type OrderStatusUpdate } from './DepositConfirmButton';
import ShipActionPopover from './ShipActionPopover';

interface OrderDataTableProps {
  orders: Order[];
  isLoading: boolean;
  savingOrderIds?: Set<string>;
  /** 입금확인(결제상태 전이) 콜백. 목록에서 남은 유일한 주문상태 갱신 경로. */
  onDepositConfirm: (id: string, updates: OrderStatusUpdate) => void;
  /** id→Brand 맵 — 발송처리 팝오버의 기본 택배사·업체명 프리필용. */
  brandMap: Record<string, Brand>;
  /** 발송 처리 성공 시 주문 재조회. */
  onShipped: () => void | Promise<void>;
  /** 체크박스 선택 활성 여부(입금대기 탭에서만 true). */
  selectable?: boolean;
  selectedIds?: string[];
  onSelect?: (id: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
}

export default function OrderDataTable({
  orders,
  isLoading,
  savingOrderIds = new Set(),
  onDepositConfirm,
  brandMap,
  onShipped,
  selectable = false,
  selectedIds = [],
  onSelect,
  onSelectAll,
}: OrderDataTableProps) {
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
      key: 'stage',
      header: '진행 상태',
      render: (row) => <OrderFunnelBadge stage={deriveFunnelStage(row)} />,
    },
    {
      key: 'actions',
      header: '관리',
      align: 'right',
      render: (row) => {
        const action = stageAction(deriveFunnelStage(row));
        return (
          <div className="flex flex-col items-end gap-2">
            {action === 'depositConfirm' && (
              <DepositConfirmButton
                order={row}
                disabled={savingOrderIds.has(row.id)}
                onStatusChange={onDepositConfirm}
              />
            )}
            {action === 'ship' && (
              <ShipActionPopover order={row} brandMap={brandMap} onShipped={onShipped} />
            )}
            <Link
              href={`/admin/orders/${row.id}`}
              className="text-[#2F3B34] hover:underline font-medium text-xs border border-[#2F3B34] px-3 py-1.5 rounded-md inline-block"
            >
              상세보기
            </Link>
          </div>
        );
      }
    }
  ];

  return (
    <DataTable
      data={orders}
      columns={columns}
      keyExtractor={(row) => row.id}
      isLoading={isLoading}
      selectedIds={selectable ? selectedIds : undefined}
      onSelect={selectable ? onSelect : undefined}
      onSelectAll={selectable ? onSelectAll : undefined}
    />
  );
}
