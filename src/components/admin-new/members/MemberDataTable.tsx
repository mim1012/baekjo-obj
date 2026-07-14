'use client';

import React from 'react';
import Link from 'next/link';
import DataTable, { Column } from '@/components/admin-new/common/DataTable';
import StatusBadge from '@/components/admin-new/common/StatusBadge';
import { formatDate } from '@/lib/format';
import type { User } from '@/types';

interface MemberDataTableProps {
  members: User[];
  isLoading: boolean;
}

export default function MemberDataTable({ members, isLoading }: MemberDataTableProps) {
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <StatusBadge status="error" label="최고 관리자" />;
      case 'b2b': return <StatusBadge status="info" label="B2B/도매" />;
      case 'insurance': return <StatusBadge status="warning" label="보험/심사" />;
      case 'partner': return <StatusBadge status="warning" label="파트너/입점" />;
      default: return <StatusBadge status="neutral" label="일반 회원" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active': return <StatusBadge status="success" label="활성" />;
      case 'pending': return <StatusBadge status="warning" label="대기 (승인 전)" />;
      case 'inactive': return <StatusBadge status="neutral" label="비활성 (정지)" />;
      case 'rejected': return <StatusBadge status="error" label="반려" />;
      default: return <StatusBadge status="success" label="활성" />;
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: '이름/가입일',
      render: (row) => (
        <div>
          <div className="font-medium text-[#17201B]">{row.name}</div>
          <div className="text-gray-500 text-xs">{formatDate(row.createdAt)}</div>
        </div>
      )
    },
    {
      key: 'contact',
      header: '연락처/이메일',
      render: (row) => (
        <div>
          <div className="font-medium text-gray-900">{row.phone}</div>
          <div className="text-gray-500 text-xs">{row.email}</div>
        </div>
      )
    },
    {
      key: 'company',
      header: '소속 (B2B/파트너)',
      render: (row) => (
        <div>
          <div className="text-gray-900">{row.companyName || '-'}</div>
          {row.businessNumber && (
            <div className="text-gray-500 text-xs">사업자: {row.businessNumber}</div>
          )}
        </div>
      )
    },
    {
      key: 'role',
      header: '권한',
      render: (row) => getRoleBadge(row.role)
    },
    {
      key: 'status',
      header: '상태',
      render: (row) => getStatusBadge(row.status)
    },
    {
      key: 'actions',
      header: '관리',
      align: 'right',
      render: (row) => (
        <Link 
          href={`/admin/members/${row.id}`}
          className="text-[#2F3B34] hover:underline font-medium text-xs border border-[#2F3B34] px-3 py-1.5 rounded-md inline-block"
        >
          상세보기
        </Link>
      )
    }
  ];

  return (
    <DataTable
      data={members}
      columns={columns}
      keyExtractor={(row) => row.id}
      isLoading={isLoading}
    />
  );
}
