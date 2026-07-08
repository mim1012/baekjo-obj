'use client';

import { useState } from 'react';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';
import { products as mockProducts } from '@/data/products';
import { formatPrice } from '@/lib/format';
import { Plus, Trash2, Edit2, Search, MoreHorizontal } from 'lucide-react';

export default function AdminProductsDashboard() {
  const { categorySettings, updateCategorySettings } = useCategorySettings();
  const [activeCategory, setActiveCategory] = useState<string | null>(null); // null means 'All'
  
  // Local state for categories (productCategories)
  const [categories, setCategories] = useState<string[]>(categorySettings.productCategories);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  // Local state for mock products
  const [localProducts, setLocalProducts] = useState(mockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Add product modal state
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  const handleSaveCategories = (newCats: string[]) => {
    setCategories(newCats);
    updateCategorySettings({
      ...categorySettings,
      productCategories: newCats
    });
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const newCats = [...categories, newCategoryName.trim()];
    handleSaveCategories(newCats);
    setNewCategoryName('');
  };

  const handleDeleteCategory = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('이 카테고리를 삭제하시겠습니까?')) {
      const newCats = categories.filter((_, i) => i !== idx);
      handleSaveCategories(newCats);
      if (activeCategory === categories[idx]) {
        setActiveCategory(null);
      }
    }
  };

  const startEditCategory = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIndex(idx);
    setEditValue(categories[idx]);
  };

  const saveEditCategory = () => {
    if (editingIndex === null) return;
    const newCats = [...categories];
    newCats[editingIndex] = editValue.trim() || newCats[editingIndex];
    handleSaveCategories(newCats);
    setEditingIndex(null);
  };

  // Filter products
  const filteredProducts = localProducts.filter(p => {
    if (activeCategory && p.category !== activeCategory) return false;
    if (searchQuery && !p.name.includes(searchQuery)) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#D1D0C8] bg-white shrink-0">
        <p className="text-xs font-semibold text-[#697269]">DASHBOARD</p>
        <h1 className="mt-1 text-2xl font-normal text-[#202521]">상품 및 카테고리 관리</h1>
        <p className="mt-1 text-sm text-[#737A74]">카테고리를 선택하여 상품을 쉽게 등록하고 삭제할 수 있습니다.</p>
      </div>

      <div className="flex flex-1 min-h-0 bg-[#F4F2EC]">
        {/* Sidebar: Categories */}
        <div className="w-64 shrink-0 bg-white border-r border-[#D1D0C8] flex flex-col h-full">
          <div className="p-4 border-b border-[#D1D0C8] bg-[#F8F7F2]">
            <h2 className="text-sm font-bold text-[#202521]">일반 상품 카테고리</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-1 ${
                activeCategory === null ? 'bg-[#2F3B34] text-white' : 'text-[#4F5751] hover:bg-[#F0EEE8]'
              }`}
            >
              전체 상품 <span className="float-right opacity-60 text-xs mt-0.5">{localProducts.length}</span>
            </button>
            
            {categories.map((cat, idx) => (
              <div key={idx} className="group relative">
                {editingIndex === idx ? (
                  <div className="flex items-center px-2 py-1.5 bg-[#F0EEE8] rounded-md mb-1">
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={saveEditCategory}
                      onKeyDown={e => e.key === 'Enter' && saveEditCategory()}
                      className="flex-1 bg-white border border-[#D1D0C8] rounded px-2 py-1 text-sm outline-none"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-1 pr-16 ${
                      activeCategory === cat ? 'bg-[#2F3B34] text-white' : 'text-[#4F5751] hover:bg-[#F0EEE8]'
                    }`}
                  >
                    <span className="truncate block">{cat}</span>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 text-xs">
                      {localProducts.filter(p => p.category === cat).length}
                    </span>
                    
                    {/* Action buttons on hover */}
                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${activeCategory === cat ? 'text-white' : 'text-[#4F5751]'}`}>
                      <span 
                        onClick={(e) => startEditCategory(idx, e)}
                        className="p-1 hover:bg-black/10 rounded cursor-pointer"
                        title="이름 수정"
                      >
                        <Edit2 className="size-3" />
                      </span>
                      <span 
                        onClick={(e) => handleDeleteCategory(idx, e)}
                        className="p-1 hover:bg-black/10 rounded cursor-pointer text-red-400"
                        title="카테고리 삭제"
                      >
                        <Trash2 className="size-3" />
                      </span>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[#D1D0C8] bg-[#F8F7F2]">
            <form onSubmit={handleAddCategory} className="flex gap-2">
              <input
                type="text"
                placeholder="새 카테고리명"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                className="flex-1 bg-white border border-[#D1D0C8] rounded-md px-3 py-2 text-sm outline-none focus:border-[#2F3B34]"
              />
              <button type="submit" className="bg-[#2F3B34] text-white p-2 rounded-md hover:bg-[#1f2823] transition-colors">
                <Plus className="size-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Main Content: Products */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div className="p-6 pb-0 flex items-end justify-between gap-4 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-[#202521]">
                {activeCategory ? `'${activeCategory}' 상품 목록` : '전체 상품 목록'}
              </h2>
              <p className="mt-1 text-sm text-[#737A74]">총 {filteredProducts.length}개의 상품</p>
            </div>
            
            <div className="flex items-center gap-3">
              <label className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B928C]" />
                <input 
                  placeholder="상품명 검색..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 border border-[#D1D0C8] rounded-full bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-[#2F3B34]" 
                />
              </label>
              <button 
                onClick={() => setIsAddingProduct(true)}
                className="flex items-center gap-2 bg-[#2F3B34] px-4 py-2 text-sm font-semibold text-white rounded-full hover:bg-[#1f2823] transition-colors shadow-sm"
              >
                <Plus className="size-4" /> 
                {activeCategory ? `'${activeCategory}'에 상품 등록` : '새 상품 등록'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {filteredProducts.length > 0 ? (
              <div className="bg-white border border-[#D1D0C8] rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F0EEE8] text-xs text-[#697069] border-b border-[#D1D0C8]">
                    <tr>
                      <th className="px-5 py-3.5 font-semibold">상품명</th>
                      <th className="px-5 py-3.5 font-semibold">브랜드</th>
                      <th className="px-5 py-3.5 font-semibold">카테고리</th>
                      <th className="px-5 py-3.5 font-semibold">판매가</th>
                      <th className="px-5 py-3.5 text-right font-semibold">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1DFD8]">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-[#FAF9F5] transition-colors">
                        <td className="px-5 py-3 font-medium text-[#202521]">{product.name}</td>
                        <td className="px-5 py-3 text-[#59615B]">{product.brandId}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex bg-[#EDF0EC] border border-[#C9CEC9] px-2 py-0.5 rounded text-xs text-[#4F5751]">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 tabular-nums text-[#4F5751]">
                          {product.price !== null && product.price !== undefined ? formatPrice(product.salePrice || product.price) : '-'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="상품 삭제" onClick={() => {
                            if (window.confirm(`'${product.name}' 상품을 삭제하시겠습니까?`)) {
                              setLocalProducts(prev => prev.filter(p => p.id !== product.id));
                            }
                          }}>
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-[#D1D0C8] rounded-xl bg-white/50 text-[#7B827C]">
                <p>해당하는 상품이 없습니다.</p>
                <button 
                  onClick={() => setIsAddingProduct(true)}
                  className="mt-3 text-sm font-semibold text-[#2F3B34] underline underline-offset-4"
                >
                  첫 상품 등록하기
                </button>
              </div>
            )}
          </div>

          {/* Add Product Modal (Mock) */}
          {isAddingProduct && (
            <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-[#D1D0C8] bg-[#F8F7F2] flex justify-between items-center">
                  <h3 className="font-bold text-[#202521]">새 상품 등록</h3>
                  <button onClick={() => setIsAddingProduct(false)} className="text-[#8B928C] hover:text-black">✕</button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#59615B] mb-1.5">상품명</label>
                    <input type="text" className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm" placeholder="예: 시그니처 연어 사료 2kg" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#59615B] mb-1.5">카테고리 지정</label>
                    <select className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm bg-white" defaultValue={activeCategory || ''}>
                      <option value="" disabled>카테고리 선택...</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <p className="text-[11px] text-[#8B928C] mt-1">현재 활성화된 카테고리로 기본 선택됩니다.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#59615B] mb-1.5">브랜드</label>
                      <input type="text" className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm" placeholder="브랜드명" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#59615B] mb-1.5">판매가</label>
                      <input type="number" className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm" placeholder="0" />
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-[#D1D0C8] bg-slate-50 flex justify-end gap-2">
                  <button onClick={() => setIsAddingProduct(false)} className="px-4 py-2 text-sm font-medium text-[#59615B] bg-white border border-[#D1D0C8] rounded-md hover:bg-slate-50">취소</button>
                  <button onClick={() => setIsAddingProduct(false)} className="px-4 py-2 text-sm font-medium text-white bg-[#2F3B34] rounded-md hover:bg-[#1f2823]">등록 완료</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
