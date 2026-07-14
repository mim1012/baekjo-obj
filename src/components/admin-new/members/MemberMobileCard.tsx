'use client';

import React from 'react';
import Link from 'next/link';
import MobileDataCard from '@/components/admin-new/common/MobileDataCard';
import StatusBadge from '@/components/admin-new/common/StatusBadge';
import { formatDate } from '@/lib/format';
import type { User } from '@/types';

interface MemberMobileCardProps {
  member: User;
}

export default function MemberMobileCard({ member }: MemberMobileCardProps) {
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
      case 'pending': return <StatusBadge status="warning" label="대기" />;
      case 'inactive': return <StatusBadge status="neutral" label="비활성" />;
      case 'rejected': return <StatusBadge status="error" label="반려" />;
      default: return <StatusBadge status="success" label="활성" />;
    }
  };

  return (
    <MobileDataCard
      title={member.name}
      subtitle={member.email}
      status={getStatusBadge(member.status)}
      details={[
        { label: '연락처', value: member.phone },
        { label: '가입일', value: formatDate(member.createdAt) },
        { label: '권한', value: getRoleBadge(member.role) },
      ]}
      action={
        <Link 
          href={`/admin/members/${member.id}`}
          className="text-[#2F3B34] hover:bg-gray-50 font-medium text-[13px] border border-[#2F3B34] px-3 py-1.5 rounded-md inline-block w-full text-center"
        >
          상세보기
        </Link>
      }
    />
  );
}
