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
    <div className="mt-auto flex shrink-0 items-center justify-between border-t border-[#E7E0D5] bg-[#FAF8F3] px-4 py-4 sm:px-6">
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-xs text-[#6F766F]">
            전체 <span className="font-semibold">{totalItems}</span>개 중 <span className="font-semibold">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> - <span className="font-semibold">{Math.min(currentPage * itemsPerPage, totalItems)}</span> 표시
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex gap-1" aria-label="페이지 이동">
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex min-h-9 items-center border border-[#E7E0D5] bg-white px-3 text-xs font-semibold text-[#59615B] hover:bg-[#F3EEE6] focus:z-20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              이전
            </button>
            {totalPages > 0 && [...Array(totalPages)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => onPageChange(i + 1)}
                aria-current={currentPage === i + 1 ? 'page' : undefined}
                aria-label={`${i + 1}페이지`}
                className={`relative inline-flex size-9 items-center justify-center border text-xs font-semibold focus:z-20 ${
                  currentPage === i + 1
                    ? 'z-10 border-[#17211D] bg-[#17211D] text-white'
                    : 'border-[#E7E0D5] bg-white text-[#59615B] hover:bg-[#F3EEE6]'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="relative inline-flex min-h-9 items-center border border-[#E7E0D5] bg-white px-3 text-xs font-semibold text-[#59615B] hover:bg-[#F3EEE6] focus:z-20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              다음
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
