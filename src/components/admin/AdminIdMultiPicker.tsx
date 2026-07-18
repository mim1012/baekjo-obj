'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { joinIdList, parseIdList, toggleId } from './idListValue';

export interface AdminIdPickerOption {
  id: string;
  label: string;
  sublabel?: string;
  isHidden?: boolean;
}

interface AdminIdMultiPickerProps {
  /** 쉼표 구분 id 문자열 — 기존 draft/state 형식 그대로. */
  value: string;
  onChange: (next: string) => void;
  options: AdminIdPickerOption[];
  placeholder?: string;
  ariaLabel?: string;
}

/**
 * 이름 기반 검색·체크 드롭다운으로 추천 상품/브랜드를 고른다. 관리자가 내부 id 를 외우지 않아도
 * 되지만, 저장 형식은 여전히 쉼표 구분 id 문자열이라 계약·공개 화면은 무변경이다(§4).
 * value 에는 있으나 options 에 없는 id(오타·레거시)는 경고 chip 으로 눈에 보이게 해 제거 가능하게 한다.
 */
export default function AdminIdMultiPicker({
  value,
  onChange,
  options,
  placeholder = '이름으로 검색해 선택',
  ariaLabel,
}: AdminIdMultiPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedIds = useMemo(() => parseIdList(value), [value]);
  const optionById = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );

  // 외부 클릭 시 드롭다운을 닫는다. 열려 있을 때만 리스너를 붙인다.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const emit = (nextIds: string[]) => onChange(joinIdList(nextIds));
  const handleToggle = (id: string) => emit(toggleId(selectedIds, id));

  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = normalizedQuery
    ? options.filter((option) =>
        [option.label, option.sublabel, option.id]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(normalizedQuery)),
      )
    : options;

  return (
    <div ref={containerRef} className="relative mt-2">
      {/* 선택된 항목 chip 목록 — chip 순서 = 저장 순서. */}
      {selectedIds.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedIds.map((id) => {
            const option = optionById.get(id);
            if (!option) {
              // dangling id — options 에 없는 값. 오타/레거시 데이터를 경고 스타일로 노출한다.
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 border border-[#C99] bg-[#FBEFEF] px-2 py-1 text-xs text-[#8A3B3B]"
                >
                  알 수 없는 ID: {id}
                  <button
                    type="button"
                    aria-label={`${id} 제거`}
                    onClick={() => handleToggle(id)}
                    className="text-[#8A3B3B] hover:text-[#5E2626]"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              );
            }
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 border border-[#D1D0C8] bg-[#EDF0EC] px-2 py-1 text-xs text-[#2F3B34]"
              >
                {option.label}
                {option.isHidden && <span className="text-[10px] text-[#8A7B3B]">숨김</span>}
                <button
                  type="button"
                  aria-label={`${option.label} 제거`}
                  onClick={() => handleToggle(id)}
                  className="text-[#59615B] hover:text-[#17211D]"
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between border border-[#D1D0C8] bg-white px-3 py-2.5 text-left text-sm text-[#59615B] focus:border-[#2F3B34]"
      >
        <span className="text-[#6F766F]">
          {selectedIds.length > 0 ? `${selectedIds.length}개 선택됨 · 항목 추가/변경` : placeholder}
        </span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-hidden border border-[#D1D0C8] bg-white shadow-lg">
          <div className="border-b border-[#E1DFD8] bg-[#F8F7F2] p-2">
            <label className="relative block">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[#8B928C]" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label={ariaLabel ? `${ariaLabel} 검색` : '검색'}
                placeholder="이름 · ID 검색"
                className="w-full border border-[#D1D0C8] bg-white py-2 pl-8 pr-3 text-sm focus:border-[#2F3B34]"
              />
            </label>
          </div>
          <ul role="listbox" aria-multiselectable className="max-h-52 overflow-y-auto py-1">
            {filteredOptions.length === 0 && (
              <li className="px-3 py-3 text-center text-xs text-[#8B928C]">
                {options.length === 0 ? '선택할 항목을 불러오지 못했습니다.' : '검색 결과가 없습니다.'}
              </li>
            )}
            {filteredOptions.map((option) => {
              const checked = selectedIds.includes(option.id);
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={checked}
                    onClick={() => handleToggle(option.id)}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[#FAF9F5]"
                  >
                    <span
                      aria-hidden
                      className={`mt-0.5 flex size-4 shrink-0 items-center justify-center border ${
                        checked ? 'border-[#2F3B34] bg-[#2F3B34] text-white' : 'border-[#C9CEC9] bg-white'
                      }`}
                    >
                      {checked && <Check className="size-3" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-sm text-[#17211D]">
                        <span className="truncate">{option.label}</span>
                        {option.isHidden && (
                          <span className="shrink-0 border border-[#D8CDA6] bg-[#F4EFDD] px-1 text-[10px] text-[#8A7B3B]">
                            숨김
                          </span>
                        )}
                      </span>
                      {option.sublabel && (
                        <span className="block truncate text-xs text-[#8B928C]">{option.sublabel}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
