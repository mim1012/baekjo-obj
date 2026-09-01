'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CARRIER_CODES, CARRIER_LABELS } from '@/lib/carriers';

type CarrierOption = { readonly code: string; readonly label: string };

const fallbackOptions: readonly CarrierOption[] = CARRIER_CODES.map((code) => ({
  code,
  label: CARRIER_LABELS[code],
}));

interface CarrierSelectProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
}

export default function CarrierSelect({
  value,
  onChange,
  disabled = false,
  placeholder = '택배사 검색',
  className = '',
}: CarrierSelectProps) {
  const [options, setOptions] = useState<readonly CarrierOption[]>(fallbackOptions);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.code === value);
  const visibleOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter(
      (option) => option.label.toLowerCase().includes(normalized) || option.code.includes(normalized),
    );
  }, [options, query]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/tracking/companies', { cache: 'no-store' })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        if (!active || !body || typeof body !== 'object') return;
        const rows = (body as { companies?: unknown }).companies;
        if (!Array.isArray(rows)) return;
        const remote = rows.flatMap((row): CarrierOption[] => {
          if (!row || typeof row !== 'object') return [];
          const item = row as Record<string, unknown>;
          return typeof item.code === 'string' && typeof item.label === 'string'
            ? [{ code: item.code, label: item.label }]
            : [];
        });
        if (remote.length > 0 && active) {
          const merged = new Map(fallbackOptions.map((option) => [option.code, option]));
          remote.forEach((option) => merged.set(option.code, option));
          setOptions([...merged.values()]);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setQuery('');
          setOpen((current) => !current);
        }}
        className={`flex min-h-11 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm disabled:opacity-60 ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-500'}>
          {selected?.label ?? '미지정'}
        </span>
        <span aria-hidden className="ml-2 text-gray-500">⌄</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white p-2 shadow-lg">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="mb-2 min-h-10 w-full rounded border border-gray-300 px-3 text-sm outline-none focus:border-[#2F3B34]"
            aria-label="택배사 검색"
          />
          <div className="max-h-60 overflow-y-auto" role="listbox">
            <button
              type="button"
              role="option"
              aria-selected={value === ''}
              onClick={() => { onChange(''); setOpen(false); }}
              className="block min-h-10 w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
            >
              미지정
            </button>
            {visibleOptions.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={value === option.code}
                key={option.code}
                onClick={() => { onChange(option.code); setOpen(false); }}
                className="block min-h-10 w-full rounded px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                {option.label}
              </button>
            ))}
            {visibleOptions.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">검색 결과가 없습니다.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
