'use client';

import React from 'react';

interface BulkActionBarProps {
  count: number;
  actions: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger';
  }[];
  onClear: () => void;
}

export default function BulkActionBar({ count, actions, onClear }: BulkActionBarProps) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-white border border-gray-200 shadow-lg rounded-full px-4 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3 pr-4 border-r border-gray-200">
        <span className="text-[13px] font-medium text-gray-700">
          <strong className="text-[#2F3B34]">{count}</strong>개 선택됨
        </span>
        <button 
          onClick={onClear}
          className="text-[12px] text-gray-500 hover:text-gray-800 underline underline-offset-2"
        >
          선택 해제
        </button>
      </div>
      <div className="flex items-center gap-2">
        {actions.map((action, idx) => (
          <button
            key={idx}
            onClick={action.onClick}
            className={`px-3 py-1.5 text-[13px] font-medium rounded-full transition-colors ${
              action.variant === 'danger' 
                ? 'text-[#A65348] hover:bg-[#FDF2F2]' 
                : 'text-[#17201B] hover:bg-gray-100'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
