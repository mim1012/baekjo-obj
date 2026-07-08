'use client';

import { useState } from 'react';
import { useCategorySettings, BrandFilter } from '@/components/providers/CategorySettingsProvider';
import { brands as mockBrands } from '@/data/brands';
import { Plus, Trash2, Edit2, Search, Settings } from 'lucide-react';

export default function AdminBrandsDashboard() {
  const { categorySettings, updateCategorySettings } = useCategorySettings();
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null); // null means 'All'
  
  // Local state for brand filters
  const [brandFilters, setBrandFilters] = useState<BrandFilter[]>(categorySettings.brandFilters);
  const [newFilterId, setNewFilterId] = useState('');
  const [newFilterLabel, setNewFilterLabel] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');

  // Local state for mock brands
  const [localBrands, setLocalBrands] = useState(mockBrands);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add brand modal state
  const [isAddingBrand, setIsAddingBrand] = useState(false);

  const handleSaveFilters = (newFilters: BrandFilter[]) => {
    setBrandFilters(newFilters);
    updateCategorySettings({
      ...categorySettings,
      brandFilters: newFilters
    });
  };

  const handleAddFilter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilterLabel.trim()) return;
    const autoId = newFilterId.trim() || `filter-${Math.random().toString(36).substring(2, 8)}`;
    const newFilters = [...brandFilters, { id: autoId, label: newFilterLabel.trim() }];
    handleSaveFilters(newFilters);
    setNewFilterLabel('');
    setNewFilterId('');
  };

  const handleDeleteFilter = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('이 브랜드 필터를 삭제하시겠습니까?')) {
      const targetId = brandFilters[idx].id;
      const newFilters = brandFilters.filter((_, i) => i !== idx);
      handleSaveFilters(newFilters);
      if (activeFilterId === targetId) {
        setActiveFilterId(null);
      }
    }
  };

  const startEditFilter = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIndex(idx);
    setEditLabel(brandFilters[idx].label);
  };

  const saveEditFilter = () => {
    if (editingIndex === null) return;
    const newFilters = [...brandFilters];
    newFilters[editingIndex] = {
      ...newFilters[editingIndex],
      label: editLabel.trim() || newFilters[editingIndex].label
    };
    handleSaveFilters(newFilters);
    setEditingIndex(null);
  };

  // Filter brands based on the active tab/filter
  const filteredBrands = localBrands.filter(b => {
    if (searchQuery && !b.name.includes(searchQuery)) return false;
    
    if (activeFilterId === null) return true;
    if (activeFilterId === 'all') return true;
    if (activeFilterId === 'audit') return b.auditGrade.includes('A');
    if (activeFilterId === 'recommended') return b.isRecommended;
    if (activeFilterId === 'new') return b.isNew;
    
    // For custom custom filters (mock logic since we don't have custom relations in mock data)
    return false;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#D1D0C8] bg-white shrink-0">
        <p className="text-xs font-semibold text-[#697269]">DASHBOARD</p>
        <h1 className="mt-1 text-2xl font-normal text-[#202521]">브랜드 및 필터 관리</h1>
        <p className="mt-1 text-sm text-[#737A74]">브랜드관 탭 필터를 관리하고 각 필터에 브랜드를 할당합니다.</p>
      </div>

      <div className="flex flex-1 min-h-0 bg-[#F4F2EC]">
        {/* Sidebar: Filters */}
        <div className="w-72 shrink-0 bg-white border-r border-[#D1D0C8] flex flex-col h-full">
          <div className="p-4 border-b border-[#D1D0C8] bg-[#F8F7F2]">
            <h2 className="text-sm font-bold text-[#202521]">브랜드 탭 필터</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <button
              onClick={() => setActiveFilterId(null)}
              className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-1 ${
                activeFilterId === null ? 'bg-[#2F3B34] text-white' : 'text-[#4F5751] hover:bg-[#F0EEE8]'
              }`}
            >
              전체 브랜드 <span className="float-right opacity-60 text-xs mt-0.5">{localBrands.length}</span>
            </button>
            
            {brandFilters.map((filter, idx) => (
              <div key={filter.id} className="group relative">
                {editingIndex === idx ? (
                  <div className="flex items-center px-2 py-1.5 bg-[#F0EEE8] rounded-md mb-1">
                    <input
                      type="text"
                      value={editLabel}
                      onChange={e => setEditLabel(e.target.value)}
                      onBlur={saveEditFilter}
                      onKeyDown={e => e.key === 'Enter' && saveEditFilter()}
                      className="flex-1 bg-white border border-[#D1D0C8] rounded px-2 py-1 text-sm outline-none"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveFilterId(filter.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-1 pr-16 ${
                      activeFilterId === filter.id ? 'bg-[#2F3B34] text-white' : 'text-[#4F5751] hover:bg-[#F0EEE8]'
                    }`}
                  >
                    <span className="truncate block">{filter.label}</span>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 text-xs">
                      {/* For standard mock filters we can compute length, otherwise just show '-' */}
                      {['all', 'audit', 'recommended', 'new'].includes(filter.id)
                        ? localBrands.filter(b => {
                            if (filter.id === 'all') return true;
                            if (filter.id === 'audit') return b.auditGrade.includes('A');
                            if (filter.id === 'recommended') return b.isRecommended;
                            if (filter.id === 'new') return b.isNew;
                            return false;
                          }).length
                        : '-'}
                    </span>
                    
                    {/* Action buttons on hover */}
                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${activeFilterId === filter.id ? 'text-white' : 'text-[#4F5751]'}`}>
                      <span 
                        onClick={(e) => startEditFilter(idx, e)}
                        className="p-1 hover:bg-black/10 rounded cursor-pointer"
                        title="이름 수정"
                      >
                        <Edit2 className="size-3" />
                      </span>
                      {filter.id !== 'all' && (
                        <span 
                          onClick={(e) => handleDeleteFilter(idx, e)}
                          className="p-1 hover:bg-black/10 rounded cursor-pointer text-red-400"
                          title="필터 삭제"
                        >
                          <Trash2 className="size-3" />
                        </span>
                      )}
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[#D1D0C8] bg-[#F8F7F2]">
            <form onSubmit={handleAddFilter} className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="새 탭 이름 (예: 베스트셀러)"
                value={newFilterLabel}
                onChange={e => setNewFilterLabel(e.target.value)}
                className="w-full bg-white border border-[#D1D0C8] rounded-md px-3 py-2 text-sm outline-none focus:border-[#2F3B34]"
              />
              <button type="submit" className="w-full bg-[#2F3B34] text-white p-2 rounded-md hover:bg-[#1f2823] transition-colors text-sm font-semibold flex items-center justify-center gap-1">
                <Plus className="size-4" /> 필터 탭 추가
              </button>
            </form>
          </div>
        </div>

        {/* Main Content: Brands */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div className="p-6 pb-0 flex items-end justify-between gap-4 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-[#202521]">
                {activeFilterId ? `'${brandFilters.find(f => f.id === activeFilterId)?.label || activeFilterId}' 브랜드 목록` : '전체 브랜드 목록'}
              </h2>
              <p className="mt-1 text-sm text-[#737A74]">총 {filteredBrands.length}개의 브랜드</p>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B928C]" />
                <input 
                  placeholder="브랜드명 검색..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 border border-[#D1D0C8] rounded-full bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-[#2F3B34]" 
                />
              </label>
              <button 
                onClick={() => setIsAddingBrand(true)}
                className="flex items-center gap-2 bg-[#2F3B34] px-4 py-2 text-sm font-semibold text-white rounded-full hover:bg-[#1f2823] transition-colors shadow-sm"
              >
                <Plus className="size-4" /> 
                {activeFilterId && activeFilterId !== 'all' ? `여기에 브랜드 등록` : '새 브랜드 등록'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {filteredBrands.length > 0 ? (
              <div className="bg-white border border-[#D1D0C8] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F0EEE8] text-xs text-[#697069] border-b border-[#D1D0C8]">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">브랜드명</th>
                      <th className="px-5 py-3.5 font-semibold">검증 등급</th>
                      <th className="px-5 py-3.5 font-semibold">대표 상품 수</th>
                      <th className="px-5 py-3.5 font-semibold">태그</th>
                      <th className="px-5 py-3.5 text-right font-semibold">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1DFD8]">
                    {filteredBrands.map((brand) => (
                      <tr key={brand.id} className="hover:bg-[#FAF9F5] transition-colors">
                        <td className="px-5 py-4 font-medium text-[#202521] flex items-center gap-3">
                          <div className="w-8 h-8 rounded border border-[#E1DFD8] bg-white overflow-hidden flex items-center justify-center shrink-0">
                            {/* In a real app we'd load brand.logoUrl here */}
                            <span className="text-[10px] font-bold text-slate-400">{brand.name.charAt(0)}</span>
                          </div>
                          {brand.name}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                            brand.auditGrade.includes('A+') ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            brand.auditGrade.includes('A') ? 'bg-green-50 text-green-700 border border-green-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {brand.auditGrade}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-[#59615B]">{brand.representativeProductIds.length}개</td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1">
                            {brand.isRecommended && <span className="inline-block px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[10px] font-bold">추천</span>}
                            {brand.isNew && <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-bold">NEW</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <button className="text-[#59615B] hover:bg-slate-100 p-1.5 rounded-md transition-colors" title="브랜드 설정">
                              <Settings className="size-4" />
                            </button>
                            <button className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="브랜드 삭제" onClick={() => {
                              if (window.confirm(`'${brand.name}' 브랜드를 삭제하시겠습니까?`)) {
                                setLocalBrands(prev => prev.filter(b => b.id !== brand.id));
                              }
                            }}>
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-[#D1D0C8] rounded-xl bg-white/50 text-[#7B827C]">
                <p>해당하는 브랜드가 없습니다.</p>
                <button 
                  onClick={() => setIsAddingBrand(true)}
                  className="mt-3 text-sm font-semibold text-[#2F3B34] underline underline-offset-4"
                >
                  브랜드 등록하기
                </button>
              </div>
            )}
          </div>

          {/* Add Brand Modal (Mock) */}
          {isAddingBrand && (
            <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-[#D1D0C8] bg-[#F8F7F2] flex justify-between items-center">
                  <h3 className="font-bold text-[#202521]">새 브랜드 등록</h3>
                  <button onClick={() => setIsAddingBrand(false)} className="text-[#8B928C] hover:text-black">✕</button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#59615B] mb-1.5">브랜드명</label>
                    <input type="text" className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm" placeholder="예: 백조오브제" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#59615B] mb-1.5">검증 등급</label>
                      <select className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm bg-white">
                        <option value="A+">A+ 등급</option>
                        <option value="A">A 등급</option>
                        <option value="B">B 등급</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#59615B] mb-1.5">소속 탭 (필터)</label>
                      <select className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm bg-white" defaultValue={activeFilterId || 'all'}>
                        {brandFilters.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 mt-4 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded text-[#2F3B34] border-[#D1D0C8] focus:ring-[#2F3B34]" />
                      <span className="text-sm font-medium text-[#202521]">전문가 추천 태그 부착</span>
                    </label>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-[#D1D0C8] bg-slate-50 flex justify-end gap-2">
                  <button onClick={() => setIsAddingBrand(false)} className="px-4 py-2 text-sm font-medium text-[#59615B] bg-white border border-[#D1D0C8] rounded-md hover:bg-slate-50">취소</button>
                  <button onClick={() => setIsAddingBrand(false)} className="px-4 py-2 text-sm font-medium text-white bg-[#2F3B34] rounded-md hover:bg-[#1f2823]">등록 완료</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
