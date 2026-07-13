'use client';

import React, { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  selectedIds?: string[];
  onSelect?: (id: string, checked: boolean) => void;
  onSelectAll?: (checked: boolean) => void;
  isLoading?: boolean;
}

export default function DataTable<T>({ 
  data, 
  columns, 
  keyExtractor, 
  selectedIds = [], 
  onSelect, 
  onSelectAll,
  isLoading = false 
}: DataTableProps<T>) {
  
  const allSelected = data.length > 0 && selectedIds.length === data.length;

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-md p-8 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2F3B34]"></div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-[#F7F8F6] border-b border-gray-200 text-[13px] font-semibold text-gray-600">
              {onSelectAll && (
                <th className="px-4 py-3 w-10 text-center">
                  <input 
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-[#2F3B34] focus:ring-[#2F3B34] cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th 
                  key={col.key} 
                  className={`px-4 py-3 ${col.width || ''}`}
                  style={{ textAlign: col.align || 'left' }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onSelectAll ? 1 : 0)} className="px-4 py-12 text-center text-gray-500 text-[14px]">
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const id = keyExtractor(row);
                const isSelected = selectedIds.includes(id);
                return (
                  <tr key={id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-green-50/50' : ''}`}>
                    {onSelect && (
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelect(id, e.target.checked)}
                          className="rounded border-gray-300 text-[#2F3B34] focus:ring-[#2F3B34] cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td 
                        key={col.key} 
                        className="px-4 py-3 text-[14px] text-[#17201B]"
                        style={{ textAlign: col.align || 'left' }}
                      >
                        {col.render ? col.render(row) : String((row as any)[col.key] || '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
