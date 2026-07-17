'use client';

import React from 'react';
import FilterBar from '@/components/admin-new/common/FilterBar';

interface MemberFiltersProps {
  searchTerm: string;
  onSearchChange: (val: string) => void;
  roleFilter: string;
  onRoleFilterChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
}

export default function MemberFilters({
  searchTerm,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
}: MemberFiltersProps) {
  return (
    <FilterBar
      searchPlaceholder="이름, 이메일, 연락처, 회사명 검색"
      searchValue={searchTerm}
      onSearch={onSearchChange}
    >
      <div className="flex items-center gap-2">
        <label className="text-[13px] text-gray-500 font-medium">권한</label>
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
          className="px-3 py-1.5 text-[14px] border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#2F3B34]"
        >
          <option value="전체">전체 권한</option>
          <option value="user">일반 회원</option>
          <option value="admin">최고 관리자</option>
          <option value="b2b">B2B/도매</option>
          <option value="insurance">보험/심사</option>
          <option value="partner">파트너/입점</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[13px] text-gray-500 font-medium">계정 상태</label>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="px-3 py-1.5 text-[14px] border border-gray-300 rounded-md bg-white focus:outline-none focus:border-[#2F3B34]"
        >
          <option value="전체">전체 상태</option>
          <option value="active">활성</option>
          <option value="pending">대기 (승인 전)</option>
          <option value="inactive">비활성 (정지)</option>
          <option value="rejected">반려</option>
        </select>
      </div>
    </FilterBar>
  );
}
