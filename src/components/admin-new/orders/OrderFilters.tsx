'use client';

import React from 'react';
import FilterBar from '@/components/admin-new/common/FilterBar';

interface OrderFiltersProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
}

/**
 * 주문 목록 검색 바. 상태별 3축 select 는 스마트스토어식 진행 단계 탭(OrderFunnelTabs)이 대체했다 —
 * 탭이 1차 필터, 검색은 그 안에서 주문번호·주문자·연락처·상품명을 좁힌다.
 */
export default function OrderFilters({ searchTerm, onSearchChange }: OrderFiltersProps) {
  return (
    <FilterBar
      searchPlaceholder="주문번호, 주문자명, 연락처, 상품명 검색"
      searchValue={searchTerm}
      onSearch={onSearchChange}
    >
      <span className="text-[13px] text-gray-400">진행 단계는 위 탭에서 선택하세요.</span>
    </FilterBar>
  );
}
