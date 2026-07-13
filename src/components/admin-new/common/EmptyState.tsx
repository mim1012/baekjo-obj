'use client';

import React from 'react';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-12 flex flex-col items-center justify-center text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
        <FileQuestion size={24} />
      </div>
      <h3 className="text-[16px] font-semibold text-[#17201B] mb-1">{title}</h3>
      {description && <p className="text-[14px] text-gray-500 max-w-md mx-auto mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
