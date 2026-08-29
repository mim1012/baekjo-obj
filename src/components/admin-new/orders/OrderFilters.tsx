'use client';

import React from 'react';
import { Download } from 'lucide-react';
import FilterBar from '@/components/admin-new/common/FilterBar';
import { ALL_ORDER_FILTER_VALUE, type AdminOrderFilters } from '@/lib/orders/adminOrderFilters';
import {
  DELIVERY_STATUSES,
  PAYMENT_STATUSES,
  type Brand,
  type DeliveryStatus,
  type PaymentStatus,
} from '@/types';

interface OrderFiltersProps {
  filters: AdminOrderFilters;
  brands: Brand[];
  exportHref: string;
  onFilterChange: (patch: Partial<AdminOrderFilters>) => void;
  onSearchChange: (val: string) => void;
}

function paymentFilterValue(value: string): PaymentStatus | typeof ALL_ORDER_FILTER_VALUE {
  return (PAYMENT_STATUSES as readonly string[]).includes(value)
    ? (value as PaymentStatus)
    : ALL_ORDER_FILTER_VALUE;
}

function deliveryFilterValue(value: string): DeliveryStatus | typeof ALL_ORDER_FILTER_VALUE {
  return (DELIVERY_STATUSES as readonly string[]).includes(value)
    ? (value as DeliveryStatus)
    : ALL_ORDER_FILTER_VALUE;
}

/**
 * 주문 목록 검색 바. 상태별 3축 select 는 스마트스토어식 진행 단계 탭(OrderFunnelTabs)이 대체했다 —
 * 탭이 1차 필터, 검색은 그 안에서 주문번호·주문자·연락처·상품명을 좁힌다.
 */
export default function OrderFilters({
  filters,
  brands,
  exportHref,
  onFilterChange,
  onSearchChange,
}: OrderFiltersProps) {
  return (
    <FilterBar
      searchPlaceholder="주문번호, 주문자명, 연락처, 상품명 검색"
      searchValue={filters.searchTerm}
      onSearch={onSearchChange}
    >
      <label className="flex items-center gap-2 text-[13px] text-gray-600">
        <span className="shrink-0">기간</span>
        <input
          type="date"
          value={filters.createdFrom}
          onChange={(event) => onFilterChange({ createdFrom: event.target.value })}
          className="h-9 rounded-md border border-gray-300 px-2 text-[13px] focus:border-[#2F3B34] focus:outline-none focus:ring-1 focus:ring-[#2F3B34]"
        />
        <span className="text-gray-400">~</span>
        <input
          type="date"
          value={filters.createdTo}
          onChange={(event) => onFilterChange({ createdTo: event.target.value })}
          className="h-9 rounded-md border border-gray-300 px-2 text-[13px] focus:border-[#2F3B34] focus:outline-none focus:ring-1 focus:ring-[#2F3B34]"
        />
      </label>
      <label className="flex items-center gap-2 text-[13px] text-gray-600">
        <span className="shrink-0">브랜드</span>
        <select
          value={filters.brandId}
          onChange={(event) => onFilterChange({ brandId: event.target.value })}
          className="h-9 max-w-[180px] rounded-md border border-gray-300 px-2 text-[13px] focus:border-[#2F3B34] focus:outline-none focus:ring-1 focus:ring-[#2F3B34]"
        >
          <option value={ALL_ORDER_FILTER_VALUE}>전체</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-[13px] text-gray-600">
        <span className="shrink-0">결제</span>
        <select
          value={filters.paymentStatus}
          onChange={(event) => onFilterChange({ paymentStatus: paymentFilterValue(event.target.value) })}
          className="h-9 rounded-md border border-gray-300 px-2 text-[13px] focus:border-[#2F3B34] focus:outline-none focus:ring-1 focus:ring-[#2F3B34]"
        >
          <option value={ALL_ORDER_FILTER_VALUE}>전체</option>
          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-[13px] text-gray-600">
        <span className="shrink-0">배송</span>
        <select
          value={filters.deliveryStatus}
          onChange={(event) => onFilterChange({ deliveryStatus: deliveryFilterValue(event.target.value) })}
          className="h-9 rounded-md border border-gray-300 px-2 text-[13px] focus:border-[#2F3B34] focus:outline-none focus:ring-1 focus:ring-[#2F3B34]"
        >
          <option value={ALL_ORDER_FILTER_VALUE}>전체</option>
          {DELIVERY_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <a
        href={exportHref}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#2F3B34] px-3 text-[13px] font-medium text-[#2F3B34] hover:bg-[#F4F2EC]"
      >
        <Download className="h-4 w-4" />
        다운로드
      </a>
    </FilterBar>
  );
}
