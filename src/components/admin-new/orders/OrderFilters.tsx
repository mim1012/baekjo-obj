'use client';

import React from 'react';
import FilterBar from '@/components/admin-new/common/FilterBar';

interface OrderFiltersProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  orderStatus: string;
  onOrderStatusChange: (val: string) => void;
  paymentStatus: string;
  onPaymentStatusChange: (val: string) => void;
  deliveryStatus: string;
  onDeliveryStatusChange: (val: string) => void;
}

export default function OrderFilters({
  searchTerm,
  onSearchChange,
  orderStatus,
  onOrderStatusChange,
  paymentStatus,
  onPaymentStatusChange,
  deliveryStatus,
  onDeliveryStatusChange,
}: OrderFiltersProps) {
  return (
    <FilterBar
      searchPlaceholder="주문번호, 주문자명, 연락처, 상품명 검색"
      searchValue={searchTerm}
      onSearch={onSearchChange}
    >
      <div className="flex items-center gap-2">
        <label className="text-[13px] text-gray-500 font-medium">주문 상태</label>
        <select
          value={orderStatus}
          onChange={(e) => onOrderStatusChange(e.target.value)}
          className="px-3 py-1.5 text-[14px] border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#2F3B34]"
        >
          <option value="전체">전체 주문 상태</option>
          <option value="주문접수">주문접수</option>
          <option value="결제완료">결제완료</option>
          <option value="배송준비">배송준비</option>
          <option value="배송중">배송중</option>
          <option value="배송완료">배송완료</option>
          <option value="취소요청">취소요청</option>
          <option value="취소완료">취소완료</option>
          <option value="환불완료">환불완료</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[13px] text-gray-500 font-medium">결제 상태</label>
        <select
          value={paymentStatus}
          onChange={(e) => onPaymentStatusChange(e.target.value)}
          className="px-3 py-1.5 text-[14px] border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#2F3B34]"
        >
          <option value="전체">전체 결제 상태</option>
          <option value="결제대기">결제대기</option>
          <option value="결제완료">결제완료</option>
          <option value="결제취소">결제취소</option>
          <option value="환불완료">환불완료</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[13px] text-gray-500 font-medium">배송 상태</label>
        <select
          value={deliveryStatus}
          onChange={(e) => onDeliveryStatusChange(e.target.value)}
          className="px-3 py-1.5 text-[14px] border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#2F3B34]"
        >
          <option value="전체">전체 배송 상태</option>
          <option value="배송전">배송전</option>
          <option value="배송준비">배송준비</option>
          <option value="배송중">배송중</option>
          <option value="배송완료">배송완료</option>
        </select>
      </div>
    </FilterBar>
  );
}
