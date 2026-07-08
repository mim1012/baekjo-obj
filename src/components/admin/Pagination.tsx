import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between border-t border-[#D1D0C8] bg-[#F8F7F2] px-4 py-3 sm:px-6 mt-auto shrink-0">
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-[#59615B]">
            전체 <span className="font-semibold">{totalItems}</span>개 중 <span className="font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> - <span className="font-semibold">{Math.min(currentPage * itemsPerPage, totalItems)}</span> 표시
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px shadow-sm" aria-label="Pagination">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center border border-[#D1D0C8] bg-white px-3 py-2 text-sm font-medium text-[#59615B] hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            {totalPages > 0 && [...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => onPageChange(i + 1)}
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
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="relative inline-flex items-center border border-[#D1D0C8] bg-white px-3 py-2 text-sm font-medium text-[#59615B] hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
