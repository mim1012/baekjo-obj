'use client';

import { useState, useEffect } from 'react';
import { useCategorySettings, BrandFilter } from '@/components/providers/CategorySettingsProvider';
import { Plus, Trash2, Save, Eye } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function AdminCategoriesPage() {
  const { categorySettings, updateCategorySettings } = useCategorySettings();
  
  // Local state for editing
  const [productCategories, setProductCategories] = useState<string[]>(categorySettings.productCategories);
  const [lifestyleCategories, setLifestyleCategories] = useState<string[]>(categorySettings.lifestyleCategories);
  const [brandFilters, setBrandFilters] = useState<BrandFilter[]>(categorySettings.brandFilters);

  const [activeTab, setActiveTab] = useState<'product' | 'lifestyle' | 'brand'>('product');

  // Sync when settings change
  useEffect(() => {
    setProductCategories(categorySettings.productCategories);
    setLifestyleCategories(categorySettings.lifestyleCategories);
    setBrandFilters(categorySettings.brandFilters);
  }, [categorySettings]);

  const handleSave = () => {
    updateCategorySettings({
      productCategories,
      lifestyleCategories,
      brandFilters,
    });
    alert('카테고리 설정이 저장되었습니다.');
  };

  const handleAddStringItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '새로운 카테고리']);
  };

  const handleUpdateStringItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleRemoveStringItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddBrandFilter = () => {
    setBrandFilters(prev => [...prev, { id: `filter-${uuidv4().slice(0, 6)}`, label: '새로운 브랜드 필터' }]);
  };

  const handleUpdateBrandFilter = (index: number, key: keyof BrandFilter, value: string) => {
    setBrandFilters(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const handleRemoveBrandFilter = (index: number) => {
    setBrandFilters(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">카테고리/필터 관리</h1>
          <p className="mt-2 text-sm text-slate-500">
            상품 쇼핑몰, 브랜드관 및 관리자 페이지에 노출되는 카테고리와 탭 목록을 통합 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            <Save className="size-4" />
            변경사항 저장
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Sidebar Tabs */}
        <div className="w-full md:w-64 shrink-0 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm sticky top-6">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">카테고리 항목</h2>
          </div>
          <div className="flex flex-col">
            <button
              onClick={() => setActiveTab('product')}
              className={`text-left px-5 py-3.5 text-sm font-medium transition-colors ${
                activeTab === 'product' ? 'bg-emerald-50 text-emerald-700 border-l-2 border-emerald-500' : 'text-slate-600 hover:bg-slate-50 border-l-2 border-transparent'
              }`}
            >
              일반 상품 카테고리
            </button>
            <button
              onClick={() => setActiveTab('lifestyle')}
              className={`text-left px-5 py-3.5 text-sm font-medium transition-colors ${
                activeTab === 'lifestyle' ? 'bg-emerald-50 text-emerald-700 border-l-2 border-emerald-500' : 'text-slate-600 hover:bg-slate-50 border-l-2 border-transparent'
              }`}
            >
              라이프스타일 카테고리
            </button>
            <button
              onClick={() => setActiveTab('brand')}
              className={`text-left px-5 py-3.5 text-sm font-medium transition-colors ${
                activeTab === 'brand' ? 'bg-emerald-50 text-emerald-700 border-l-2 border-emerald-500' : 'text-slate-600 hover:bg-slate-50 border-l-2 border-transparent'
              }`}
            >
              브랜드관 상단 탭 필터
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm min-w-0 w-full">
          {activeTab === 'product' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">일반 상품 카테고리</h3>
                  <p className="text-sm text-slate-500 mt-1">쇼핑 페이지 좌측 필터 및 상품 등록 시 노출되는 카테고리입니다.</p>
                </div>
                <button onClick={() => handleAddStringItem(setProductCategories)} className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md transition-colors">
                  <Plus className="size-4" /> 항목 추가
                </button>
              </div>
              <div className="space-y-3">
                {productCategories.map((cat, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200 group transition-colors focus-within:border-emerald-300 focus-within:bg-white">
                    <div className="w-8 flex justify-center cursor-move text-slate-400">
                      <span className="font-mono text-xs opacity-50">{idx + 1}</span>
                    </div>
                    <input
                      type="text"
                      value={cat}
                      onChange={(e) => handleUpdateStringItem(setProductCategories, idx, e.target.value)}
                      className="flex-1 bg-transparent border-none text-sm font-medium text-slate-900 focus:ring-0 px-2 py-1"
                    />
                    <button onClick={() => handleRemoveStringItem(setProductCategories, idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'lifestyle' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">라이프스타일 카테고리</h3>
                  <p className="text-sm text-slate-500 mt-1">목적 및 용도 기반으로 분류된 추가 카테고리 옵션입니다.</p>
                </div>
                <button onClick={() => handleAddStringItem(setLifestyleCategories)} className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md transition-colors">
                  <Plus className="size-4" /> 항목 추가
                </button>
              </div>
              <div className="space-y-3">
                {lifestyleCategories.map((cat, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200 group transition-colors focus-within:border-emerald-300 focus-within:bg-white">
                    <div className="w-8 flex justify-center cursor-move text-slate-400">
                      <span className="font-mono text-xs opacity-50">{idx + 1}</span>
                    </div>
                    <input
                      type="text"
                      value={cat}
                      onChange={(e) => handleUpdateStringItem(setLifestyleCategories, idx, e.target.value)}
                      className="flex-1 bg-transparent border-none text-sm font-medium text-slate-900 focus:ring-0 px-2 py-1"
                    />
                    <button onClick={() => handleRemoveStringItem(setLifestyleCategories, idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'brand' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">브랜드관 상단 탭 필터</h3>
                  <p className="text-sm text-slate-500 mt-1">브랜드관 페이지 상단에 노출되는 필터 버튼들과 그 고유 ID값입니다.</p>
                </div>
                <button onClick={handleAddBrandFilter} className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-md transition-colors">
                  <Plus className="size-4" /> 필터 추가
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_2fr_auto] gap-2 px-2 text-xs font-bold text-slate-500 uppercase">
                  <div>필터 ID (URL에 사용됨)</div>
                  <div>버튼 표시 라벨명</div>
                  <div className="w-8"></div>
                </div>
                {brandFilters.map((filter, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200 group transition-colors focus-within:border-emerald-300 focus-within:bg-white">
                    <input
                      type="text"
                      value={filter.id}
                      onChange={(e) => handleUpdateBrandFilter(idx, 'id', e.target.value)}
                      placeholder="e.g. all"
                      className="bg-white border border-slate-200 rounded-md text-sm text-slate-900 px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-full font-mono"
                    />
                    <input
                      type="text"
                      value={filter.label}
                      onChange={(e) => handleUpdateBrandFilter(idx, 'label', e.target.value)}
                      placeholder="e.g. 전체 브랜드"
                      className="bg-white border border-slate-200 rounded-md text-sm text-slate-900 px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none w-full font-medium"
                    />
                    <button onClick={() => handleRemoveBrandFilter(idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
