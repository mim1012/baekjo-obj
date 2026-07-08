'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { Filter, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
interface Column {
  key: string;
  label: string;
}

interface AdminResourcePageProps {
  title: string;
  description: string;
  actionLabel: string;
  searchPlaceholder: string;
  columns: Column[];
  rows: Array<Record<string, string | number>>;
  filters?: string[];
  createFields?: string[];
  customActions?: (row: Record<string, string | number>) => React.ReactNode;
  renderExpandedRow?: (row: Record<string, string | number>) => React.ReactNode;
}

export default function AdminResourcePage({
  title,
  description,
  actionLabel,
  searchPlaceholder,
  columns,
  rows,
  filters = ['전체 상태'],
  createFields = [],
  customActions,
  renderExpandedRow,
}: AdminResourcePageProps) {
  const [editingRow, setEditingRow] = useState<Record<string, string | number> | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string | number>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string>(filters[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  const handleEdit = (row: Record<string, string | number>) => {
    setEditingRow(row);
  };

  const closeEdit = () => {
    setEditingRow(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeEdit();
        document.querySelectorAll('details').forEach(d => d.removeAttribute('open'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDelete = (id: string | number) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      setDeletedIds(prev => new Set(prev).add(id));
    }
  };

  const visibleRows = rows.filter(r => !deletedIds.has(r.id as string | number));
  
  const filteredRows = visibleRows.filter(r => {
    const matchesFilter = activeFilter === filters[0] || Object.values(r).some(val => String(val).includes(activeFilter));
    const matchesSearch = searchQuery === '' || Object.values(r).some(val => String(val).toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  const paginatedRows = filteredRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold text-[#697269]">ADMIN CONSOLE</p>
          <h1 className="mt-2 text-3xl font-normal text-[#202521]">{title}</h1>
          <p className="mt-2 text-sm text-[#737A74]">{description}</p>
        </div>
        <details className="relative">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 bg-[#2F3B34] px-5 text-sm font-semibold text-white">
            <Plus className="size-4" /> {actionLabel}
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-[min(92vw,620px)] border border-[#D1D0C8] bg-white p-6 shadow-lg">
            <h2 className="text-xl font-semibold text-[#202521]">{actionLabel}</h2>
            <p className="mt-2 text-xs text-[#7B827C]">MVP mock 입력 UI이며 실제 서버 저장은 연결되지 않습니다.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {(createFields.length > 0 ? createFields : columns.map(c => c.label)).map((field) => (
                <label key={field} className="text-xs font-medium text-[#59615B]">
                  {field}
                  <input className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm" placeholder={`${field} 입력`} />
                </label>
              ))}
            </div>
            <button type="button" className="mt-6 min-h-11 bg-[#2F3B34] px-5 text-sm font-semibold text-white">저장</button>
          </div>
        </details>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['전체', visibleRows.length],
          ['노출/활성', visibleRows.filter((row) => String(row.status ?? '').includes('중') || String(row.status ?? '').includes('활성')).length],
          ['점검 필요', visibleRows.filter((row) => String(row.status ?? '').includes('대기') || String(row.status ?? '').includes('보류')).length],
          ['오늘 변경', 0],
        ].map(([label, value]) => (
          <div key={label} className="border border-[#D1D0C8] bg-[#F8F7F2] p-4">
            <p className="text-xs text-[#7B827C]">{label}</p>
            <strong className="mt-2 block text-2xl tabular-nums text-[#202521]">{value}</strong>
          </div>
        ))}
      </div>

      <div className="mt-6 border border-[#D1D0C8] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#D1D0C8] bg-[#F8F7F2] p-4 lg:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B928C]" />
            <input 
              aria-label={searchPlaceholder} 
              placeholder={searchPlaceholder} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-[#D1D0C8] bg-white py-2.5 pl-10 pr-4 text-sm" 
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button 
                key={filter} 
                type="button" 
                onClick={() => setActiveFilter(filter)}
                className={`inline-flex min-h-10 items-center gap-2 border px-3 text-xs ${activeFilter === filter ? 'bg-[#2F3B34] text-white border-[#2F3B34]' : 'bg-white border-[#D1D0C8] text-[#59615B]'}`}
              >
                <Filter className="size-3.5" /> {filter}
              </button>
            ))}
            <button type="button" aria-label="고급 필터" className="flex size-10 items-center justify-center border border-[#D1D0C8] bg-white text-[#59615B]">
              <SlidersHorizontal className="size-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#F0EEE8] text-xs text-[#697069]">
              <tr>
                {columns.map((column) => <th key={column.key} className="px-5 py-3 font-semibold">{column.label}</th>)}
                <th className="px-5 py-3 text-right font-semibold">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1DFD8]">
              {paginatedRows.map((row, index) => (
                <React.Fragment key={String(row.id ?? index)}>
                  <tr 
                    className="hover:bg-[#FAF9F5] cursor-pointer"
                    onClick={() => {
                      if (expandedRowId === String(row.id ?? index)) {
                        setExpandedRowId(null);
                      } else {
                        setExpandedRowId(String(row.id ?? index));
                      }
                    }}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className="max-w-xs px-5 py-4 text-[#4F5751]">
                        {column.key === 'status' ? (
                          <span className="inline-flex border border-[#C9CEC9] bg-[#EDF0EC] px-2 py-1 text-[10px] font-semibold text-[#536057]">{row[column.key]}</span>
                        ) : (
                          <span className="line-clamp-2">{row[column.key]}</span>
                        )}
                      </td>
                    ))}
                    <td className="px-5 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {customActions && customActions(row)}
                      <button type="button" onClick={() => handleEdit(row)} className="text-xs font-semibold text-[#2F3B34] hover:underline mr-4">수정</button>
                      <button type="button" onClick={() => handleDelete(row.id as string | number ?? index)} className="text-xs font-semibold text-red-600 hover:underline">삭제</button>
                    </td>
                  </tr>
                  {expandedRowId === String(row.id ?? index) && renderExpandedRow && (
                    <tr className="bg-[#FAF9F5] border-t-0">
                      <td colSpan={columns.length + 1} className="px-5 py-6">
                        {renderExpandedRow(row)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {filteredRows.length === 0 && <div className="p-12 text-center text-sm text-[#7B827C]">표시할 데이터가 없습니다.</div>}

        {/* Pagination Controls */}
        {filteredRows.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#D1D0C8] bg-[#F8F7F2] px-4 py-3 sm:px-6">
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-[#59615B]">
                  전체 <span className="font-semibold">{filteredRows.length}</span>개 중 <span className="font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredRows.length)}</span> 표시
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center border border-[#D1D0C8] bg-white px-3 py-2 text-sm font-medium text-[#59615B] hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`relative inline-flex items-center border px-4 py-2 text-sm font-medium focus:z-20 ${
                        currentPage === i + 1
                          ? 'z-10 bg-[#2F3B34] text-white border-[#2F3B34]'
                          : 'border-[#D1D0C8] bg-white text-[#59615B] hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center border border-[#D1D0C8] bg-white px-3 py-2 text-sm font-medium text-[#59615B] hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      {editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl bg-[#F8F7F2] shadow-xl relative max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-[#2F3B34] text-white flex justify-between items-center p-5 shrink-0">
              <h2 className="text-lg font-semibold">{title} - 상세 / 수정</h2>
              <button onClick={closeEdit} className="p-1 hover:bg-white/20 rounded">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="mb-6 text-xs text-[#7B827C]">MVP mock 수정 UI이며 실제 서버 저장은 연결되지 않습니다.</p>
              <div className="grid gap-5 sm:grid-cols-2">
                {(createFields.length > 0 ? createFields : columns.map(c => c.label)).map((field, i) => {
                  const val = createFields.length > 0 ? editingRow[columns[i]?.key] : editingRow[columns[i]?.key];
                  return (
                    <label key={field} className="text-xs font-medium text-[#59615B]">
                      {field}
                      <input 
                        className="mt-2 w-full border border-[#D1D0C8] px-3 py-2.5 text-sm bg-white focus:border-[#2F3B34]" 
                        defaultValue={val ?? ''}
                        placeholder={`${field} 수정`} 
                      />
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="border-t border-[#D1D0C8] bg-white p-5 flex justify-end gap-3 shrink-0">
              <button onClick={closeEdit} type="button" className="min-h-11 border border-[#D1D0C8] px-5 text-sm font-semibold text-[#59615B] hover:bg-[#F8F7F2]">취소</button>
              <button onClick={closeEdit} type="button" className="min-h-11 bg-[#2F3B34] px-8 text-sm font-semibold text-white hover:bg-[#1f2823]">수정 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
