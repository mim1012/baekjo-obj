'use client';

import type { OrderDateRange } from '@/lib/orders/orderDateFilters';
import { getQuickOrderDateRange } from '@/lib/orders/orderDateFilters';

type OrderDateRangeFilterProps = OrderDateRange & {
  readonly onChange: (range: OrderDateRange) => void;
  readonly ariaLabel?: string;
};

const QUICK_RANGES = [
  { label: '오늘', days: 1 },
  { label: '7일', days: 7 },
  { label: '1개월', days: 30 },
  { label: '3개월', days: 90 },
] as const;

const dateInputClassName =
  'h-9 rounded-md border border-gray-300 px-2 text-[13px] focus:border-[#2F3B34] focus:outline-none focus:ring-1 focus:ring-[#2F3B34]';
const quickButtonClassName =
  'h-9 rounded-md border border-gray-300 px-2.5 text-[12px] font-medium text-gray-600 hover:border-[#2F3B34] hover:bg-[#F4F2EC]';

export function OrderDateRangeFilter({
  createdFrom,
  createdTo,
  onChange,
  ariaLabel = '빠른 기간 선택',
}: OrderDateRangeFilterProps) {
  return (
    <>
      <label className="flex items-center gap-2 text-[13px] text-gray-600">
        <span className="shrink-0">기간</span>
        <input
          type="date"
          value={createdFrom}
          onChange={(event) => onChange({ createdFrom: event.target.value, createdTo })}
          className={dateInputClassName}
        />
        <span className="text-gray-400">~</span>
        <input
          type="date"
          value={createdTo}
          onChange={(event) => onChange({ createdFrom, createdTo: event.target.value })}
          className={dateInputClassName}
        />
      </label>
      <div className="flex flex-wrap items-center gap-1.5" aria-label={ariaLabel}>
        {QUICK_RANGES.map((range) => (
          <button
            key={range.label}
            type="button"
            onClick={() => onChange(getQuickOrderDateRange(range.days))}
            className={quickButtonClassName}
          >
            {range.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(getQuickOrderDateRange('clear'))}
          className={quickButtonClassName}
        >
          전체
        </button>
      </div>
    </>
  );
}
