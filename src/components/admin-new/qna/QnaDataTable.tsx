'use client';

import React from 'react';
import DataTable, { Column } from '@/components/admin-new/common/DataTable';
import StatusBadge from '@/components/admin-new/common/StatusBadge';
import { formatDate } from '@/lib/format';
import { Lock, EyeOff } from 'lucide-react';
import type { QnA } from '@/types';

interface QnaDataTableProps {
  items: QnA[];
  selectedId?: string;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export default function QnaDataTable({ items, selectedId, onSelect, isLoading }: QnaDataTableProps) {
  const columns: Column<QnA>[] = [
    {
      key: 'status',
      header: '상태',
      render: (row) => (
        row.status === '답변완료' 
          ? <StatusBadge status="success" label="답변완료" /> 
          : <StatusBadge status="warning" label="답변대기" />
      )
    },
    {
      key: 'product',
      header: '문의 상품',
      render: (row) => (
        <div className="font-medium text-[#17201B] truncate max-w-[120px]" title={row.productName}>
          {row.productName}
        </div>
      )
    },
    {
      key: 'question',
      header: '내용',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="text-[#17201B] truncate max-w-[200px]" title={row.question}>
            {row.question}
          </div>
          {row.isSecret && <span title="비밀글"><Lock className="w-3 h-3 text-gray-400 shrink-0" /></span>}
          {row.isVisible === false && <span title="숨김처리됨"><EyeOff className="w-3 h-3 text-red-400 shrink-0" /></span>}
        </div>
      )
    },
    {
      key: 'writer',
      header: '작성자',
      render: (row) => (
        <div className="text-gray-900">{row.writerName}</div>
      )
    },
    {
      key: 'createdAt',
      header: '작성일',
      render: (row) => (
        <div className="text-gray-500 text-xs">{formatDate(row.createdAt)}</div>
      )
    },
    {
      key: 'actions',
      header: '관리',
      align: 'right',
      render: (row) => (
        <button 
          onClick={() => onSelect(row.id)}
          className={`text-xs px-3 py-1.5 rounded-md inline-block font-medium border transition-colors ${
            selectedId === row.id 
              ? 'bg-[#2F3B34] text-white border-[#2F3B34]' 
              : 'text-[#2F3B34] hover:bg-gray-50 border-[#2F3B34]'
          }`}
        >
          답변/관리
        </button>
      )
    }
  ];

  return (
    <DataTable
      data={items}
      columns={columns}
      keyExtractor={(row) => row.id}
      isLoading={isLoading}
    />
  );
}
