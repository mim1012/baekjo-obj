'use client';

import React from 'react';
import FilterBar from '@/components/admin-new/common/FilterBar';

interface InsuranceFiltersProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  contactedFilter: string;
  onContactedFilterChange: (val: string) => void;
}

export default function InsuranceFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  contactedFilter,
  onContactedFilterChange,
}: InsuranceFiltersProps) {
  return (
    <FilterBar
      searchPlaceholder="신청자명, 연락처, 반려동물명 검색"
      searchValue={searchTerm}
      onSearch={onSearchChange}
    >
      <div className="flex items-center gap-2">
        <label className="text-[13px] text-gray-500 font-medium">상담 상태</label>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-3 py-1.5 text-[14px] border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#2F3B34]"
        >
          <option value="전체">전체 상태</option>
          <option value="신청완료">신청완료</option>
          <option value="접수">접수</option>
          <option value="분석중">분석중</option>
          <option value="상담중">상담중</option>
          <option value="분석완료">분석완료</option>
          <option value="완료">완료</option>
          <option value="보류">보류</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[13px] text-gray-500 font-medium">연락 여부</label>
        <select
          value={contactedFilter}
          onChange={(e) => onContactedFilterChange(e.target.value)}
          className="px-3 py-1.5 text-[14px] border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#2F3B34]"
        >
          <option value="전체">전체</option>
          <option value="true">연락 완료</option>
          <option value="false">미연락</option>
        </select>
      </div>
    </FilterBar>
  );
}
