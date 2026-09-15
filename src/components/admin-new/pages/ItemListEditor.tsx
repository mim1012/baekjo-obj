'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import ImageUploader from '@/components/admin-new/common/ImageUploader';
import { isCmsContent } from './contentPath';
import type { CmsContent, CmsFieldDefinition } from './types';

interface ItemListEditorProps {
  readonly field: CmsFieldDefinition;
  readonly items: readonly CmsContent[];
  readonly pageKey: string;
  readonly onChange: (items: readonly CmsContent[]) => void;
}

export default function ItemListEditor({ field, items, pageKey, onChange }: ItemListEditorProps) {
  const itemFields = field.itemFields ?? [];

  const update = (index: number, key: string, value: unknown) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)));
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

  const add = () => {
    const next: CmsContent = {};
    for (const itemField of itemFields) {
      next[itemField.key] = itemField.defaultValue ?? (itemField.type === 'boolean' ? true : itemField.options?.[0]?.value ?? '');
    }
    onChange([...items, next]);
  };

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[14px] font-semibold text-[#17201B]">{field.label}</p>
          {field.description && <p className="mt-1 text-[13px] leading-5 text-gray-500">{field.description}</p>}
        </div>
        <button type="button" onClick={add} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-[13px] font-medium text-gray-700 hover:bg-gray-50">
          <Plus className="size-4" />
          {field.addLabel ?? '항목 추가'}
        </button>
      </div>

      <div className="mt-3 space-y-4">
        {items.length === 0 && (
          <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-[14px] text-gray-500">
            등록된 항목이 없습니다.
          </div>
        )}
        {items.map((item, index) => (
          <article key={index} className="rounded-md border border-gray-200 bg-[#FAF8F3] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-gray-200 pb-3">
              <p className="text-[14px] font-semibold text-[#17201B]">{index + 1}번째 항목</p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="위로 이동" className="inline-flex size-10 items-center justify-center rounded-md border border-gray-300 bg-white disabled:opacity-30">
                  <ArrowUp className="size-4" />
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="아래로 이동" className="inline-flex size-10 items-center justify-center rounded-md border border-gray-300 bg-white disabled:opacity-30">
                  <ArrowDown className="size-4" />
                </button>
                <button type="button" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label="항목 삭제" className="inline-flex size-10 items-center justify-center rounded-md border border-red-200 bg-white text-[#A65348]">
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {itemFields.map((itemField) => {
                const itemValue = item[itemField.key];
                if (itemField.type === 'boolean') {
                  return (
                    <label key={itemField.key} className="flex min-h-10 items-center gap-3 rounded-md border border-gray-300 bg-white px-3 text-[13px] font-semibold text-gray-600">
                      <input type="checkbox" checked={itemValue === true} onChange={(event) => update(index, itemField.key, event.target.checked)} className="size-4 accent-[#17201B]" />
                      {itemField.label}
                    </label>
                  );
                }
                if (itemField.type === 'image') {
                  return (
                    <div key={itemField.key} className="sm:col-span-2">
                      <ImageUploader value={typeof itemValue === 'string' ? itemValue : ''} onChange={(nextValue) => update(index, itemField.key, nextValue)} domain="banner" usage="hero" entityId={`cms-${pageKey}`} label={itemField.label} description={itemField.description ?? '카드에 표시할 이미지를 선택하세요.'} height="200px" />
                    </div>
                  );
                }
                if (itemField.type === 'select') {
                  return (
                    <label key={itemField.key} className="block">
                      <span className="block text-[12px] font-semibold text-gray-600">{itemField.label}</span>
                      <select value={typeof itemValue === 'string' ? itemValue : ''} onChange={(event) => update(index, itemField.key, event.target.value)} className="mt-1 min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-[14px]">
                        <option value="">선택하세요</option>
                        {itemField.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  );
                }
                // linesArray 항목 필드(예: refund-policy articles[].noticeLines)는 저장값이
                // string[]다. FieldEditor.tsx와 동일한 join/split 라운드트립: 화면에는 줄바꿈으로
                // 합쳐 보여주고, onChange는 문자열 그대로 올려 normalizeItems(normalize.ts)가
                // '\n' 기준으로 다시 split하게 둔다.
                const isLinesArray = itemField.type === 'textarea' && itemField.linesArray === true;
                const stringValue = isLinesArray
                  ? (Array.isArray(itemValue) ? itemValue.filter((entry): entry is string => typeof entry === 'string').join('\n') : '')
                  : typeof itemValue === 'string' ? itemValue : '';
                return (
                  <label key={itemField.key} className={itemField.type === 'textarea' ? 'block sm:col-span-2' : 'block'}>
                    <span className="block text-[12px] font-semibold text-gray-600">{itemField.label}</span>
                    {itemField.type === 'textarea' ? (
                      <textarea value={stringValue} onChange={(event) => update(index, itemField.key, event.target.value)} rows={4} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-[14px] leading-6 outline-none focus:border-[#17201B]" />
                    ) : (
                      <input value={stringValue} onChange={(event) => update(index, itemField.key, event.target.value)} placeholder={itemField.type === 'url' ? '/경로 또는 https://...' : itemField.placeholder} className="mt-1 min-h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-[14px] outline-none focus:border-[#17201B]" />
                    )}
                  </label>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function normalizeItemList(value: unknown): readonly CmsContent[] {
  return Array.isArray(value) ? value.filter(isCmsContent) : [];
}
