'use client';

import React from 'react';
import Link from 'next/link';
import DataTable, { Column } from '@/components/admin-new/common/DataTable';
import StatusBadge from '@/components/admin-new/common/StatusBadge';
import { formatDate } from '@/lib/format';
import type { InsuranceApplication } from '@/types';

interface InsuranceDataTableProps {
  applications: InsuranceApplication[];
  isLoading: boolean;
}

export default function InsuranceDataTable({ applications, isLoading }: InsuranceDataTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case '신청완료': return <StatusBadge status="info" label="신청완료" />;
      case '접수': return <StatusBadge status="neutral" label="접수" />;
      case '분석중': return <StatusBadge status="warning" label="분석중" />;
      case '상담중': return <StatusBadge status="warning" label="상담중" />;
      case '분석완료': return <StatusBadge status="success" label="분석완료" />;
      case '완료': return <StatusBadge status="success" label="완료" />;
      case '보류': return <StatusBadge status="error" label="보류" />;
      default: return <StatusBadge status="neutral" label={status} />;
    }
  };

  const columns: Column<InsuranceApplication>[] = [
    {
      key: 'createdAt',
      header: '신청일',
      render: (row) => (
        <div>
          <div className="font-medium text-[#17201B]">{formatDate(row.createdAt)}</div>
        </div>
      )
    },
    {
      key: 'name',
      header: '신청자(연락처)',
      render: (row) => (
        <div>
          <div className="font-medium text-[#17201B]">{row.name}</div>
          <div className="text-gray-500 text-xs">{row.phone}</div>
        </div>
      )
    },
    {
      key: 'petInfo',
      header: '반려동물',
      render: (row) => (
        <div>
          <div className="text-[#17201B] font-medium">{row.petName} <span className="font-normal text-gray-500 text-xs">({row.petAge}살)</span></div>
          <div className="text-gray-500 text-xs">{row.petType} · {row.breed}</div>
        </div>
      )
    },
    {
      key: 'coverageNeeds',
      header: '관심 보장항목',
      render: (row) => (
        <div className="text-gray-900 truncate max-w-[150px]" title={row.coverageNeeds.join(', ')}>
          {row.coverageNeeds.length > 0 ? row.coverageNeeds.join(', ') : '-'}
        </div>
      )
    },
    {
      key: 'contacted',
      header: '연락 여부',
      render: (row) => (
        row.contacted 
          ? <StatusBadge status="success" label="연락 완료" /> 
          : <StatusBadge status="neutral" label="미연락" />
      )
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
          href={`/admin/insurance/${row.id}`}
          className="text-[#2F3B34] hover:underline font-medium text-xs border border-[#2F3B34] px-3 py-1.5 rounded-md inline-block"
        >
          상세보기
        </Link>
      )
    }
  ];

  return (
    <DataTable
      data={applications}
      columns={columns}
      keyExtractor={(row) => row.id}
      isLoading={isLoading}
    />
  );
}
