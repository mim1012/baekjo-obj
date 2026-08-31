'use client';

import { Fragment, useState, useEffect } from 'react';
import { ArrowDown, ArrowUp, Filter, Plus, Search, Trash2, X } from 'lucide-react';
import AdminIdMultiPicker, { type AdminIdPickerOption } from './AdminIdMultiPicker';
import ImageUploader from '@/components/admin-new/common/ImageUploader';

interface Column {
  key: string;
  label: string;
}

type ResourceRow = Record<string, string | number>;

interface FormField {
  key: string;
  label: string;
  type?:
    | 'text'
    | 'number'
    | 'textarea'
    | 'select'
    | 'multiPicker'
    | 'image'
    | 'stringList'
    | 'faqList'
    | 'quickGuideList';
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  /** 비개발자도 무엇을 입력하는지 이해할 수 있도록 필드 아래에 표시하는 설명. */
  description?: string;
  /** 긴 폼을 공개 화면 영역과 같은 단위로 나누는 제목. */
  group?: string;
  placeholder?: string;
  /** type='multiPicker' 일 때 이름 기반 선택 드롭다운에 넣을 항목들. */
  pickerOptions?: AdminIdPickerOption[];
}

interface AdminResourcePageProps {
  title: string;
  description: string;
  /** onCreateRow 와 함께 지정할 때만 등록 버튼/폼을 렌더링한다. */
  actionLabel?: string;
  searchPlaceholder: string;
  columns: Column[];
  rows: ResourceRow[];
  filters?: string[];
  /** 레거시 폼 라벨. formFields 가 있으면 formFields 를 우선한다. */
  createFields?: string[];
  /** true면 쓰기 API가 없는 정적 콘텐츠 화면으로 취급해 등록/수정/삭제 UI를 숨긴다. */
  readOnly?: boolean;
  /** true면 행 수정 모달을 숨긴다(수정 저장 경로가 아직 없는 화면용). */
  disableEdit?: boolean;
  /** 등록/수정 폼 필드. key 는 rows 의 key 와 일치해야 한다. */
  formFields?: FormField[];
  /** 등록·수정 결과가 보이는 고객 화면. 지정하면 폼과 삭제 확인창에 함께 표시한다. */
  affectedScreen?: string;
  /** 긴 폼 상단에서 직원이 먼저 읽을 작업 안내. */
  formIntro?: string;
  /** 등록 폼 저장을 부모 draft 에 반영한다. 지정하지 않으면 등록 UI 자체를 숨긴다. */
  onCreateRow?: (draft: ResourceRow) => boolean | void | Promise<boolean | void>;
  /** 수정 폼 저장을 부모 draft 에 반영한다. 지정하지 않으면 수정 UI를 숨긴다. */
  onUpdateRow?: (id: string | number, draft: ResourceRow) => boolean | void | Promise<boolean | void>;
  /** 관리 셀(수정/삭제 앞)에 행별 커스텀 액션(승인/반려 버튼 등)을 렌더링한다. */
  customActions?: (row: ResourceRow) => React.ReactNode;
  /** 지정 시 행 클릭으로 상세 내용을 펼쳐 보여주는 확장 행을 렌더링한다. */
  renderExpandedRow?: (row: ResourceRow) => React.ReactNode;
  /**
   * 실제 삭제 API로 이어지는 화면만 지정한다 — 지정하면 부모(관리자 page)가 draft 에서
   * 항목을 제거하고 rows 를 다시 내려보내 화면에 반영한다. 미지정 시 삭제 UI(버튼) 자체를
   * 숨긴다.
   *
   * ⚠️ 2026-07-19 이전엔 미지정 시 로컬 비영속 Set으로 "숨기기만" 하는 폴백이 있었다.
   * `canDeleteRows`가 `onSave == null`도 참으로 쳐서, batch save(`onSave`)를 안 쓰는
   * 화면(2026-07-18 즉시저장 전환 이후 전부)은 `onDeleteRow`를 안 넘겨도 삭제 버튼이 항상
   * 보였다 — 눌러도 DB는 그대로고 새로고침하면 되살아나는 가짜 삭제였다(wave-4, B2B 제휴
   * 문의 삭제 버그로 처음 발견, 전수 스윕 결과 `/admin/inquiries`도 동일 증상). 폴백을 제거해
   * "onDeleteRow가 없으면 버튼도 없다"를 유일한 규칙으로 만들었다 — 이 클래스의 재발이
   * 구조적으로 불가능해진다.
   */
  onDeleteRow?: (id: string | number) => boolean | void | Promise<boolean | void>;
  /** 공개 화면의 항목 순서를 한 칸씩 바꾼다. 순서가 의미 있는 화면에서만 지정한다. */
  onMoveRow?: (id: string | number, direction: 'up' | 'down') => boolean | void | Promise<boolean | void>;
  /**
   * 지정 시 헤더에 명시적 저장 버튼을 렌더링한다. 클릭 시 부모가 현재 draft 를 통째로 저장하고
   * 성공/실패를 boolean 으로 돌려준다(per-edit auto-save 가 아니라 batch save — CategorySettings 교훈).
   */
  onSave?: () => Promise<{ ok: boolean }>;
  /** 저장 버튼 라벨(기본 '변경사항 저장'). */
  saveLabel?: string;
}

function normalizeDraftValue(value: unknown): string | number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) return value.join(', ');
  return '';
}

function parseStringItems(value: string | number): string[] {
  return Array.from(
    new Set(
      String(value)
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function serializeStringItems(items: string[]): string {
  return items.map((item) => item.trim()).filter(Boolean).join('\n');
}

function moveItem<T>(items: T[], index: number, offset: -1 | 1): T[] {
  const targetIndex = index + offset;
  if (targetIndex < 0 || targetIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

function StringListEditor({
  value,
  onChange,
  label,
  placeholder,
}: {
  value: string | number;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}) {
  const [items, setItems] = useState(() => parseStringItems(value));
  const updateItem = (index: number, nextValue: string) => {
    const next = [...items];
    next[index] = nextValue;
    setItems(next);
    onChange(next.join('\n'));
  };

  return (
    <div className="mt-2 space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            aria-label={`${label} ${index + 1}`}
            placeholder={placeholder ?? `${label}을 입력하세요`}
            onChange={(event) => updateItem(index, event.target.value)}
            className="min-h-11 flex-1 border border-[#D1D0C8] bg-white px-3 py-2.5 text-sm focus:border-[#2F3B34]"
          />
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              aria-label={`${label} ${index + 1} 위로 이동`}
              disabled={index === 0}
              onClick={() => {
                const next = moveItem(items, index, -1);
                setItems(next);
                onChange(serializeStringItems(next));
              }}
              className="flex size-11 items-center justify-center border border-[#D1D0C8] text-[#59615B] disabled:opacity-30"
            >
              <ArrowUp className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`${label} ${index + 1} 아래로 이동`}
              disabled={index === items.length - 1}
              onClick={() => {
                const next = moveItem(items, index, 1);
                setItems(next);
                onChange(serializeStringItems(next));
              }}
              className="flex size-11 items-center justify-center border-y border-r border-[#D1D0C8] text-[#59615B] disabled:opacity-30"
            >
              <ArrowDown className="size-4" />
            </button>
            <button
              type="button"
              aria-label={`${label} ${index + 1} 삭제`}
              onClick={() => {
                const next = items.filter((_, itemIndex) => itemIndex !== index);
                setItems(next);
                onChange(serializeStringItems(next));
              }}
              className="flex size-11 items-center justify-center border-y border-r border-[#E4C8C8] text-red-600 hover:bg-red-50"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems([...items, ''])}
        className="inline-flex min-h-11 items-center gap-2 border border-[#B8BDB8] bg-white px-4 text-sm font-semibold text-[#2F3B34] hover:bg-[#F3F2ED]"
      >
        <Plus className="size-4" /> {label} 추가
      </button>
      {items.length === 0 && <p className="text-xs text-[#8A918B]">등록된 항목이 없습니다. ‘{label} 추가’를 눌러 입력하세요.</p>}
    </div>
  );
}

interface FaqDraftItem {
  question: string;
  answer: string;
}

function parseFaqItems(value: string | number): FaqDraftItem[] {
  return String(value)
    .split(/\r?\n/)
    .map((line) => {
      const separatorIndex = line.indexOf('|');
      return separatorIndex < 0
        ? { question: line.trim(), answer: '' }
        : { question: line.slice(0, separatorIndex).trim(), answer: line.slice(separatorIndex + 1).trim() };
    })
    .filter((item) => item.question || item.answer);
}

function serializeFaqItems(items: FaqDraftItem[]): string {
  return items
    .filter((item) => item.question.trim() || item.answer.trim())
    .map((item) => `${item.question.replaceAll('|', ' ').trim()}|${item.answer.trim()}`)
    .join('\n');
}

function FaqListEditor({ value, onChange }: { value: string | number; onChange: (value: string) => void }) {
  const [items, setItems] = useState(() => parseFaqItems(value));
  const updateItem = (index: number, patch: Partial<FaqDraftItem>) => {
    const next = items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
    setItems(next);
    onChange(serializeFaqItems(next));
  };

  return (
    <div className="mt-2 space-y-3">
      {items.map((item, index) => (
        <div key={index} className="border border-[#D1D0C8] bg-[#FAF9F5] p-4">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-sm text-[#2F3B34]">질문 {index + 1}</strong>
            <div className="flex items-center gap-1">
              <button type="button" aria-label={`질문 ${index + 1} 위로 이동`} disabled={index === 0} onClick={() => {
                const next = moveItem(items, index, -1);
                setItems(next);
                onChange(serializeFaqItems(next));
              }} className="flex size-10 items-center justify-center text-[#59615B] hover:bg-white disabled:opacity-30"><ArrowUp className="size-4" /></button>
              <button type="button" aria-label={`질문 ${index + 1} 아래로 이동`} disabled={index === items.length - 1} onClick={() => {
                const next = moveItem(items, index, 1);
                setItems(next);
                onChange(serializeFaqItems(next));
              }} className="flex size-10 items-center justify-center text-[#59615B] hover:bg-white disabled:opacity-30"><ArrowDown className="size-4" /></button>
              <button
                type="button"
                aria-label={`질문 ${index + 1} 삭제`}
                onClick={() => {
                  const next = items.filter((_, itemIndex) => itemIndex !== index);
                  setItems(next);
                  onChange(serializeFaqItems(next));
                }}
                className="inline-flex min-h-10 items-center gap-1.5 px-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-4" /> 삭제
              </button>
            </div>
          </div>
          <label className="mt-3 block text-xs text-[#59615B]">
            고객에게 보이는 질문
            <input
              type="text"
              value={item.question}
              aria-label={`FAQ 질문 ${index + 1}`}
              onChange={(event) => updateItem(index, { question: event.target.value })}
              className="mt-1.5 min-h-11 w-full border border-[#D1D0C8] bg-white px-3 text-sm"
            />
          </label>
          <label className="mt-3 block text-xs text-[#59615B]">
            질문을 열었을 때 보이는 답변
            <textarea
              value={item.answer}
              aria-label={`FAQ 답변 ${index + 1}`}
              onChange={(event) => updateItem(index, { answer: event.target.value })}
              className="mt-1.5 min-h-28 w-full border border-[#D1D0C8] bg-white px-3 py-2.5 text-sm"
            />
          </label>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems([...items, { question: '', answer: '' }])}
        className="inline-flex min-h-11 items-center gap-2 border border-[#B8BDB8] bg-white px-4 text-sm font-semibold text-[#2F3B34] hover:bg-[#F3F2ED]"
      >
        <Plus className="size-4" /> 질문과 답변 추가
      </button>
      {items.length === 0 && <p className="text-xs text-[#8A918B]">등록된 질문이 없습니다.</p>}
    </div>
  );
}

interface QuickGuideDraftItem {
  title: string;
  description: string;
  href: string;
  icon: string;
}

const QUICK_GUIDE_DESTINATIONS = [
  { value: '#signals', label: '생활 신호 영역' },
  { value: '#hospital', label: '병원 방문 기준 영역' },
  { value: '#products', label: '추천 상품 영역' },
  { value: '#faq', label: '자주 묻는 질문 영역' },
];

function parseQuickGuideItems(value: string | number): QuickGuideDraftItem[] {
  return String(value)
    .split(/\r?\n/)
    .map((line) => {
      const [title = '', description = '', href = '#signals', icon = 'search'] = line.split('|');
      return { title: title.trim(), description: description.trim(), href: href.trim(), icon: icon.trim() };
    })
    .filter((item) => item.title || item.description);
}

function serializeQuickGuideItems(items: QuickGuideDraftItem[]): string {
  return items
    .filter((item) => item.title.trim() || item.description.trim())
    .map((item) => [item.title, item.description, item.href || '#signals', item.icon || 'search']
      .map((part) => part.replaceAll('|', ' ').trim())
      .join('|'))
    .join('\n');
}

function QuickGuideListEditor({ value, onChange }: { value: string | number; onChange: (value: string) => void }) {
  const [items, setItems] = useState(() => parseQuickGuideItems(value));
  const updateItem = (index: number, patch: Partial<QuickGuideDraftItem>) => {
    const next = items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
    setItems(next);
    onChange(serializeQuickGuideItems(next));
  };

  return (
    <div className="mt-2 space-y-3">
      {items.map((item, index) => (
        <div key={index} className="border border-[#D1D0C8] bg-[#FAF9F5] p-4">
          <div className="flex items-center justify-between gap-3">
            <strong className="text-sm text-[#2F3B34]">바로가기 {index + 1}</strong>
            <div className="flex items-center gap-1">
              <button type="button" aria-label={`바로가기 ${index + 1} 위로 이동`} disabled={index === 0} onClick={() => {
                const next = moveItem(items, index, -1);
                setItems(next);
                onChange(serializeQuickGuideItems(next));
              }} className="flex size-10 items-center justify-center text-[#59615B] hover:bg-white disabled:opacity-30"><ArrowUp className="size-4" /></button>
              <button type="button" aria-label={`바로가기 ${index + 1} 아래로 이동`} disabled={index === items.length - 1} onClick={() => {
                const next = moveItem(items, index, 1);
                setItems(next);
                onChange(serializeQuickGuideItems(next));
              }} className="flex size-10 items-center justify-center text-[#59615B] hover:bg-white disabled:opacity-30"><ArrowDown className="size-4" /></button>
              <button
                type="button"
                aria-label={`바로가기 ${index + 1} 삭제`}
                onClick={() => {
                  const next = items.filter((_, itemIndex) => itemIndex !== index);
                  setItems(next);
                  onChange(serializeQuickGuideItems(next));
                }}
                className="inline-flex min-h-10 items-center gap-1.5 px-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                <Trash2 className="size-4" /> 삭제
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-[#59615B]">
              카드 제목
              <input aria-label={`바로가기 제목 ${index + 1}`} value={item.title} onChange={(event) => updateItem(index, { title: event.target.value })} className="mt-1.5 min-h-11 w-full border border-[#D1D0C8] bg-white px-3 text-sm" />
            </label>
            <label className="text-xs text-[#59615B]">
              누르면 이동할 위치
              <select aria-label={`바로가기 연결 위치 ${index + 1}`} value={item.href} onChange={(event) => updateItem(index, { href: event.target.value })} className="mt-1.5 min-h-11 w-full border border-[#D1D0C8] bg-white px-3 text-sm">
                {QUICK_GUIDE_DESTINATIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="text-xs text-[#59615B] sm:col-span-2">
              카드 설명
              <input aria-label={`바로가기 설명 ${index + 1}`} value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} className="mt-1.5 min-h-11 w-full border border-[#D1D0C8] bg-white px-3 text-sm" />
            </label>
            <label className="text-xs text-[#59615B]">
              아이콘 모양
              <select aria-label={`바로가기 아이콘 ${index + 1}`} value={item.icon} onChange={(event) => updateItem(index, { icon: event.target.value })} className="mt-1.5 min-h-11 w-full border border-[#D1D0C8] bg-white px-3 text-sm">
                <option value="search">돋보기</option>
                <option value="home">집</option>
                <option value="hospital">병원</option>
              </select>
            </label>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setItems([...items, { title: '', description: '', href: '#signals', icon: 'search' }])}
        className="inline-flex min-h-11 items-center gap-2 border border-[#B8BDB8] bg-white px-4 text-sm font-semibold text-[#2F3B34] hover:bg-[#F3F2ED]"
      >
        <Plus className="size-4" /> 바로가기 카드 추가
      </button>
      {items.length === 0 && <p className="text-xs text-[#8A918B]">등록된 바로가기 카드가 없습니다.</p>}
    </div>
  );
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
  readOnly = false,
  disableEdit = false,
  formFields,
  affectedScreen,
  formIntro,
  onCreateRow,
  onUpdateRow,
  customActions,
  renderExpandedRow,
  onDeleteRow,
  onMoveRow,
  onSave,
  saveLabel = '변경사항 저장',
}: AdminResourcePageProps) {
  const [editingRow, setEditingRow] = useState<ResourceRow | null>(null);
  const [editingDraft, setEditingDraft] = useState<ResourceRow>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<ResourceRow>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>(filters[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRowId, setExpandedRowId] = useState<string | number | null>(null);
  const ITEMS_PER_PAGE = 20;
  const editableFields: FormField[] = formFields ?? (createFields.length > 0
    ? createFields.map((label, index) => ({ key: columns[index]?.key ?? label, label }))
    : columns.map((column) => ({ key: column.key, label: column.label })));
  const canCreateRows = !readOnly && Boolean(actionLabel) && onCreateRow != null;
  const canEditRows = !readOnly && !disableEdit && onUpdateRow != null;
  const canDeleteRows = !readOnly && onDeleteRow != null;
  const canMoveRows = !readOnly && onMoveRow != null;
  const hasRowActions = canEditRows || canDeleteRows || canMoveRows || customActions != null;

  const handleEdit = (row: ResourceRow) => {
    setSaveMessage(null);
    setEditingRow(row);
    setEditingDraft(
      editableFields.reduce<ResourceRow>((draft, field) => {
        draft[field.key] = normalizeDraftValue(row[field.key]);
        return draft;
      }, { id: row.id })
    );
  };

  const closeEdit = () => {
    setEditingRow(null);
    setEditingDraft({});
  };

  const resetCreateDraft = () => {
    setCreateDraft(
      editableFields.reduce<ResourceRow>((draft, field) => {
        draft[field.key] = field.type === 'number' ? 0 : field.options?.[0]?.value ?? '';
        return draft;
      }, {})
    );
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeEdit();
        setCreateOpen(false);
        document.querySelectorAll('details').forEach(d => d.removeAttribute('open'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleDelete = async (row: ResourceRow, id: string | number) => {
    // canDeleteRows가 onDeleteRow != null 을 이미 강제하므로 이 버튼은 onDeleteRow가 있을
    // 때만 렌더링된다 — 방어적으로 한 번 더 확인한다.
    if (!onDeleteRow) return;
    const displayName = String(row.title ?? row.name ?? row.subject ?? row.question ?? row.q ?? id);
    const screenImpact = affectedScreen ? `\n삭제하면 ${affectedScreen}에서도 바로 사라집니다.` : '';
    if (window.confirm(`“${displayName}” 항목을 삭제할까요?${screenImpact}\n이 작업은 되돌릴 수 없습니다.`)) {
      if (saving) return;
      setSaving(true);
      setSaveMessage(null);
      try {
        const result = await onDeleteRow(id);
        setSaveMessage(result === false ? '삭제하지 못했습니다. 다시 시도해 주세요.' : `“${displayName}” 항목을 삭제했습니다.`);
      } catch {
        setSaveMessage('삭제하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleMove = async (row: ResourceRow, id: string | number, direction: 'up' | 'down') => {
    if (!onMoveRow || saving) return;
    const displayName = String(row.title ?? row.name ?? row.subject ?? row.question ?? row.q ?? id);
    setSaving(true);
    setSaveMessage(null);
    try {
      const result = await onMoveRow(id, direction);
      setSaveMessage(
        result === false
          ? '순서를 바꾸지 못했습니다. 다시 시도해 주세요.'
          : `“${displayName}” 항목을 ${direction === 'up' ? '위로' : '아래로'} 이동했습니다.`,
      );
    } catch {
      setSaveMessage('순서를 바꾸지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!onSave || saving) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      const { ok } = await onSave();
      setSaveMessage(ok ? '저장되었습니다.' : '저장에 실패했습니다. 다시 시도해 주세요.');
    } catch {
      setSaveMessage('저장에 실패했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!onCreateRow) return;
    const missingField = editableFields.find(
      (field) => field.required && String(createDraft[field.key] ?? '').trim() === '',
    );
    if (missingField) {
      setSaveMessage(`${missingField.label}을(를) 선택하거나 입력해 주세요.`);
      return;
    }
    if (saving) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const result = await onCreateRow(createDraft);
      if (result === false) {
        setSaveMessage('등록하지 못했습니다. 입력 내용과 네트워크 상태를 확인해 주세요.');
        return;
      }
      setCreateOpen(false);
      resetCreateDraft();
      setSaveMessage(affectedScreen ? `등록했습니다. ${affectedScreen}에 바로 반영되었습니다.` : '등록했습니다.');
    } catch {
      setSaveMessage('등록하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!onUpdateRow || !editingRow) return;
    const missingField = editableFields.find(
      (field) => field.required && String(editingDraft[field.key] ?? '').trim() === '',
    );
    if (missingField) {
      setSaveMessage(`${missingField.label}을(를) 선택하거나 입력해 주세요.`);
      return;
    }
    if (saving) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      const result = await onUpdateRow(editingRow.id, editingDraft);
      if (result === false) {
        setSaveMessage('수정 내용을 저장하지 못했습니다. 입력 내용과 네트워크 상태를 확인해 주세요.');
        return;
      }
      closeEdit();
      setSaveMessage(affectedScreen ? `수정했습니다. ${affectedScreen}에 바로 반영되었습니다.` : '수정했습니다.');
    } catch {
      setSaveMessage('수정 내용을 저장하지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (
    field: FormField,
    draft: ResourceRow,
    setDraft: (updater: (current: ResourceRow) => ResourceRow) => void,
  ) => {
    const value = draft[field.key] ?? '';
    const setValue = (nextValue: string | number) => {
      setDraft((current) => ({ ...current, [field.key]: nextValue }));
    };

    if (field.type === 'stringList') {
      return <StringListEditor value={value} onChange={setValue} label={field.label} placeholder={field.placeholder} />;
    }

    if (field.type === 'faqList') {
      return <FaqListEditor value={value} onChange={setValue} />;
    }

    if (field.type === 'quickGuideList') {
      return <QuickGuideListEditor value={value} onChange={setValue} />;
    }

    if (field.type === 'textarea') {
      return (
        <textarea
          aria-label={field.label}
          className="mt-2 min-h-48 w-full border border-[#D1D0C8] bg-white px-3 py-2.5 text-sm focus:border-[#2F3B34]"
          value={String(value)}
          placeholder={field.placeholder ?? `${field.label} 입력`}
          onChange={(event) => setValue(event.target.value)}
        />
      );
    }

    if (field.type === 'multiPicker') {
      return (
        <AdminIdMultiPicker
          value={String(value)}
          onChange={(next) => setValue(next)}
          options={field.pickerOptions ?? []}
          ariaLabel={field.label}
        />
      );
    }

    if (field.type === 'image') {
      return (
        <div className="mt-2">
          <ImageUploader
            value={String(value)}
            onChange={(nextValue) => setValue(nextValue)}
            domain="banner"
            usage="hero"
            draftId={`admin-resource-${field.key}`}
            label={`${field.label} 업로드`}
            description="JPG, PNG, WEBP 이미지를 선택하세요."
            height="220px"
          />
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <select
          aria-label={field.label}
          required={field.required}
          className="mt-2 w-full border border-[#D1D0C8] bg-white px-3 py-2.5 text-sm focus:border-[#2F3B34]"
          value={String(value)}
          onChange={(event) => setValue(event.target.value)}
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        aria-label={field.label}
        type={field.type === 'number' ? 'number' : 'text'}
        className="mt-2 w-full border border-[#D1D0C8] bg-white px-3 py-2.5 text-sm focus:border-[#2F3B34]"
        value={value}
        placeholder={field.placeholder ?? `${field.label} 입력`}
        onChange={(event) => setValue(field.type === 'number' ? Number(event.target.value) : event.target.value)}
      />
    );
  };

  const renderFormFields = (
    draft: ResourceRow,
    setDraft: (updater: (current: ResourceRow) => ResourceRow) => void,
    formKind: 'create' | 'edit',
  ) => (
    <div className="grid gap-5 sm:grid-cols-2">
      {editableFields.map((field, index) => {
        const showGroup = field.group && field.group !== editableFields[index - 1]?.group;
        const wideField = ['textarea', 'image', 'stringList', 'faqList', 'quickGuideList'].includes(field.type ?? '');
        return (
          <Fragment key={field.key}>
            {showGroup && (
              <div className="mt-3 border-b border-[#CDD1CC] pb-3 sm:col-span-2">
                <h3 className="text-base font-semibold text-[#202521]">{field.group}</h3>
              </div>
            )}
            <div className={`text-xs font-medium text-[#59615B] ${wideField ? 'sm:col-span-2' : ''}`}>
              <div className="block">
                {field.label}{field.required ? <span className="ml-1 text-red-600">필수</span> : null}
              </div>
              {field.description && <p className="mt-1 font-normal leading-5 text-[#7B827C]">{field.description}</p>}
              <div data-field-id={`${formKind}-${field.key}`}>{renderField(field, draft, setDraft)}</div>
            </div>
          </Fragment>
        );
      })}
    </div>
  );

  // 삭제는 이제 항상 onDeleteRow(부모 콘센트)로 위임되므로 rows 자체가 이미 최신 상태다
  // (로컬 비영속 숨김 Set은 wave-4 수정으로 제거됨 — 위 onDeleteRow JSDoc 참고).
  const visibleRows = rows;

  const filteredRows = visibleRows.filter(r => {
    const matchesFilter = activeFilter === filters[0] || Object.values(r).some(val => String(val).includes(activeFilter));
    const matchesSearch = searchQuery === '' || Object.values(r).some(val => String(val).toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ITEMS_PER_PAGE));
  const paginatedRows = filteredRows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold text-[#697269]">ADMIN CONSOLE</p>
          <h1 className="mt-2 text-3xl font-normal text-[#202521]">{title}</h1>
          <p className="mt-2 text-sm text-[#737A74]">{description}</p>
          {affectedScreen && (
            <p className="mt-3 inline-flex border border-[#B9C7BB] bg-[#EEF4EE] px-3 py-2 text-xs font-semibold text-[#34483A]">
              연결된 고객 화면: {affectedScreen}
            </p>
          )}
          {!onSave && saveMessage && !createOpen && !editingRow && (
            <p role="status" className="mt-3 text-sm font-semibold text-[#3E6249]">{saveMessage}</p>
          )}
        </div>
        {(onSave || canCreateRows) && (
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {onSave && (
              <div className="flex items-center justify-end gap-3">
                {saveMessage && <span className="text-xs text-[#59615B]">{saveMessage}</span>}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex min-h-11 items-center justify-center gap-2 border border-[#2F3B34] bg-white px-5 text-sm font-semibold text-[#2F3B34] disabled:opacity-50"
                >
                  {saving ? '저장 중…' : saveLabel}
                </button>
              </div>
            )}
            {canCreateRows && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    if (!createOpen) resetCreateDraft();
                    setSaveMessage(null);
                    setCreateOpen((open) => !open);
                  }}
                  className="flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-[#2F3B34] px-5 text-sm font-semibold text-white"
                >
                  <Plus className="size-4" /> {actionLabel}
                </button>
                {createOpen && (
                  <div className="absolute right-0 z-20 mt-2 max-h-[78dvh] w-[min(94vw,760px)] overflow-y-auto border border-[#D1D0C8] bg-white p-6 shadow-lg">
                    <div className="flex items-start justify-between gap-4">
                      <h2 className="text-balance text-xl font-semibold text-[#202521]">{actionLabel}</h2>
                      <button
                        type="button"
                        onClick={() => setCreateOpen(false)}
                        aria-label="등록 창 닫기"
                        className="flex size-10 shrink-0 items-center justify-center text-[#59615B] hover:bg-[#F3F2ED]"
                      >
                        <X className="size-5" />
                      </button>
                    </div>
                    <div className="mt-3 border border-[#CAD2CB] bg-[#F1F5F1] p-3 text-xs leading-5 text-[#506057]">
                      <p>{formIntro ?? (onSave == null ? '아래 내용을 저장하면 바로 반영됩니다.' : `입력 후 상단의 ${saveLabel} 버튼을 눌러 최종 반영하세요.`)}</p>
                      {affectedScreen && <p className="mt-1 font-semibold">반영 위치: {affectedScreen}</p>}
                    </div>
                    <div className="mt-5">{renderFormFields(createDraft, setCreateDraft, 'create')}</div>
                    {saveMessage && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{saveMessage}</p>}
                    <button type="button" onClick={handleCreate} disabled={saving} className="mt-6 min-h-11 bg-[#2F3B34] px-5 text-sm font-semibold text-white disabled:opacity-50">
                      {saving ? '저장 중…' : affectedScreen ? '등록하고 고객 화면에 반영' : onSave == null ? '저장' : '목록에 추가'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-3 lg:grid-cols-[160px_160px_1fr]">
        <div className="border border-[#D1D0C8] bg-[#F8F7F2] p-4">
          <p className="text-xs text-[#7B827C]">등록된 항목</p>
          <strong className="mt-2 block text-2xl tabular-nums text-[#202521]">{visibleRows.length}</strong>
        </div>
        <div className="border border-[#D1D0C8] bg-[#F8F7F2] p-4">
          <p className="text-xs text-[#7B827C]">현재 검색 결과</p>
          <strong className="mt-2 block text-2xl tabular-nums text-[#202521]">{filteredRows.length}</strong>
        </div>
        <div className="border border-[#CAD2CB] bg-[#F1F5F1] p-4 text-pretty text-xs leading-5 text-[#506057]">
          <p className="font-semibold text-[#2F3B34]">이 목록의 버튼 뜻</p>
          <p className="mt-1">
            {canEditRows && '수정 = 선택한 항목의 내용 변경 · '}
            {canMoveRows && '순서 = 고객 화면의 위아래 위치 변경 · '}
            {canDeleteRows && '삭제 = 관리자와 연결된 고객 화면에서 제거 · '}
            {onSave ? `작업을 마친 뒤 상단의 ‘${saveLabel}’을 눌러야 최종 반영됩니다.` : '등록·수정 버튼으로 저장하면 바로 반영됩니다.'}
          </p>
        </div>
      </div>

      <div className="mt-6 border border-[#D1D0C8] bg-white">
        <div className="flex flex-col gap-3 border-b border-[#D1D0C8] bg-[#F8F7F2] p-4 lg:flex-row">
          <label className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B928C]" />
            <input 
              aria-label={searchPlaceholder} 
              placeholder={searchPlaceholder} 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full border border-[#D1D0C8] bg-white py-2.5 pl-10 pr-4 text-sm" 
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button 
                key={filter} 
                type="button" 
                onClick={() => { setActiveFilter(filter); setCurrentPage(1); }}
                className={`inline-flex min-h-10 items-center gap-2 border px-3 text-xs ${activeFilter === filter ? 'bg-[#2F3B34] text-white border-[#2F3B34]' : 'bg-white border-[#D1D0C8] text-[#59615B]'}`}
              >
                <Filter className="size-3.5" /> {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-[#F0EEE8] text-xs text-[#697069]">
              <tr>
                {columns.map((column) => <th key={column.key} className="px-5 py-3 font-semibold">{column.label}</th>)}
                {hasRowActions && (
                  <th className="px-5 py-3 text-right font-semibold">
                    관리
                    <span className="mt-1 block text-[10px] font-normal text-[#7B827C]">현재 줄에만 적용</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E1DFD8]">
              {paginatedRows.map((row, index) => {
                const rowId = row.id ?? index;
                const isExpanded = renderExpandedRow != null && expandedRowId === rowId;
                return (
                  <Fragment key={String(rowId)}>
                    <tr
                      className={`hover:bg-[#FAF9F5] ${renderExpandedRow ? 'cursor-pointer' : ''}`}
                      onClick={renderExpandedRow ? () => setExpandedRowId((current) => (current === rowId ? null : rowId)) : undefined}
                    >
                      {columns.map((column) => (
                        <td key={column.key} className="max-w-xs px-5 py-4 text-[#4F5751]">
                          {column.key === 'status' ? (
                            <span className="inline-flex border border-[#C9CEC9] bg-[#EDF0EC] px-2 py-1 text-[10px] font-semibold text-[#536057]">{row[column.key]}</span>
                          ) : (
                            <span className="line-clamp-2">{row[column.key]}</span>
                          )}
                        </td>
                      ))}
                      {hasRowActions && (
                        <td className="px-5 py-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {customActions?.(row)}
                          {canMoveRows && (() => {
                            const sourceIndex = visibleRows.findIndex((sourceRow, sourceRowIndex) => (sourceRow.id ?? sourceRowIndex) === rowId);
                            return (
                              <span className="mr-4 inline-flex items-center align-middle">
                                <span className="mr-2 text-[11px] font-semibold text-[#697269]">순서</span>
                                <button
                                  type="button"
                                  aria-label={`${String(row.title ?? row.name ?? rowId)} 위로 이동`}
                                  title="고객 화면에서 한 칸 위로 이동"
                                  disabled={saving || sourceIndex <= 0}
                                  onClick={() => handleMove(row, rowId, 'up')}
                                  className="flex size-11 items-center justify-center border border-[#D1D0C8] text-[#59615B] hover:bg-[#F3F2ED] disabled:opacity-30"
                                >
                                  <ArrowUp className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label={`${String(row.title ?? row.name ?? rowId)} 아래로 이동`}
                                  title="고객 화면에서 한 칸 아래로 이동"
                                  disabled={saving || sourceIndex < 0 || sourceIndex >= visibleRows.length - 1}
                                  onClick={() => handleMove(row, rowId, 'down')}
                                  className="flex size-11 items-center justify-center border-y border-r border-[#D1D0C8] text-[#59615B] hover:bg-[#F3F2ED] disabled:opacity-30"
                                >
                                  <ArrowDown className="size-4" />
                                </button>
                              </span>
                            );
                          })()}
                          {canEditRows && (
                            <button type="button" onClick={() => handleEdit(row)} className="inline-flex min-h-11 items-center text-xs font-semibold text-[#2F3B34] hover:underline mr-4">수정</button>
                          )}
                          {canDeleteRows && (
                            <button type="button" onClick={() => handleDelete(row, rowId)} disabled={saving} className="inline-flex min-h-11 items-center text-xs font-semibold text-red-600 hover:underline disabled:opacity-40">삭제</button>
                          )}
                        </td>
                      )}
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={columns.length + (hasRowActions ? 1 : 0)} className="bg-[#F8F7F2] px-5 py-4">
                          {renderExpandedRow?.(row)}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRows.length === 0 && <div className="p-12 text-center text-sm text-[#7B827C]">표시할 데이터가 없습니다.</div>}

        {/* Pagination Controls */}
        {filteredRows.length > 0 && (
          <div className="flex items-center justify-between border-t border-[#D1D0C8] bg-[#F8F7F2] px-4 py-3 sm:px-6">
            <div className="flex w-full items-center justify-between gap-3 sm:hidden">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="inline-flex min-h-11 items-center border border-[#D1D0C8] bg-white px-4 text-sm font-medium text-[#59615B] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <span className="text-sm tabular-nums text-[#59615B]">{currentPage} / {totalPages}</span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="inline-flex min-h-11 items-center border border-[#D1D0C8] bg-white px-4 text-sm font-medium text-[#59615B] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-[#59615B]">
                  전체 <span className="font-semibold">{filteredRows.length}</span>개 중 <span className="font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredRows.length)}</span> 표시
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px shadow-sm" aria-label="Pagination">
                  <button
                    type="button"
                    aria-label="이전 페이지"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center border border-[#D1D0C8] bg-white px-3 py-2 text-sm font-medium text-[#59615B] hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      type="button"
                      aria-label={`${i + 1}페이지`}
                      aria-current={currentPage === i + 1 ? 'page' : undefined}
                      onClick={() => setCurrentPage(i + 1)}
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
                    type="button"
                    aria-label="다음 페이지"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center border border-[#D1D0C8] bg-white px-3 py-2 text-sm font-medium text-[#59615B] hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      {canEditRows && editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeEdit}>
          <div
            className="w-full max-w-4xl bg-[#F8F7F2] shadow-xl relative max-h-[90dvh] overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label={`${title} 수정`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#2F3B34] text-white flex justify-between items-center p-5 shrink-0">
              <h2 className="text-lg font-semibold">{title} - 상세 / 수정</h2>
              <button type="button" onClick={closeEdit} aria-label="수정 창 닫기" className="p-1 hover:bg-white/20 rounded">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="mb-6 border border-[#CAD2CB] bg-[#F1F5F1] p-4 text-xs leading-5 text-[#506057]">
                <p>{formIntro ?? (onSave == null ? '수정 내용을 저장하면 바로 반영됩니다.' : `수정 후 상단의 ${saveLabel} 버튼을 눌러 최종 반영하세요.`)}</p>
                {affectedScreen && <p className="mt-1 font-semibold">반영 위치: {affectedScreen}</p>}
              </div>
              {renderFormFields(editingDraft, setEditingDraft, 'edit')}
              {saveMessage && <p role="alert" className="mt-4 text-sm font-medium text-red-600">{saveMessage}</p>}
            </div>
            <div className="border-t border-[#D1D0C8] bg-white p-5 flex justify-end gap-3 shrink-0">
              <button onClick={closeEdit} type="button" className="min-h-11 border border-[#D1D0C8] px-5 text-sm font-semibold text-[#59615B] hover:bg-[#F8F7F2]">취소</button>
              <button onClick={handleUpdate} disabled={saving} type="button" className="min-h-11 bg-[#2F3B34] px-8 text-sm font-semibold text-white hover:bg-[#1f2823] disabled:opacity-50">
                {saving ? '저장 중…' : affectedScreen ? '수정하고 고객 화면에 반영' : onSave == null ? '저장' : '목록에 반영'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
