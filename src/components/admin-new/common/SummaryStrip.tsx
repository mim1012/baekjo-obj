'use client';

import React from 'react';

interface SummaryItem {
  label: string;
  value: string | number;
  highlight?: boolean;
  onClick?: () => void;
  icon?: React.ElementType;
}

interface SummaryStripProps {
  items: SummaryItem[];
}

export default function SummaryStrip({ items }: SummaryStripProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-4 mb-6 flex flex-wrap gap-x-8 gap-y-4">
      {items.map((item, idx) => (
        <div 
          key={idx} 
          className={`flex items-center gap-3 ${item.onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          onClick={item.onClick}
        >
          {item.icon && (
            <div className={`p-2 rounded-full ${item.highlight ? 'bg-red-50 text-[#A65348]' : 'bg-gray-50 text-gray-400'}`}>
              <item.icon size={20} />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-1">
              {item.label}
            </span>
            <span className={`text-[20px] font-bold ${item.highlight ? 'text-[#A65348]' : 'text-[#17201B]'}`}>
              {item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
