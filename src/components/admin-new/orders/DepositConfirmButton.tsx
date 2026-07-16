'use client';

import React from 'react';
import type { Order } from '@/types';
import type { OrderInlineStatusUpdate } from './OrderInlineStatusControls';

interface DepositConfirmButtonProps {
  order: Order;
  disabled?: boolean;
  className?: string;
  onStatusChange: (id: string, updates: OrderInlineStatusUpdate) => void;
}

export default function DepositConfirmButton({
  order,
  disabled = false,
  className = '',
  onStatusChange,
}: DepositConfirmButtonProps) {
  if (order.paymentStatus !== '입금대기') return null;

  const handleClick = () => {
    const confirmed = window.confirm(
      `${order.id} 주문의 입금을 확인 처리하시겠습니까?\n결제상태가 '결제완료'로 변경됩니다.`
    );
    if (!confirmed) return;
    onStatusChange(order.id, { paymentStatus: '결제완료', orderStatus: '결제완료' });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`text-white bg-[#2F3B34] hover:bg-[#232B25] font-medium text-xs px-3 py-1.5 rounded-md disabled:cursor-wait disabled:bg-gray-300 ${className}`}
    >
      입금확인
    </button>
  );
}
