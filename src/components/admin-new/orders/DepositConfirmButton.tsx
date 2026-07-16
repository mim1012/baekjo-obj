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

  // 주문상태는 아직 진행되지 않은 주문(=주문접수)일 때만 함께 올린다.
  // 토스 경로의 setOrderPaid 는 결제 직후에만 도는 반면 입금확인은 관리자가 언제든 누를 수
  // 있어, 이미 '배송중'/'배송완료'인 주문(입금대기 + 배송중 조합은 관리자 select 로 실제
  // 도달 가능하다)에 무조건 '결제완료'를 넣으면 주문상태가 뒤로 후퇴한다(codex 리뷰 HIGH).
  const shouldAdvanceOrderStatus = order.orderStatus === '주문접수';

  const handleClick = () => {
    const confirmed = window.confirm(
      `${order.id} 주문의 입금을 확인 처리하시겠습니까?\n\n` +
        `· 결제상태가 '결제완료'로 변경됩니다.` +
        (shouldAdvanceOrderStatus ? `\n· 주문상태도 '결제완료'로 함께 변경됩니다.` : '') +
        `\n\n⚠️ 확인 후에는 미결제 취소로 재고가 자동 복원되지 않습니다(결제완료 주문은 복원 RPC 대상이 아님). 실제 입금을 확인한 뒤 진행하세요.`
    );
    if (!confirmed) return;
    onStatusChange(
      order.id,
      shouldAdvanceOrderStatus
        ? { paymentStatus: '결제완료', orderStatus: '결제완료' }
        : { paymentStatus: '결제완료' },
    );
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
