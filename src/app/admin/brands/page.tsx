'use client';

import { useState } from 'react';
import { products as mockProducts } from '@/data/products';
import { brands as mockBrands } from '@/data/brands';
import { formatPrice } from '@/lib/format';
import { Plus, Trash2, Edit2, Search, Settings } from 'lucide-react';
import { Brand } from '@/types';

export default function AdminBrandsDashboard() {
  // Local state for brands (acts as categories in this dashboard)
  const [brands, setBrands] = useState<Brand[]>(mockBrands);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null); // null means 'All Brands'
  
  // Local state for products
  const [localProducts, setLocalProducts] = useState(mockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingBrand, setIsAddingBrand] = useState(false);

  const activeBrand = brands.find(b => b.id === activeBrandId);

  // Filter products by active brand
  const filteredProducts = localProducts.filter(p => {
    if (searchQuery && !p.name.includes(searchQuery)) return false;
    if (activeBrandId && p.brandId !== activeBrandId) return false;
    return true;
  });

  const handleDeleteBrand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('이 브랜드를 삭제하시겠습니까? 해당 브랜드의 상품들도 영향을 받습니다.')) {
      setBrands(prev => prev.filter(b => b.id !== id));
      if (activeBrandId === id) setActiveBrandId(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#D1D0C8] bg-white shrink-0">
        <p className="text-xs font-semibold text-[#697269]">DASHBOARD</p>
        <h1 className="mt-1 text-2xl font-normal text-[#202521]">브랜드 관리</h1>
        <p className="mt-1 text-sm text-[#737A74]">브랜드를 선택하고 해당 브랜드에 속한 상품들을 관리하세요.</p>
      </div>

      <div className="flex flex-1 min-h-0 bg-[#F4F2EC]">
        {/* Sidebar: Brands (Acting as categories) */}
        <div className="w-72 shrink-0 bg-white border-r border-[#D1D0C8] flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-[#D1D0C8] bg-[#F8F7F2] flex justify-between items-center">
            <h2 className="text-sm font-bold text-[#202521]">입점 브랜드 목록</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <button
              onClick={() => setActiveBrandId(null)}
              className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-2 ${
                activeBrandId === null ? 'bg-[#2F3B34] text-white' : 'text-[#4F5751] hover:bg-[#F0EEE8]'
              }`}
            >
              전체 브랜드 상품 <span className="float-right opacity-60 text-xs mt-0.5">{localProducts.length}</span>
            </button>
            
            {brands.map((brand) => (
              <div key={brand.id} className="group relative mb-1">
                <button
                  onClick={() => setActiveBrandId(brand.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors pr-16 ${
                    activeBrandId === brand.id ? 'bg-[#2F3B34] text-white' : 'text-[#4F5751] hover:bg-[#F0EEE8]'
                  }`}
                >
                  <span className="truncate block">{brand.name}</span>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 text-xs">
                    {localProducts.filter(p => p.brandId === brand.id).length}
                  </span>
                  
                  <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${activeBrandId === brand.id ? 'text-white' : 'text-[#4F5751]'}`}>
                    <span className="p-1 hover:bg-black/10 rounded cursor-pointer" title="브랜드 정보 수정"><Settings className="size-3" /></span>
                    <span onClick={(e) => handleDeleteBrand(brand.id, e)} className="p-1 hover:bg-black/10 rounded cursor-pointer text-red-400" title="브랜드 삭제"><Trash2 className="size-3" /></span>
                  </div>
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[#D1D0C8] bg-[#F8F7F2]">
            <button 
              onClick={() => setIsAddingBrand(true)}
              className="w-full bg-[#2F3B34] text-white p-2 rounded-md hover:bg-[#1f2823] transition-colors text-sm font-semibold flex items-center justify-center gap-1"
            >
              <Plus className="size-4" /> 새 브랜드 등록
            </button>
          </div>
        </div>

        {/* Main Content: Products of the Brand */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div className="p-6 pb-4 shrink-0 flex flex-col gap-4">
            {/* Brand Management Panel */}
            {activeBrand ? (
              <div className="bg-white border border-[#D1D0C8] rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-lg border border-[#E1DFD8] bg-slate-50 flex items-center justify-center text-2xl font-bold text-slate-300">
                      {activeBrand.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-[#202521]">{activeBrand.name}</h2>
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                          {activeBrand.auditGrade} 등급
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-[#59615B] line-clamp-1 max-w-lg">
                        {activeBrand.description || '브랜드 설명이 없습니다.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 text-sm font-medium bg-[#F0EEE8] text-[#4F5751] rounded hover:bg-[#E1DFD8] transition-colors flex items-center gap-1.5">
                      <Settings className="size-3.5" /> 정보 수정
                    </button>
                    <button 
                      onClick={(e) => handleDeleteBrand(activeBrand.id, e)}
                      className="px-3 py-1.5 text-sm font-medium bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="size-3.5" /> 삭제
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-[#202521]">전체 브랜드 소속 상품</h2>
                <p className="mt-1 text-sm text-[#737A74]">모든 브랜드의 상품을 모아봅니다.</p>
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
                  {activeBrand ? `'${activeBrand.name}'에 상품 추가` : '새 상품 추가'}
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
                      <th className="px-5 py-3.5 font-semibold">카테고리</th>
                      <th className="px-5 py-3.5 font-semibold">판매가</th>
                      <th className="px-5 py-3.5 text-right font-semibold">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E1DFD8]">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-[#FAF9F5] transition-colors">
                        <td className="px-5 py-3 font-medium text-[#202521]">{product.name}</td>
                        <td className="px-5 py-3 text-[#59615B] font-semibold">{brands.find(b => b.id === product.brandId)?.name || product.brandId}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex bg-[#EDF0EC] border border-[#C9CEC9] px-2 py-0.5 rounded text-[11px] text-[#4F5751]">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-5 py-3 tabular-nums text-[#4F5751]">
                          {product.price !== null && product.price !== undefined ? formatPrice(product.salePrice || product.price) : '-'}
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
                  첫 상품 추가하기
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
                  <form id="brand-product-form" className="space-y-4" onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    const brandId = formData.get('brandId') as string;
                    const price = Number(formData.get('price'));
                    
                    if (!name.trim()) {
                      alert('상품명을 입력해주세요.');
                      return;
                    }

                    const newProd = {
                      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
                      name,
                      brandId,
                      price,
                      category: editingProduct ? editingProduct.category : '미분류',
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
                      <input name="name" type="text" defaultValue={editingProduct?.name || ''} className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm" placeholder="상품 이름" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#59615B] mb-1.5">소속 브랜드 지정 <span className="text-red-500">*</span></label>
                      <select name="brandId" className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm bg-white" defaultValue={editingProduct?.brandId || activeBrandId || ''} required>
                        <option value="" disabled>브랜드 선택...</option>
                        {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                      <p className="text-[11px] text-[#8B928C] mt-1">상품이 소속될 브랜드를 선택합니다.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#59615B] mb-1.5">판매가 (원)</label>
                      <input name="price" type="number" defaultValue={editingProduct?.price || ''} className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm" placeholder="0" />
                    </div>
                  </form>
                </div>
                <div className="px-6 py-4 border-t border-[#D1D0C8] bg-slate-50 flex justify-end gap-2 shrink-0">
                  <button onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }} className="px-4 py-2 text-sm font-medium text-[#59615B] bg-white border border-[#D1D0C8] rounded-md hover:bg-slate-50">취소</button>
                  <button type="submit" form="brand-product-form" className="px-4 py-2 text-sm font-medium text-white bg-[#2F3B34] rounded-md hover:bg-[#1f2823]">
                    {editingProduct ? '수정 완료' : '등록 완료'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add Brand Modal */}
          {isAddingBrand && (
            <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-[#D1D0C8] bg-[#F8F7F2] flex justify-between items-center">
                  <h3 className="font-bold text-[#202521]">새 브랜드 등록</h3>
                  <button onClick={() => setIsAddingBrand(false)} className="text-[#8B928C] hover:text-black">✕</button>
                </div>
                <div className="p-6 overflow-y-auto">
                  <form id="add-brand-form" className="space-y-4" onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const name = formData.get('name') as string;
                    const grade = formData.get('grade') as string;
                    
                    if (!name.trim()) return;
                    
                    const newBrand: Brand = {
                      id: `brand-${Date.now()}`,
                      name,
                      description: '새로 등록된 브랜드입니다.',
                      auditGrade: grade,
                      representativeProductIds: [],
                      isRecommended: false,
                      isNew: true,
                    };
                    
                    setBrands(prev => [...prev, newBrand]);
                    setIsAddingBrand(false);
                    setActiveBrandId(newBrand.id);
                  }}>
                    <div>
                      <label className="block text-xs font-semibold text-[#59615B] mb-1.5">브랜드명 <span className="text-red-500">*</span></label>
                      <input name="name" type="text" className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm" placeholder="예: 백조오브제" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#59615B] mb-1.5">검증 등급</label>
                      <select name="grade" className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm bg-white">
                        <option value="A+">A+ 등급</option>
                        <option value="A">A 등급</option>
                        <option value="B">B 등급</option>
                      </select>
                    </div>
                  </form>
                </div>
                <div className="px-6 py-4 border-t border-[#D1D0C8] bg-slate-50 flex justify-end gap-2">
                  <button onClick={() => setIsAddingBrand(false)} className="px-4 py-2 text-sm font-medium text-[#59615B] bg-white border border-[#D1D0C8] rounded-md hover:bg-slate-50">취소</button>
                  <button type="submit" form="add-brand-form" className="px-4 py-2 text-sm font-medium text-white bg-[#2F3B34] rounded-md hover:bg-[#1f2823]">브랜드 생성</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
