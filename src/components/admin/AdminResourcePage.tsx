import { Filter, Plus, Search, SlidersHorizontal } from 'lucide-react';

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
}: AdminResourcePageProps) {
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
              {createFields.map((field) => (
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
          ['전체', rows.length],
          ['노출/활성', rows.filter((row) => String(row.status ?? '').includes('중') || String(row.status ?? '').includes('활성')).length],
          ['점검 필요', rows.filter((row) => String(row.status ?? '').includes('대기') || String(row.status ?? '').includes('보류')).length],
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
            <input aria-label={searchPlaceholder} placeholder={searchPlaceholder} className="w-full border border-[#D1D0C8] bg-white py-2.5 pl-10 pr-4 text-sm" />
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button key={filter} type="button" className="inline-flex min-h-10 items-center gap-2 border border-[#D1D0C8] bg-white px-3 text-xs text-[#59615B]">
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
              {rows.map((row, index) => (
                <tr key={String(row.id ?? index)} className="hover:bg-[#FAF9F5]">
                  {columns.map((column) => (
                    <td key={column.key} className="max-w-xs px-5 py-4 text-[#4F5751]">
                      {column.key === 'status' ? (
                        <span className="inline-flex border border-[#C9CEC9] bg-[#EDF0EC] px-2 py-1 text-[10px] font-semibold text-[#536057]">{row[column.key]}</span>
                      ) : (
                        <span className="line-clamp-2">{row[column.key]}</span>
                      )}
                    </td>
                  ))}
                  <td className="px-5 py-4 text-right">
                    <button type="button" className="text-xs font-semibold text-[#2F3B34]">상세 / 수정</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && <div className="p-12 text-center text-sm text-[#7B827C]">표시할 데이터가 없습니다.</div>}
      </div>
    </div>
  );
}
