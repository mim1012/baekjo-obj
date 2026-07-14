'use client';

import React from 'react';

type BadgeStatus = 'success' | 'warning' | 'error' | 'neutral' | 'info';

interface StatusBadgeProps {
  status: BadgeStatus;
  label: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const styles: Record<BadgeStatus, string> = {
    success: 'bg-[#EAF3EC] text-[#2F7A4F] border-[#C3DEC9]',
    warning: 'bg-[#FFF7E6] text-[#D97706] border-[#FDE68A]',
    error: 'bg-[#FDF2F2] text-[#A65348] border-[#F8D7D7]',
    neutral: 'bg-gray-100 text-gray-600 border-gray-200',
    info: 'bg-[#F0F5FF] text-[#1D4ED8] border-[#BFDBFE]'
  };

  return (
    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[12px] font-medium border ${styles[status]}`}>
      {label}
    </span>
  );
}
