'use client';

import { useState } from 'react';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';
import { products as mockProducts } from '@/data/products';
import { formatPrice } from '@/lib/format';
import { Plus, Trash2, Edit2, Search, Settings } from 'lucide-react';

export default function AdminProductsDashboard() {
  const { categorySettings, updateCategorySettings } = useCategorySettings();
  const [activeCategory, setActiveCategory] = useState<string | null>(null); // null means 'All'
  const [activeGroup, setActiveGroup] = useState<'product' | 'lifestyle'>('product');
  
  // Local state for categories
  const [productCats, setProductCats] = useState<string[]>(categorySettings.productCategories);
  const [lifestyleCats, setLifestyleCats] = useState<string[]>(categorySettings.lifestyleCategories);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  // Local state for mock products
  const [localProducts, setLocalProducts] = useState(mockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const handleSaveCategories = (newCats: string[], type: 'product' | 'lifestyle') => {
    if (type === 'product') {
      setProductCats(newCats);
      updateCategorySettings({ ...categorySettings, productCategories: newCats });
    } else {
      setLifestyleCats(newCats);
      updateCategorySettings({ ...categorySettings, lifestyleCategories: newCats });
    }
  };

  const handleAddCategory = (e: React.FormEvent, type: 'product' | 'lifestyle') => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    const list = type === 'product' ? productCats : lifestyleCats;
    const newCats = [...list, newCategoryName.trim()];
    handleSaveCategories(newCats, type);
    setNewCategoryName('');
  };

  const handleDeleteCategory = (idx: number, type: 'product' | 'lifestyle', e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('이 카테고리를 삭제하시겠습니까?')) {
      const list = type === 'product' ? productCats : lifestyleCats;
      const newCats = list.filter((_, i) => i !== idx);
      handleSaveCategories(newCats, type);
      if (activeCategory === list[idx]) {
        setActiveCategory(null);
      }
    }
  };

  const startEditCategory = (idx: number, type: 'product' | 'lifestyle', e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveGroup(type);
    setEditingIndex(idx);
    setEditValue(type === 'product' ? productCats[idx] : lifestyleCats[idx]);
  };

  const saveEditCategory = (type: 'product' | 'lifestyle') => {
    if (editingIndex === null) return;
    const list = type === 'product' ? productCats : lifestyleCats;
    const newCats = [...list];
    newCats[editingIndex] = editValue.trim() || newCats[editingIndex];
    handleSaveCategories(newCats, type);
    setEditingIndex(null);
  };

  // Filter products
  const filteredProducts = localProducts.filter(p => {
    if (searchQuery && !p.name.includes(searchQuery)) return false;
    if (activeCategory) {
      if (activeGroup === 'product' && p.category !== activeCategory) return false;
      if (activeGroup === 'lifestyle' && p.lifestyleCategory !== activeCategory) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#D1D0C8] bg-white shrink-0">
        <p className="text-xs font-semibold text-[#697269]">DASHBOARD</p>
        <h1 className="mt-1 text-2xl font-normal text-[#202521]">상품 관리</h1>
        <p className="mt-1 text-sm text-[#737A74]">상품을 카테고리별로 쉽게 분류하고 등록하세요.</p>
      </div>

      <div className="flex flex-1 min-h-0 bg-[#F4F2EC]">
        {/* Sidebar: Categories */}
        <div className="w-72 shrink-0 bg-white border-r border-[#D1D0C8] flex flex-col h-full overflow-hidden">
          <div className="p-2 border-b border-[#D1D0C8] bg-slate-50 flex gap-1">
            <button
              onClick={() => { setActiveGroup('product'); setActiveCategory(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${activeGroup === 'product' ? 'bg-white shadow-sm text-[#202521]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              일반 상품
            </button>
            <button
              onClick={() => { setActiveGroup('lifestyle'); setActiveCategory(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${activeGroup === 'lifestyle' ? 'bg-white shadow-sm text-[#202521]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              라이프스타일
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-2 ${
                activeCategory === null ? 'bg-[#2F3B34] text-white' : 'text-[#4F5751] hover:bg-[#F0EEE8]'
              }`}
            >
              전체 보기 <span className="float-right opacity-60 text-xs mt-0.5">{localProducts.length}</span>
            </button>
            
            {(activeGroup === 'product' ? productCats : lifestyleCats).map((cat, idx) => (
              <div key={idx} className="group relative mb-1">
                {editingIndex === idx ? (
                  <div className="flex items-center px-2 py-1.5 bg-[#F0EEE8] rounded-md">
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => saveEditCategory(activeGroup)}
                      onKeyDown={e => e.key === 'Enter' && saveEditCategory(activeGroup)}
                      className="flex-1 bg-white border border-[#D1D0C8] rounded px-2 py-1 text-sm outline-none"
                      autoFocus
                    />
                  </div>
                ) : (
                  <button
                    onClick={() => setActiveCategory(cat)}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors pr-16 ${
                      activeCategory === cat ? 'bg-[#2F3B34] text-white' : 'text-[#4F5751] hover:bg-[#F0EEE8]'
                    }`}
                  >
                    <span className="truncate block">{cat}</span>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 text-xs">
                      {localProducts.filter(p => activeGroup === 'product' ? p.category === cat : p.lifestyleCategory === cat).length}
                    </span>
                    
                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${activeCategory === cat ? 'text-white' : 'text-[#4F5751]'}`}>
                      <span onClick={(e) => startEditCategory(idx, activeGroup, e)} className="p-1 hover:bg-black/10 rounded cursor-pointer"><Edit2 className="size-3" /></span>
                      <span onClick={(e) => handleDeleteCategory(idx, activeGroup, e)} className="p-1 hover:bg-black/10 rounded cursor-pointer text-red-400"><Trash2 className="size-3" /></span>
                    </div>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[#D1D0C8] bg-[#F8F7F2]">
            <form onSubmit={(e) => handleAddCategory(e, activeGroup)} className="flex gap-2">
              <input
                type="text"
                placeholder={`${activeGroup === 'product' ? '일반' : '라이프스타일'} 카테고리 추가`}
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
          <div className="p-6 pb-4 shrink-0 flex flex-col gap-4">
            {/* Category Management Panel */}
            {activeCategory ? (
              <div className="bg-white border border-[#D1D0C8] rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[#202521]">{activeCategory}</h2>
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-[#F0EEE8] text-[#4F5751]">
                        {activeGroup === 'product' ? '일반 상품 카테고리' : '라이프스타일 카테고리'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#59615B]">
                      해당 카테고리의 이름 등 속성을 관리합니다.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-sm font-medium bg-[#F0EEE8] text-[#4F5751] rounded hover:bg-[#E1DFD8] transition-colors flex items-center gap-1.5">
                      <Settings className="size-3.5" /> 정보 수정
                    </button>
                    <button 
                      onClick={() => {
                        const idx = (activeGroup === 'product' ? productCats : lifestyleCats).indexOf(activeCategory);
                        // @ts-ignore
                        if (idx !== -1) handleDeleteCategory(idx, activeGroup, { stopPropagation: () => {} });
                      }}
                      className="px-3 py-1.5 text-sm font-medium bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="size-3.5" /> 삭제
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-[#202521]">전체 상품 목록</h2>
                <p className="mt-1 text-sm text-[#737A74]">모든 상품을 한눈에 관리합니다.</p>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-end justify-between mt-2">
              <p className="text-sm font-medium text-[#59615B]">
                등록된 상품: <span className="font-bold text-[#202521]">{filteredProducts.length}</span>개
              </p>
              <div className="flex items-center gap-3">
                <label className="relative">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B928C]" />
                  <input 
                    placeholder="상품명 검색..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 border border-[#D1D0C8] rounded-full bg-white py-2 pl-9 pr-4 text-sm outline-none focus:border-[#2F3B34] shadow-sm" 
                  />
                </label>
                <button 
                  onClick={() => setIsAddingProduct(true)}
                  className="flex items-center gap-2 bg-[#2F3B34] px-4 py-2 text-sm font-semibold text-white rounded-full hover:bg-[#1f2823] transition-colors shadow-sm"
                >
                  <Plus className="size-4" /> 
                  {activeCategory ? `'${activeCategory}'에 상품 추가` : '새 상품 추가'}
                </button>
              </div>
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
                      <th className="px-5 py-3.5 font-semibold">일반 카테고리</th>
                      <th className="px-5 py-3.5 font-semibold">라이프스타일</th>
                      <th className="px-5 py-3.5 text-right font-semibold">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1DFD8]">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-[#FAF9F5] transition-colors">
                        <td className="px-5 py-3 font-medium text-[#202521]">{product.name}</td>
                        <td className="px-5 py-3 text-[#59615B]">{product.brandId}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex bg-[#EDF0EC] border border-[#C9CEC9] px-2 py-0.5 rounded text-[11px] text-[#4F5751]">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {product.lifestyleCategory ? (
                            <span className="inline-flex bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[11px] text-slate-600">
                              {product.lifestyleCategory}
                            </span>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button 
                            onClick={() => setEditingProduct(product)}
                            className="text-[#59615B] hover:bg-slate-100 p-1.5 rounded-md transition-colors mr-1" 
                            title="상품 설정"
                          >
                            <Settings className="size-4" />
                          </button>
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
                <button onClick={() => setIsAddingProduct(true)} className="mt-3 text-sm font-semibold text-[#2F3B34] underline underline-offset-4">
                  첫 상품 등록하기
                </button>
              </div>
            )}
          </div>

          {/* Add/Edit Product Modal */}
          {(isAddingProduct || editingProduct) && (
            <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-[#D1D0C8] bg-[#F8F7F2] flex justify-between items-center shrink-0">
                  <h3 className="font-bold text-[#202521]">{editingProduct ? '상품 수정' : '새 상품 등록'}</h3>
                  <button onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="text-[#8B928C] hover:text-black">✕</button>
                </div>
                <div className="p-6 overflow-y-auto">
                  <form id="product-form" className="space-y-5" onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    const brandId = formData.get('brandId') as string;
                    const price = Number(formData.get('price'));
                    const lifestyle = formData.get('lifestyle') as string;
                    const selectedCats = formData.getAll('category') as string[];
                    
                    if (!name.trim() || selectedCats.length === 0) {
                      alert('상품명과 일반 카테고리를 최소 1개 이상 선택해주세요.');
                      return;
                    }

                    const newProd = {
                      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
                      name,
                      brandId,
                      price,
                      category: selectedCats.join(','),
                      lifestyleCategory: lifestyle || undefined,
                      rating: editingProduct ? editingProduct.rating : 0,
                      reviewCount: editingProduct ? editingProduct.reviewCount : 0,
                      petType: editingProduct ? editingProduct.petType : 'both',
                      ageGroup: editingProduct ? editingProduct.ageGroup : 'all',
                      concernTags: editingProduct ? editingProduct.concernTags : [],
                      image: editingProduct ? editingProduct.image : '/placeholder.png',
                      stock: editingProduct ? editingProduct.stock : 100
                    };

                    if (editingProduct) {
                      setLocalProducts(prev => prev.map(p => p.id === newProd.id ? { ...p, ...newProd } as any : p));
                    } else {
                      setLocalProducts(prev => [newProd as any, ...prev]);
                    }

                    setIsAddingProduct(false);
                    setEditingProduct(null);
                  }}>
                    <div>
                      <label className="block text-xs font-semibold text-[#59615B] mb-1.5">상품명 <span className="text-red-500">*</span></label>
                      <input name="name" type="text" defaultValue={editingProduct?.name || ''} className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm" placeholder="예: 시그니처 연어 사료 2kg" required />
                    </div>
                    
                    <div className="bg-[#F8F7F2] p-4 rounded-lg border border-[#D1D0C8]">
                      <label className="block text-xs font-bold text-[#202521] mb-2">일반 카테고리 (복수 선택 가능) <span className="text-red-500">*</span></label>
                      <div className="flex flex-wrap gap-2">
                        {productCats.map(c => {
                          const isDefaultChecked = editingProduct 
                            ? editingProduct.category.split(',').includes(c)
                            : (activeGroup === 'product' && activeCategory === c);
                          return (
                            <label key={c} className="inline-flex items-center gap-1.5 cursor-pointer bg-white px-2.5 py-1.5 rounded border border-[#D1D0C8] hover:border-[#2F3B34] transition-colors">
                              <input 
                                type="checkbox" 
                                name="category" 
                                value={c} 
                                defaultChecked={isDefaultChecked}
                                className="w-3.5 h-3.5 text-[#2F3B34] border-[#D1D0C8] focus:ring-[#2F3B34]" 
                              />
                              <span className="text-sm font-medium text-[#4F5751]">{c}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-[#59615B] mb-1.5">라이프스타일 카테고리</label>
                        <select name="lifestyle" className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm bg-white" defaultValue={editingProduct?.lifestyleCategory || (activeGroup === 'lifestyle' && activeCategory ? activeCategory : '')}>
                          <option value="">(해당 없음)</option>
                          {lifestyleCats.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#59615B] mb-1.5">브랜드명</label>
                        <input name="brandId" type="text" defaultValue={editingProduct?.brandId || ''} className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm" placeholder="브랜드 이름 입력" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-semibold text-[#59615B] mb-1.5">판매가 (원)</label>
                      <input name="price" type="number" defaultValue={editingProduct?.price || ''} className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm" placeholder="0" />
                    </div>
                  </form>
                </div>
                <div className="px-6 py-4 border-t border-[#D1D0C8] bg-slate-50 flex justify-end gap-2 shrink-0">
                  <button onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="px-4 py-2 text-sm font-medium text-[#59615B] bg-white border border-[#D1D0C8] rounded-md hover:bg-slate-50">취소</button>
                  <button type="submit" form="product-form" className="px-4 py-2 text-sm font-medium text-white bg-[#2F3B34] rounded-md hover:bg-[#1f2823]">
                    {editingProduct ? '수정 완료' : '등록 완료'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
