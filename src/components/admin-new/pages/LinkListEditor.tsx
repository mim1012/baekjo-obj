'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { CmsLinkItem } from './types';

interface LinkListEditorProps {
  readonly label: string;
  readonly description?: string;
  readonly items: readonly CmsLinkItem[];
  readonly onChange: (items: readonly CmsLinkItem[]) => void;
}

export default function LinkListEditor({ label, description, items, onChange }: LinkListEditorProps) {
  const update = (index: number, patch: Partial<CmsLinkItem>) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const current = next[index];
    const targetItem = next[target];
    if (!current || !targetItem) return;
    next[index] = targetItem;
    next[target] = current;
    onChange(next);
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[14px] font-semibold text-[#17201B]">{label}</p>
          {description && <p className="mt-1 text-[13px] leading-5 text-gray-500">{description}</p>}
        </div>
        <button
          type="button"
          onClick={() => onChange([...items, { label: '새 메뉴', href: '/', visible: true }])}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
        >
          <Plus className="size-4" />
          메뉴 추가
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-[14px] text-gray-500">
            등록된 메뉴가 없습니다.
          </div>
        )}
        {items.map((item, index) => (
          <div key={index} className="grid gap-3 rounded-md border border-gray-200 bg-[#FAF8F3] p-4 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
            <label>
              <span className="text-[12px] font-semibold text-gray-600">메뉴 이름</span>
              <input
                value={item.label}
                onChange={(event) => update(index, { label: event.target.value })}
                className="mt-1 min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-[14px] outline-none focus:border-[#17201B]"
              />
            </label>
            <label>
              <span className="text-[12px] font-semibold text-gray-600">연결 주소</span>
              <input
                value={item.href}
                onChange={(event) => update(index, { href: event.target.value })}
                className="mt-1 min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-[14px] outline-none focus:border-[#17201B]"
              />
            </label>
            <div className="flex items-center gap-1">
              <label className="mr-2 flex min-h-10 items-center gap-2 text-[12px] font-semibold text-gray-600">
                <input
                  type="checkbox"
                  checked={item.visible}
                  onChange={(event) => update(index, { visible: event.target.checked })}
                  className="size-4 accent-[#17201B]"
                />
                표시
              </label>
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="위로 이동" className="inline-flex size-10 items-center justify-center rounded-md border border-gray-300 bg-white disabled:opacity-30">
                <ArrowUp className="size-4" />
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="아래로 이동" className="inline-flex size-10 items-center justify-center rounded-md border border-gray-300 bg-white disabled:opacity-30">
                <ArrowDown className="size-4" />
              </button>
              <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label="메뉴 삭제" className="inline-flex size-10 items-center justify-center rounded-md border border-red-200 bg-white text-[#A65348]">
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
