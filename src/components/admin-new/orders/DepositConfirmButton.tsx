'use client';

import React from 'react';
import type { Order } from '@/types';

/**
 * 목록/상세에서 주문 상태를 부분 갱신할 때 쓰는 콜백 페이로드 타입. 예전 OrderInlineStatusControls
 * 가 export 하던 타입을 퍼널 개편으로 이 파일로 옮겼다(목록의 3축 select 제거). 목록에서 실제로
 * 남는 소비자는 입금확인(paymentStatus 전이) 하나뿐이다.
 */
export type OrderStatusUpdate = Partial<
  Pick<Order, 'orderStatus' | 'paymentStatus' | 'deliveryStatus'>
>;

/** 입금확인 전이 — 결제상태만 '결제완료'로 올린다(주문상태 동반 전이 금지, 아래 주석 참조). */
export const DEPOSIT_CONFIRM_UPDATE: OrderStatusUpdate = { paymentStatus: '결제완료' };

interface DepositConfirmButtonProps {
  order: Order;
  disabled?: boolean;
  className?: string;
  onStatusChange: (id: string, updates: OrderStatusUpdate) => void;
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
      `${order.id} 주문의 입금을 확인 처리하시겠습니까?\n\n` +
        `· 결제상태가 '결제완료'로 변경됩니다(주문상태는 그대로이니 필요하면 따로 변경하세요).\n\n` +
        `⚠️ 확인 후에는 미결제 취소로 재고가 자동 복원되지 않습니다(결제완료 주문은 복원 RPC 대상이 아님). 실제 입금을 확인한 뒤 진행하세요.`
    );
    if (!confirmed) return;
    onStatusChange(order.id, DEPOSIT_CONFIRM_UPDATE);
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
