'use client';

import React from 'react';
import FilterBar from '@/components/admin-new/common/FilterBar';

interface QnaFiltersProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  visibilityFilter: string;
  onVisibilityFilterChange: (val: string) => void;
}

export default function QnaFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  visibilityFilter,
  onVisibilityFilterChange,
}: QnaFiltersProps) {
  return (
    <FilterBar
      searchPlaceholder="작성자명, 상품명, 문의내용 검색"
      searchValue={searchTerm}
      onSearch={onSearchChange}
    >
      <div className="flex items-center gap-2">
        <label className="text-[13px] text-gray-500 font-medium">답변 상태</label>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-3 py-1.5 text-[14px] border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#2F3B34]"
        >
          <option value="전체">전체 상태</option>
          <option value="답변대기">답변대기</option>
          <option value="답변완료">답변완료</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[13px] text-gray-500 font-medium">공개 설정</label>
        <select
          value={visibilityFilter}
          onChange={(e) => onVisibilityFilterChange(e.target.value)}
          className="px-3 py-1.5 text-[14px] border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#2F3B34]"
        >
          <option value="전체">전체</option>
          <option value="public">공개글</option>
          <option value="secret">비밀글</option>
          <option value="hidden">숨김처리</option>
        </select>
      </div>
    </FilterBar>
  );
}
