'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ExternalLink, Layers, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';
import { useProductList } from '@/hooks/admin-new/useProductList';
import { normalizeShopCategory } from '@/data/shopFilters';
import type {
  CategorySettings,
  StoreFilterOption,
  StorePriceRange,
  StoreRatingRange,
} from '@/lib/categorySettings/config';
import PageHeader from '@/components/admin-new/common/PageHeader';
import ConfirmDialog from '@/components/admin-new/common/ConfirmDialog';

type SimpleField = 'productCategories' | 'petTypes';
type OrderedField = SimpleField | 'priceRanges' | 'ratingRanges';

interface PendingDelete {
  field: OrderedField;
  index: number;
  label: string;
}

const inputClass = 'min-w-0 flex-1 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B]';
const numberInputClass = 'w-28 rounded border border-gray-300 px-3 py-2 text-right text-sm tabular-nums outline-none focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B]';

function createId(prefix: string, existing: readonly StoreFilterOption[]): string {
  const base = `${prefix}-${Date.now().toString(36)}`;
  let id = base;
  let sequence = 1;
  const used = new Set(existing.map((item) => item.id));
  while (used.has(id)) {
    sequence += 1;
    id = `${base}-${sequence}`;
  }
  return id;
}

export default function CategoryManagerPage() {
  const { categorySettings, updateCategorySettings, loaded, loadError } = useCategorySettings();
  const { products, loading: productsLoading, error: productsError } = useProductList(10_000);
  const [settings, setSettings] = useState<CategorySettings>(categorySettings);
  const [dirty, setDirty] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [busy, setBusy] = useState(false);

  React.useEffect(() => {
    if (!dirty) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSettings(categorySettings);
    }
  }, [categorySettings, dirty]);

  const commit = async (next: CategorySettings) => {
    if (!loaded || loadError || busy) return false;
    setBusy(true);
    setSettings(next);
    setDirty(false);
    setActionError(null);
    try {
      const ok = await updateCategorySettings(next);
      if (!ok) {
        setSettings(categorySettings);
        setActionError('저장하지 못했습니다. 입력값을 확인한 뒤 다시 시도해 주세요.');
      }
      return ok;
    } finally {
      setBusy(false);
    }
  };

  const updateLocal = <K extends OrderedField>(field: K, index: number, patchValue: Partial<CategorySettings[K][number]>) => {
    if (!loaded) return;
    setSettings((previous) => {
      const list = [...previous[field]] as Array<CategorySettings[K][number]>;
      list[index] = { ...list[index], ...patchValue };
      return { ...previous, [field]: list };
    });
    setDirty(true);
  };

  const commitLocal = () => {
    if (dirty) void commit(settings);
  };

  const addSimple = (field: SimpleField) => {
    const prefix = field === 'productCategories' ? 'category' : 'pet';
    const label = field === 'productCategories' ? '새 카테고리' : '새 반려동물';
    const list = settings[field];
    void commit({ ...settings, [field]: [...list, { id: createId(prefix, list), label }] });
  };

  const addPrice = () => {
    const list = settings.priceRanges;
    void commit({
      ...settings,
      priceRanges: [...list, { id: createId('price', list), label: '새 가격 구간', minPrice: 0, maxPrice: 0 }],
    });
  };

  const addRating = () => {
    const list = settings.ratingRanges;
    void commit({
      ...settings,
      ratingRanges: [...list, { id: createId('rating', list), label: '새 평점 조건', minRating: 0 }],
    });
  };

  const moveItem = (field: OrderedField, index: number, direction: -1 | 1) => {
    const list = [...settings[field]];
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    void commit({ ...settings, [field]: list });
  };

  const usageCount = (field: OrderedField, index: number): number => {
    if (field === 'productCategories') {
      const id = settings.productCategories[index]?.id;
      return products.filter((product) => normalizeShopCategory(product.categorySlug ?? product.category) === normalizeShopCategory(id)).length;
    }
    if (field === 'petTypes') {
      const id = settings.petTypes[index]?.id;
      return products.filter((product) => product.petType === id).length;
    }
    return 0;
  };

  const requestDelete = (field: OrderedField, index: number, label: string) => {
    const count = usageCount(field, index);
    if (count > 0) {
      setActionError(`“${label}”을 사용하는 상품이 ${count}개라 삭제할 수 없습니다. 상품 관리에서 해당 상품의 분류를 먼저 변경해 주세요.`);
      return;
    }
    setPendingDelete({ field, index, label });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const { field, index } = pendingDelete;
    const list = settings[field].filter((_, itemIndex) => itemIndex !== index);
    setPendingDelete(null);
    void commit({ ...settings, [field]: list });
  };

  const renderOrderButtons = (field: OrderedField, index: number, length: number) => (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={() => moveItem(field, index, -1)}
        disabled={index === 0}
        aria-label={`${index + 1}번 항목 위로 이동`}
        className="rounded border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ArrowUp className="size-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => moveItem(field, index, 1)}
        disabled={index === length - 1}
        aria-label={`${index + 1}번 항목 아래로 이동`}
        className="rounded border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ArrowDown className="size-4" aria-hidden="true" />
      </button>
    </div>
  );

  const renderCardHeader = (title: string, description: string, onAdd: () => void) => (
    <div className="flex flex-col gap-3 border-b border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 className="text-balance text-base font-semibold text-[#17201B]">{title}</h2>
        <p className="mt-1 text-pretty text-xs leading-5 text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={onAdd}
        disabled={!loaded || Boolean(loadError) || busy}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded bg-[#17201B] px-3 py-2 text-xs font-medium text-white hover:bg-[#2F3B34] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="size-4" aria-hidden="true" /> 항목 등록
      </button>
    </div>
  );

  const renderSimpleEditor = (field: SimpleField, title: string, description: string) => {
    const list = settings[field];
    return (
      <section data-testid={`category-editor-${field}`} className="overflow-hidden rounded-md border border-gray-200 bg-white">
        {renderCardHeader(title, description, () => addSimple(field))}
        <div className="space-y-2 p-4">
          {list.length === 0 ? (
            <button type="button" onClick={() => addSimple(field)} className="w-full rounded border border-dashed border-gray-300 px-4 py-8 text-sm text-gray-500 hover:bg-gray-50">
              항목이 없습니다. 여기를 눌러 첫 항목을 등록하세요.
            </button>
          ) : list.map((item, index) => {
            const count = usageCount(field, index);
            return (
              <div key={item.id} className="flex flex-col gap-2 rounded border border-gray-200 p-3 sm:flex-row sm:items-center">
                <span className="w-7 shrink-0 text-center text-sm font-semibold tabular-nums text-[#A8742E]">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <label htmlFor={`${field}-${item.id}`} className="sr-only">고객에게 보이는 이름</label>
                  <input
                    id={`${field}-${item.id}`}
                    value={item.label}
                    onChange={(event) => updateLocal(field, index, { label: event.target.value })}
                    onBlur={commitLocal}
                    className={inputClass}
                    placeholder="고객에게 보이는 이름"
                  />
                  <p className="mt-1 text-xs text-gray-500">연결된 상품 {productsLoading ? '확인 중' : `${count}개`} · 이름 수정은 상품 연결을 유지합니다.</p>
                </div>
                {renderOrderButtons(field, index, list.length)}
                <button
                  type="button"
                  onClick={() => requestDelete(field, index, item.label)}
                  aria-label={`${item.label} 삭제`}
                  className="rounded border border-red-200 p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="스토어 필터·카테고리 관리"
        description={loadError
          ? '스토어 필터 설정을 불러오지 못해 저장을 막았습니다. 새로고침 후 다시 시도해 주세요.'
          : '고객 스토어 왼쪽 필터에 보이는 항목과 순서를 관리합니다. 이름 수정은 입력칸을 벗어날 때, 등록·삭제·순서 변경은 즉시 저장됩니다.'}
      />

      <section className="rounded-md border border-[#D8C4A3] bg-[#FFFDF7] p-5">
        <div className="flex items-start gap-3">
          <SlidersHorizontal className="mt-0.5 size-5 shrink-0 text-[#A8742E]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="text-balance text-base font-semibold text-[#17201B]">어디에 표시되는지 먼저 확인하세요</h2>
            <p className="mt-1 text-pretty text-sm leading-6 text-gray-600">아래 네 목록의 순서가 고객 화면의 스토어 왼쪽 필터 순서로 그대로 연결됩니다. ‘전체’는 시스템 기본 항목이라 자동으로 맨 위에 표시됩니다.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['반려동물', '강아지·고양이·소동물'],
                ['카테고리', '푸드·영양·케어 등'],
                ['가격', '최소·최대 금액 구간'],
                ['상세 필터 → 평점', '최소 평점 조건'],
              ].map(([name, detail]) => (
                <div key={name} className="rounded border border-[#E7E0D5] bg-white px-3 py-3">
                  <p className="text-sm font-semibold text-[#17201B]">{name}</p>
                  <p className="mt-1 text-xs text-gray-500">{detail}</p>
                </div>
              ))}
            </div>
            <Link href="/shop" target="_blank" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#7A4E1D] underline underline-offset-4">
              고객 스토어 필터 열기 <ExternalLink className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {(actionError || productsError) && (
        <div role="alert" className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          {actionError ?? productsError}
          {actionError && <Link href="/admin/products" className="ml-2 font-semibold underline underline-offset-4">상품 관리 열기</Link>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {renderSimpleEditor('petTypes', '1. 반려동물 필터', '표시 위치: 스토어 → 왼쪽 필터 → 반려동물. 상품 등록 화면의 반려동물 선택에도 같은 목록이 나타납니다.')}
        {renderSimpleEditor('productCategories', '2. 상품 카테고리', '표시 위치: 스토어 → 상단 빠른 카테고리와 왼쪽 카테고리 필터. 이름을 바꿔도 기존 상품 연결은 유지됩니다.')}

        <section data-testid="category-editor-priceRanges" className="overflow-hidden rounded-md border border-gray-200 bg-white">
          {renderCardHeader('3. 가격 필터', '표시 위치: 스토어 → 왼쪽 필터 → 가격. 최소 또는 최대가 비어 있으면 해당 방향의 제한이 없습니다.', addPrice)}
          <div className="space-y-2 p-4">
            {settings.priceRanges.map((item: StorePriceRange, index) => (
              <div key={item.id} className="rounded border border-gray-200 p-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 shrink-0 text-center text-sm font-semibold tabular-nums text-[#A8742E]">{index + 1}</span>
                  <label htmlFor={`price-label-${item.id}`} className="sr-only">고객에게 보이는 가격 이름</label>
                  <input id={`price-label-${item.id}`} value={item.label} onChange={(event) => updateLocal('priceRanges', index, { label: event.target.value })} onBlur={commitLocal} className={inputClass} placeholder="예: 2만원 미만" />
                  {renderOrderButtons('priceRanges', index, settings.priceRanges.length)}
                  <button type="button" onClick={() => requestDelete('priceRanges', index, item.label)} aria-label={`${item.label} 삭제`} className="rounded border border-red-200 p-2 text-red-600 hover:bg-red-50"><Trash2 className="size-4" aria-hidden="true" /></button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 pl-9 text-xs text-gray-600">
                  <label htmlFor={`price-min-${item.id}`}>최소 금액</label>
                  <input id={`price-min-${item.id}`} type="number" min="0" value={item.minPrice ?? ''} onChange={(event) => updateLocal('priceRanges', index, { minPrice: event.target.value === '' ? undefined : Number(event.target.value) })} onBlur={commitLocal} className={numberInputClass} placeholder="제한 없음" />
                  <span>원 이상</span>
                  <label htmlFor={`price-max-${item.id}`} className="ml-2">최대 금액</label>
                  <input id={`price-max-${item.id}`} type="number" min="0" value={item.maxPrice ?? ''} onChange={(event) => updateLocal('priceRanges', index, { maxPrice: event.target.value === '' ? undefined : Number(event.target.value) })} onBlur={commitLocal} className={numberInputClass} placeholder="제한 없음" />
                  <span>원 이하</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section data-testid="category-editor-ratingRanges" className="overflow-hidden rounded-md border border-gray-200 bg-white">
          {renderCardHeader('4. 평점 상세 필터', '표시 위치: 스토어 → 상세 필터 + → 평점. 입력한 점수 이상의 상품만 보여줍니다.', addRating)}
          <div className="space-y-2 p-4">
            {settings.ratingRanges.map((item: StoreRatingRange, index) => (
              <div key={item.id} className="flex flex-col gap-2 rounded border border-gray-200 p-3 sm:flex-row sm:items-center">
                <span className="w-7 shrink-0 text-center text-sm font-semibold tabular-nums text-[#A8742E]">{index + 1}</span>
                <label htmlFor={`rating-label-${item.id}`} className="sr-only">고객에게 보이는 평점 이름</label>
                <input id={`rating-label-${item.id}`} value={item.label} onChange={(event) => updateLocal('ratingRanges', index, { label: event.target.value })} onBlur={commitLocal} className={inputClass} placeholder="예: 4.0 이상" />
                <label htmlFor={`rating-min-${item.id}`} className="text-xs text-gray-600">최소 평점</label>
                <input id={`rating-min-${item.id}`} type="number" min="0" max="5" step="0.1" value={item.minRating} onChange={(event) => updateLocal('ratingRanges', index, { minRating: Number(event.target.value) })} onBlur={commitLocal} className={numberInputClass} />
                {renderOrderButtons('ratingRanges', index, settings.ratingRanges.length)}
                <button type="button" onClick={() => requestDelete('ratingRanges', index, item.label)} aria-label={`${item.label} 삭제`} className="rounded border border-red-200 p-2 text-red-600 hover:bg-red-50"><Trash2 className="size-4" aria-hidden="true" /></button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-md border border-gray-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <Layers className="mt-0.5 size-5 shrink-0 text-[#A8742E]" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2 className="text-balance text-base font-semibold text-[#17201B]">다른 관리 화면에서 연결되는 스토어 필터</h2>
            <p className="mt-1 text-pretty text-sm leading-6 text-gray-600">같은 항목을 두 곳에서 중복 수정하지 않습니다. 아래 필터는 실제 원본 관리 화면에서 등록·수정·삭제·순서를 변경합니다.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Link href="/admin/brands" className="rounded border border-gray-200 p-4 hover:bg-gray-50">
                <p className="font-semibold text-[#17201B]">브랜드 필터 → 브랜드 관리</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">판매 노출된 브랜드의 이름과 진열 순서를 그대로 사용합니다.</p>
              </Link>
              <Link href="/admin/products/tags" className="rounded border border-gray-200 p-4 hover:bg-gray-50">
                <p className="font-semibold text-[#17201B]">상세 필터 → 고민 → 상품 태그 관리</p>
                <p className="mt-1 text-xs leading-5 text-gray-500">‘스토어 고민 필터에도 보이기’를 켠 태그만 표시됩니다.</p>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ConfirmDialog
        isOpen={Boolean(pendingDelete)}
        title="필터 항목을 삭제할까요?"
        description={pendingDelete ? `“${pendingDelete.label}” 항목이 고객 스토어 필터에서 사라집니다. 이 작업은 되돌릴 수 없습니다.` : ''}
        confirmText="삭제"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
        isDestructive
      />
    </div>
  );
}
