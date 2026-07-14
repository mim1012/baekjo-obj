'use client';

import React from 'react';
import MobileDataCard from '@/components/admin-new/common/MobileDataCard';
import StatusBadge from '@/components/admin-new/common/StatusBadge';
import { formatDate } from '@/lib/format';
import { Lock, EyeOff } from 'lucide-react';
import type { QnA } from '@/types';

interface QnaMobileCardProps {
  item: QnA;
  selectedId?: string;
  onSelect: (id: string) => void;
}

export default function QnaMobileCard({ item, selectedId, onSelect }: QnaMobileCardProps) {
  return (
    <div className={selectedId === item.id ? 'ring-2 ring-[#2F3B34] rounded-md' : ''}>
      <MobileDataCard
        title={
          <div className="flex items-center gap-1 truncate">
            {item.question}
            {item.isSecret && <Lock className="w-3 h-3 text-gray-400 shrink-0" />}
            {item.isVisible === false && <EyeOff className="w-3 h-3 text-red-400 shrink-0" />}
          </div>
        }
        subtitle={formatDate(item.createdAt)}
        status={
          item.status === '답변완료' 
            ? <StatusBadge status="success" label="답변완료" /> 
            : <StatusBadge status="warning" label="답변대기" />
        }
        details={[
          { label: '작성자', value: item.writerName },
          { label: '상품', value: item.productName },
        ]}
        action={
          <button 
            onClick={() => onSelect(item.id)}
            className={`w-full text-center font-medium text-[13px] border px-3 py-1.5 rounded-md ${
              selectedId === item.id 
                ? 'bg-[#2F3B34] text-white border-[#2F3B34]' 
                : 'text-[#2F3B34] hover:bg-gray-50 border-[#2F3B34]'
            }`}
          >
            답변/관리
          </button>
        }
      />
    </div>
  );
}
