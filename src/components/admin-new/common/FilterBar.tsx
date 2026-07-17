'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface FilterBarProps {
  children: React.ReactNode;
  onSearch?: (term: string) => void;
  searchPlaceholder?: string;
  searchValue?: string;
}

export default function FilterBar({ children, onSearch, searchPlaceholder = '검색...', searchValue = '' }: FilterBarProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-3">
        {children}
      </div>
      
      {onSearch && (
        <div className="relative w-full md:w-64 shrink-0">
          <input 
            type="text" 
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-[14px] border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#2F3B34] focus:border-[#2F3B34]"
          />
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      )}
    </div>
  );
}
