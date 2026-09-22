'use client';

import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-6 min-w-0">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold text-[#17201B] tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-[14px] text-gray-500">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2 min-w-0 xl:max-w-[60%] xl:justify-end [&>button]:min-h-11 [&>a]:min-h-11">
          {children}
        </div>
      )}
    </div>
  );
}
