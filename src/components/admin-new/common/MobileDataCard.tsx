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
          <div className="shrink-0 mt-1" onClick={(e) => e.stopPropagation()}>
            <input 
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(e.target.checked)}
              className="rounded border-gray-300 text-[#2F3B34] focus:ring-[#2F3B34] cursor-pointer"
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
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="text-[15px] font-semibold text-[#17201B] truncate">{title}</h4>
            {status && <div className="shrink-0">{status}</div>}
          </div>
          
          {subtitle && (
            <div className="text-[13px] text-gray-500 mb-2 truncate">{subtitle}</div>
          )}
          
          <div className="space-y-1 mt-3">
            {details.map((detail, idx) => (
              <div key={idx} className="flex justify-between text-[13px]">
                <span className="text-gray-500">{detail.label}</span>
                <span className="font-medium text-[#17201B]">{detail.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {action && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end" onClick={(e) => e.stopPropagation()}>
          {action}
        </div>
      )}
    </div>
  );
}
