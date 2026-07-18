'use client';

import { Fragment, useState, useEffect } from 'react';
import { Filter, Plus, Search, SlidersHorizontal, X } from 'lucide-react';

interface Column {
  key: string;
  label: string;
}

type ResourceRow = Record<string, string | number>;

interface FormField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select';
  options?: Array<{ value: string; label: string }>;
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
  /** 등록 폼 저장을 부모 draft 에 반영한다. 지정하지 않으면 등록 UI 자체를 숨긴다. */
  onCreateRow?: (draft: ResourceRow) => void;
  /** 수정 폼 저장을 부모 draft 에 반영한다. 지정하지 않으면 수정 UI를 숨긴다. */
  onUpdateRow?: (id: string | number, draft: ResourceRow) => void;
  /** 관리 셀(수정/삭제 앞)에 행별 커스텀 액션(승인/반려 버튼 등)을 렌더링한다. */
  customActions?: (row: ResourceRow) => React.ReactNode;
  /** 지정 시 행 클릭으로 상세 내용을 펼쳐 보여주는 확장 행을 렌더링한다. */
  renderExpandedRow?: (row: ResourceRow) => React.ReactNode;
  /**
   * 지정 시 삭제가 내부 로컬 Set(비영속)이 아니라 이 콜백으로 위임된다 — 부모(관리자 page)가
   * draft 에서 항목을 제거하고 rows 를 다시 내려보내 화면에 반영한다. 미지정 시 기존 동작
   * (로컬 숨김)을 유지한다(concerns/notices/reviews 화면 하위호환).
   */
  onDeleteRow?: (id: string | number) => void;
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
  onCreateRow,
  onUpdateRow,
  customActions,
  renderExpandedRow,
  onDeleteRow,
  onSave,
  saveLabel = '변경사항 저장',
}: AdminResourcePageProps) {
  const [editingRow, setEditingRow] = useState<ResourceRow | null>(null);
  const [editingDraft, setEditingDraft] = useState<ResourceRow>({});
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<ResourceRow>({});
  const [deletedIds, setDeletedIds] = useState<Set<string | number>>(new Set());
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
  const canDeleteRows = !readOnly && (onDeleteRow != null || onSave == null);
  const hasRowActions = canEditRows || canDeleteRows || customActions != null;

  const handleEdit = (row: ResourceRow) => {
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

  const handleDelete = (id: string | number) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      // 부모가 draft 를 소유하면(onDeleteRow) 로컬 숨김 대신 부모에 위임한다.
      if (onDeleteRow) {
        onDeleteRow(id);
        return;
      }
      setDeletedIds(prev => new Set(prev).add(id));
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

  const handleCreate = () => {
    if (!onCreateRow) return;
    onCreateRow(createDraft);
    setCreateOpen(false);
    resetCreateDraft();
  };

  const handleUpdate = () => {
    if (!onUpdateRow || !editingRow) return;
    onUpdateRow(editingRow.id, editingDraft);
    closeEdit();
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

    if (field.type === 'textarea') {
      return (
        <textarea
          className="mt-2 min-h-48 w-full border border-[#D1D0C8] bg-white px-3 py-2.5 text-sm focus:border-[#2F3B34]"
          value={String(value)}
          placeholder={`${field.label} 입력`}
          onChange={(event) => setValue(event.target.value)}
        />
      );
    }

    if (field.type === 'select') {
      return (
        <select
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
        type={field.type === 'number' ? 'number' : 'text'}
        className="mt-2 w-full border border-[#D1D0C8] bg-white px-3 py-2.5 text-sm focus:border-[#2F3B34]"
        value={value}
        placeholder={`${field.label} 입력`}
        onChange={(event) => setValue(field.type === 'number' ? Number(event.target.value) : event.target.value)}
      />
    );
  };

  const visibleRows = rows.filter(r => !deletedIds.has(r.id));
  
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
                    setCreateOpen((open) => !open);
                  }}
                  className="flex min-h-11 cursor-pointer items-center justify-center gap-2 bg-[#2F3B34] px-5 text-sm font-semibold text-white"
                >
                  <Plus className="size-4" /> {actionLabel}
                </button>
                {createOpen && (
                  <div className="absolute right-0 z-20 mt-2 max-h-[75dvh] w-[min(92vw,620px)] overflow-y-auto border border-[#D1D0C8] bg-white p-6 shadow-lg">
                    <h2 className="text-xl font-semibold text-[#202521]">{actionLabel}</h2>
                    <p className="mt-2 text-xs text-[#7B827C]">{onSave == null ? '저장하면 바로 반영됩니다.' : `입력 후 상단의 ${saveLabel} 버튼을 눌러 DB에 반영하세요.`}</p>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      {editableFields.map((field) => (
                        <label key={field.key} className={`text-xs font-medium text-[#59615B] ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                          {field.label}
                          {renderField(field, createDraft, setCreateDraft)}
                        </label>
                      ))}
                    </div>
                    <button type="button" onClick={handleCreate} className="mt-6 min-h-11 bg-[#2F3B34] px-5 text-sm font-semibold text-white">{onSave == null ? '저장' : '목록에 추가'}</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['전체', visibleRows.length],
          ['노출/활성', visibleRows.filter((row) => String(row.status ?? '').includes('중') || String(row.status ?? '').includes('활성')).length],
          ['점검 필요', visibleRows.filter((row) => String(row.status ?? '').includes('대기') || String(row.status ?? '').includes('보류')).length],
          ['검색 결과', filteredRows.length],
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
                {hasRowActions && <th className="px-5 py-3 text-right font-semibold">관리</th>}
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
                          {canEditRows && (
                            <button type="button" onClick={() => handleEdit(row)} className="inline-flex min-h-11 items-center text-xs font-semibold text-[#2F3B34] hover:underline mr-4">수정</button>
                          )}
                          {canDeleteRows && (
                            <button type="button" onClick={() => handleDelete(rowId)} className="inline-flex min-h-11 items-center text-xs font-semibold text-red-600 hover:underline">삭제</button>
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
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center border border-[#D1D0C8] bg-white px-3 py-2 text-sm font-medium text-[#59615B] hover:bg-gray-50 focus:z-20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
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
            className="w-full max-w-2xl bg-[#F8F7F2] shadow-xl relative max-h-[90dvh] overflow-hidden flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-label={`${title} 수정`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#2F3B34] text-white flex justify-between items-center p-5 shrink-0">
              <h2 className="text-lg font-semibold">{title} - 상세 / 수정</h2>
              <button onClick={closeEdit} className="p-1 hover:bg-white/20 rounded">
                <X className="size-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <p className="mb-6 text-xs text-[#7B827C]">{onSave == null ? '저장하면 바로 반영됩니다.' : `수정 후 상단의 ${saveLabel} 버튼을 눌러 DB에 반영하세요.`}</p>
              <div className="grid gap-5 sm:grid-cols-2">
                {editableFields.map((field) => (
                  <label key={field.key} className={`text-xs font-medium text-[#59615B] ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                    {field.label}
                    {renderField(field, editingDraft, setEditingDraft)}
                  </label>
                ))}
              </div>
            </div>
            <div className="border-t border-[#D1D0C8] bg-white p-5 flex justify-end gap-3 shrink-0">
              <button onClick={closeEdit} type="button" className="min-h-11 border border-[#D1D0C8] px-5 text-sm font-semibold text-[#59615B] hover:bg-[#F8F7F2]">취소</button>
              <button onClick={handleUpdate} type="button" className="min-h-11 bg-[#2F3B34] px-8 text-sm font-semibold text-white hover:bg-[#1f2823]">{onSave == null ? '저장' : '목록에 반영'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
