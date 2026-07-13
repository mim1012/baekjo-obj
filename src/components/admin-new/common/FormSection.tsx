'use client';

import React, { ReactNode } from 'react';

interface FormSectionProps {
  title: ReactNode;
  description?: string;
  children: ReactNode;
  className?: string;
}

export default function FormSection({ title, description, children, className = '' }: FormSectionProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-md overflow-hidden ${className}`}>
      <div className="px-6 py-5 border-b border-gray-200 bg-[#F7F8F6]/50">
        <h3 className="text-[16px] font-semibold text-[#17201B]">{title}</h3>
        {description && (
          <p className="mt-1 text-[13px] text-gray-500">{description}</p>
        )}
      </div>
      <div className="p-6 space-y-6">
        {children}
      </div>
    </div>
  );
}
