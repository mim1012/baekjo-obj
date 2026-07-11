'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  currentPage: number;
  totalItems: number;
  itemsPerPage?: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalItems,
  itemsPerPage = 20,
  onPageChange,
}: Props) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;

    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  return (
    <div className="mypage-pagination">
      {/* PC & Tablet Pagination */}
      <div className="hidden sm:flex sm:items-center sm:gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="이전 페이지"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#68716C] transition-colors hover:bg-black/5 disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {getPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            aria-current={currentPage === page ? 'page' : undefined}
            className={`flex h-10 w-10 items-center justify-center rounded-lg text-sm transition-colors ${
              currentPage === page
                ? 'bg-[#18231F] font-semibold text-white'
                : 'text-[#68716C] hover:bg-black/5 hover:text-[#18231F]'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="다음 페이지"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#68716C] transition-colors hover:bg-black/5 disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile Pagination */}
      <div className="flex items-center gap-4 sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="이전 페이지"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#DED8CC] text-[#18231F] disabled:opacity-50"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <span className="text-sm font-medium text-[#18231F]">
          {currentPage} <span className="mx-1 text-[#68716C]">/</span> <span className="text-[#68716C]">{totalPages}</span>
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="다음 페이지"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#DED8CC] text-[#18231F] disabled:opacity-50"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
