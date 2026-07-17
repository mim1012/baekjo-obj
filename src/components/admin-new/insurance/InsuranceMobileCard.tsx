'use client';

import React from 'react';
import Link from 'next/link';
import MobileDataCard from '@/components/admin-new/common/MobileDataCard';
import StatusBadge from '@/components/admin-new/common/StatusBadge';
import { formatDate } from '@/lib/format';
import type { InsuranceApplication } from '@/types';

interface InsuranceMobileCardProps {
  application: InsuranceApplication;
}

export default function InsuranceMobileCard({ application }: InsuranceMobileCardProps) {
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

  return (
    <MobileDataCard
      title={`${application.name} (${application.petName})`}
      subtitle={formatDate(application.createdAt)}
      status={getStatusBadge(application.status)}
      details={[
        { label: '연락처', value: application.phone },
        { label: '반려동물', value: `${application.petType} · ${application.breed}` },
        { label: '연락 여부', value: application.contacted ? '연락 완료' : '미연락' },
      ]}
      action={
        <Link 
          href={`/admin/insurance/${application.id}`}
          className="text-[#2F3B34] hover:bg-gray-50 font-medium text-[13px] border border-[#2F3B34] px-3 py-1.5 rounded-md inline-block w-full text-center"
        >
          상세보기
        </Link>
      }
    />
  );
}
