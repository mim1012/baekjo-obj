'use client';

import ImageUploader from '@/components/admin-new/common/ImageUploader';
import { isCmsContent } from './contentPath';
import ItemListEditor, { normalizeItemList } from './ItemListEditor';
import LinkListEditor from './LinkListEditor';
import type { CmsFieldDefinition, CmsLinkItem } from './types';

interface FieldEditorProps {
  readonly field: CmsFieldDefinition;
  readonly pageKey: string;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
}

function normalizeLinks(value: unknown): readonly CmsLinkItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isCmsContent(item)) return [];
    const label = typeof item.label === 'string' ? item.label : '';
    const href = typeof item.href === 'string' ? item.href : '';
    return [{ label, href, visible: item.visible !== false }];
  });
}

export default function FieldEditor({ field, pageKey, value, onChange }: FieldEditorProps) {
  if (field.type === 'boolean') {
    return (
      <label className="flex cursor-pointer items-center justify-between gap-5 rounded-md border border-gray-200 bg-[#FAF8F3] p-4">
        <span>
          <span className="block text-[14px] font-semibold text-[#17201B]">{field.label}</span>
          {field.description && <span className="mt-1 block text-[13px] leading-5 text-gray-500">{field.description}</span>}
        </span>
        <input
          type="checkbox"
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          className="size-5 accent-[#17201B]"
        />
      </label>
    );
  }

  if (field.type === 'image') {
    return (
      <ImageUploader
        value={typeof value === 'string' ? value : ''}
        onChange={(urlValue) => onChange(urlValue)}
        domain="banner"
        usage="hero"
        entityId={`cms-${pageKey}`}
        label={field.label}
        description={field.description ?? '권장 형식: JPG, PNG, WEBP · 최대 8MB'}
        height="260px"
      />
    );
  }

  if (field.type === 'link-list') {
    return (
      <LinkListEditor
        label={field.label}
        description={field.description}
        items={normalizeLinks(value)}
        onChange={onChange}
      />
    );
  }

  if (field.type === 'item-list') {
    return (
      <ItemListEditor
        field={field}
        items={normalizeItemList(value)}
        onChange={onChange}
        pageKey={pageKey}
      />
    );
  }

  const stringValue = typeof value === 'string' ? value : '';

  return (
    <label className="block">
      <span className="block text-[14px] font-semibold text-[#17201B]">{field.label}</span>
      {field.description && <span className="mt-1 block text-[13px] leading-5 text-gray-500">{field.description}</span>}
      {field.type === 'textarea' ? (
        <textarea
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          rows={5}
          className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2.5 text-[14px] leading-6 outline-none focus:border-[#17201B]"
        />
      ) : (
        <input
          type="text"
          value={stringValue}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.type === 'url' ? '/shop 또는 https://...' : field.placeholder}
          className="mt-2 min-h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-[14px] outline-none focus:border-[#17201B]"
        />
      )}
    </label>
  );
}
