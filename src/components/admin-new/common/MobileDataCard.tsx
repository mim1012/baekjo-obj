'use client';

import React, { ReactNode } from 'react';

interface MobileDataCardProps {
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  image?: string;
  details: { label: string; value: ReactNode }[];
  action?: ReactNode;
  selected?: boolean;
  onSelect?: (checked: boolean) => void;
  onClick?: () => void;
}

export default function MobileDataCard({
  title,
  subtitle,
  status,
  image,
  details,
  action,
  selected = false,
  onSelect,
  onClick
}: MobileDataCardProps) {
  return (
    <div 
      className={`bg-white border rounded-md p-4 mb-3 transition-colors ${
        selected ? 'border-[#2F3B34] ring-1 ring-[#2F3B34]' : 'border-gray-200'
      } ${onClick ? 'active:bg-gray-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        {onSelect && (
          <div className="shrink-0 mt-1 min-h-11 flex items-start" onClick={(e) => e.stopPropagation()}>
            <input 
              type="checkbox"
              aria-label="항목 선택"
              checked={selected}
              onChange={(e) => onSelect(e.target.checked)}
              className="size-5 rounded border-gray-300 text-[#2F3B34] focus:ring-[#2F3B34] cursor-pointer"
            />
          </div>
        )}
        
        {image && (
          <div 
            className="w-16 h-16 shrink-0 bg-gray-100 rounded-md overflow-hidden bg-cover bg-center"
            style={{ backgroundImage: `url(${image})` }}
            onClick={onClick}
          />
        )}
        
        <div className="flex-1 min-w-0" onClick={onClick}>
          <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
            <h4 className="text-[15px] font-semibold text-[#17201B] break-words">{title}</h4>
            {status && <div className="shrink-0">{status}</div>}
          </div>
          
          {subtitle && (
            <div className="text-[13px] text-gray-500 mb-2 break-words">{subtitle}</div>
          )}
        </div>
      </div>

      <div className="space-y-3 mt-4" onClick={onClick}>
        {details.map((detail, idx) => (
          <div key={idx} className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-[13px]">
            <span className="text-gray-500">{detail.label}</span>
            <div className="min-w-0 max-w-full break-words font-medium text-[#17201B]">{detail.value}</div>
          </div>
        ))}
      </div>

      {action && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap justify-end gap-2 [&_button]:min-h-11 [&_button]:min-w-11 [&_a]:min-h-11" onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      )}
    </div>
  );
}
