'use client';

import { useEffect, useState } from 'react';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';
import {
  getAdminProducts,
  getAdminBrands,
  createProduct,
  updateProduct,
  deleteProduct,
} from '@/lib/storage';
import { formatPrice } from '@/lib/format';
import { Plus, Trash2, Edit2, Search, Settings } from 'lucide-react';
import type { Brand, Product } from '@/types';

interface ProductFormState {
  name: string;
  brandId: string;
  category: string;
  lifestyleCategory: string;
  price: string;
}

const emptyForm: ProductFormState = { name: '', brandId: '', category: '', lifestyleCategory: '', price: '' };

export default function AdminProductsDashboard() {
  const { categorySettings, updateCategorySettings } = useCategorySettings();
  const [activeCategory, setActiveCategory] = useState<string | null>(null); // null means 'All'
  const [activeGroup, setActiveGroup] = useState<'product' | 'lifestyle' | 'brand'>('product');

  // Local state for categories
  const [productCats, setProductCats] = useState<string[]>(categorySettings.productCategories);
  const [lifestyleCats, setLifestyleCats] = useState<string[]>(categorySettings.lifestyleCategories);
  // 관리자가 카테고리를 편집하기 시작하면(dirty) provider 하이드레이트가 편집 내용을 덮지 않도록 막는다.
  const [dirty, setDirty] = useState(false);

  // provider 가 GET /api/category-settings 로 실제 저장값을 받아오면(첫 마운트/하드 리로드) 로컬
  // 카테고리를 그 값에 맞춘다. 단 이미 편집 중(dirty)이면 편집 내용을 덮지 않는다.
  useEffect(() => {
    if (dirty) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProductCats(categorySettings.productCategories);
    setLifestyleCats(categorySettings.lifestyleCategories);
  }, [categorySettings, dirty]);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  // 상품·브랜드는 서버(관리자)에서 비동기로 불러온다(§4 콘센트 — 컴포넌트에서 fetch 직접 금지).
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Add/Edit product modal state
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAdminProducts(), getAdminBrands()]).then(([productList, brandList]) => {
      if (cancelled) return;
      setProducts(productList);
      setBrands(brandList);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSaveCategories = async (newCats: string[], type: 'product' | 'lifestyle') => {
    setDirty(true);
    if (type === 'product') {
      const prev = productCats;
      setProductCats(newCats);
      const ok = await updateCategorySettings({ ...categorySettings, productCategories: newCats });
      if (!ok) {
        setProductCats(prev);
        alert('카테고리 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      } else {
        setDirty(false);
      }
    } else {
      const prev = lifestyleCats;
      setLifestyleCats(newCats);
      const ok = await updateCategorySettings({ ...categorySettings, lifestyleCategories: newCats });
      if (!ok) {
        setLifestyleCats(prev);
        alert('카테고리 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      } else {
        setDirty(false);
      }
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
  const filteredProducts = products.filter(p => {
    if (searchQuery && !p.name.includes(searchQuery)) return false;
    if (activeCategory) {
      if (activeGroup === 'product' && p.category !== activeCategory) return false;
      if (activeGroup === 'lifestyle' && p.lifestyleCategory !== activeCategory) return false;
      // brand 모드: activeCategory 는 브랜드 id 를 담는다(§ 이중 의미 주의).
      if (activeGroup === 'brand' && p.brandId !== activeCategory) return false;
    }
    return true;
  });

  // 카테고리 관리 패널(선택된 카테고리의 사이드바 내 인덱스 — 이름수정/삭제 버튼에 재사용)
  // 카테고리 관리 함수는 'product' | 'lifestyle' 만 받는다. brand 모드에서는 카테고리 UI 가
  // 렌더되지 않지만, 콜백에 넘길 좁혀진 그룹값이 필요하므로 여기서 브랜드를 product 로 접는다.
  const categoryGroup: 'product' | 'lifestyle' = activeGroup === 'lifestyle' ? 'lifestyle' : 'product';
  const activeCategoryList = activeGroup === 'product' ? productCats : lifestyleCats;
  const activeCategoryIndex = activeCategory ? activeCategoryList.indexOf(activeCategory) : -1;

  // brand 모드에서 선택된 업체 이름(라벨/헤더 표기용). activeCategory 는 브랜드 id.
  const selectedBrandName =
    activeGroup === 'brand' && activeCategory
      ? brands.find((b) => b.id === activeCategory)?.name ?? null
      : null;

  const openAddModal = () => {
    setForm({
      name: '',
      brandId: activeGroup === 'brand' && activeCategory ? activeCategory : (brands[0]?.id ?? ''),
      category: activeGroup === 'product' && activeCategory ? activeCategory : (productCats[0] ?? ''),
      lifestyleCategory: activeGroup === 'lifestyle' && activeCategory ? activeCategory : '',
      price: '',
    });
    setEditingProduct(null);
    setIsAddingProduct(true);
  };

  const openEditModal = (product: Product) => {
    setForm({
      name: product.name,
      brandId: product.brandId,
      category: product.category,
      lifestyleCategory: product.lifestyleCategory ?? '',
      price: product.price !== null && product.price !== undefined ? String(product.price) : '',
    });
    setEditingProduct(product);
    setIsAddingProduct(true);
  };

  const closeModal = () => {
    setIsAddingProduct(false);
    setEditingProduct(null);
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`'${product.name}' 상품을 삭제하시겠습니까?`)) return;
    const before = products;
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    const { error } = await deleteProduct(product.id);
    if (error) {
      alert('상품 삭제에 실패했습니다.');
      setProducts(before);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.brandId || !form.category) {
      alert('상품명, 브랜드, 카테고리는 필수입니다.');
      return;
    }
    setSaving(true);
    const brandName = brands.find((b) => b.id === form.brandId)?.name;
    const price = form.price.trim() ? Number(form.price) : null;

    if (editingProduct) {
      const { product, error } = await updateProduct(editingProduct.id, {
        name: form.name.trim(),
        brandId: form.brandId,
        brandName,
        category: form.category,
        lifestyleCategory: form.lifestyleCategory || form.category,
        price,
      });
      setSaving(false);
      if (error || !product) {
        alert('상품 수정에 실패했습니다.');
        return;
      }
      setProducts((prev) => prev.map((p) => (p.id === product.id ? product : p)));
      closeModal();
      return;
    }

    const { product, error } = await createProduct({
      name: form.name.trim(),
      brandId: form.brandId,
      brandName,
      category: form.category,
      lifestyleCategory: form.lifestyleCategory || form.category,
      price,
      rating: 0,
      reviewCount: 0,
      concernTags: [],
      petType: 'both',
      ageGroup: 'all',
      // 이미지 업로드는 이번 범위 밖 — 플레이스홀더 아이콘으로 등록 후 추후 교체.
      image: '/images/icon-product.svg',
      stock: 0,
      description: form.name.trim(),
      isBest: false,
      isRecommended: false,
    });
    setSaving(false);
    if (error || !product) {
      alert('상품 등록에 실패했습니다.');
      return;
    }
    setProducts((prev) => [product, ...prev]);
    closeModal();
  };

  if (loading) {
    return <p className="p-12 text-center text-sm text-[#7B827C]">상품 목록 불러오는 중…</p>;
  }

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
            <button
              onClick={() => { setActiveGroup('brand'); setActiveCategory(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-colors ${activeGroup === 'brand' ? 'bg-white shadow-sm text-[#202521]' : 'text-slate-500 hover:text-slate-700'}`}
            >
              업체
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-2 ${
                activeCategory === null ? 'bg-[#2F3B34] text-white' : 'text-[#4F5751] hover:bg-[#F0EEE8]'
              }`}
            >
              전체 보기 <span className="float-right opacity-60 text-xs mt-0.5">{products.length}</span>
            </button>

            {activeGroup === 'brand' ? (
              brands.map((brand) => (
                <div key={brand.id} className="group relative mb-1">
                  <button
                    onClick={() => setActiveCategory(brand.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors pr-16 ${
                      activeCategory === brand.id ? 'bg-[#2F3B34] text-white' : 'text-[#4F5751] hover:bg-[#F0EEE8]'
                    }`}
                  >
                    <span className="truncate block">{brand.name}</span>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 text-xs">
                      {products.filter(p => p.brandId === brand.id).length}
                    </span>
                  </button>
                </div>
              ))
            ) : (
              (activeGroup === 'product' ? productCats : lifestyleCats).map((cat, idx) => (
              <div key={idx} className="group relative mb-1">
                {editingIndex === idx ? (
                  <div className="flex items-center px-2 py-1.5 bg-[#F0EEE8] rounded-md">
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onBlur={() => saveEditCategory(categoryGroup)}
                      onKeyDown={e => e.key === 'Enter' && saveEditCategory(categoryGroup)}
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
                      {products.filter(p => activeGroup === 'product' ? p.category === cat : p.lifestyleCategory === cat).length}
                    </span>

                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${activeCategory === cat ? 'text-white' : 'text-[#4F5751]'}`}>
                      <span onClick={(e) => startEditCategory(idx, categoryGroup, e)} className="p-1 hover:bg-black/10 rounded cursor-pointer"><Edit2 className="size-3" /></span>
                      <span onClick={(e) => handleDeleteCategory(idx, categoryGroup, e)} className="p-1 hover:bg-black/10 rounded cursor-pointer text-red-400"><Trash2 className="size-3" /></span>
                    </div>
                  </button>
                )}
              </div>
            )))}
          </div>

          {activeGroup !== 'brand' && (
          <div className="p-4 border-t border-[#D1D0C8] bg-[#F8F7F2]">
            <form onSubmit={(e) => handleAddCategory(e, categoryGroup)} className="flex gap-2">
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
          )}
        </div>

        {/* Main Content: Products */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div className="p-6 pb-4 shrink-0 flex flex-col gap-4">
            {/* brand 모드: 업체 헤더만 노출(카테고리 관리 없음) */}
            {activeGroup === 'brand' && selectedBrandName ? (
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#202521]">{selectedBrandName}</h2>
                  <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-[#F0EEE8] text-[#4F5751]">업체</span>
                </div>
                <p className="mt-1 text-sm text-[#59615B]">해당 업체의 상품을 등록·수정·삭제할 수 있습니다.</p>
              </div>
            ) : /* 카테고리 관리 패널 — 선택된 카테고리가 있을 때만 노출 */
            activeCategory && activeGroup !== 'brand' ? (
              <div className="bg-white border border-[#D1D0C8] rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-[#202521]">{activeCategory}</h2>
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-bold bg-[#F0EEE8] text-[#4F5751]">
                        {activeGroup === 'product' ? '일반 상품 카테고리' : '라이프스타일 카테고리'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#59615B]">해당 카테고리의 이름을 수정하거나 삭제할 수 있습니다.</p>
                  </div>
                  {activeCategoryIndex !== -1 && (
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => startEditCategory(activeCategoryIndex, activeGroup, e)}
                        className="px-3 py-1.5 text-sm font-medium bg-[#F0EEE8] text-[#4F5751] rounded hover:bg-[#E1DFD8] transition-colors flex items-center gap-1.5"
                      >
                        <Edit2 className="size-3.5" /> 이름 수정
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCategory(activeCategoryIndex, activeGroup, e)}
                        className="px-3 py-1.5 text-sm font-medium bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors flex items-center gap-1.5"
                      >
                        <Trash2 className="size-3.5" /> 삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-bold text-[#202521]">전체 상품 목록</h2>
                <p className="mt-1 text-sm text-[#737A74]">모든 상품을 한눈에 관리합니다.</p>
              </div>
            )}

            <div className="flex items-end justify-between gap-4">
              <p className="text-sm font-medium text-[#59615B]">
                총 <span className="font-bold text-[#202521]">{filteredProducts.length}</span>개의 상품
              </p>
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
                  onClick={openAddModal}
                  className="flex items-center gap-2 bg-[#2F3B34] px-4 py-2 text-sm font-semibold text-white rounded-full hover:bg-[#1f2823] transition-colors shadow-sm"
                >
                  <Plus className="size-4" />
                  {activeGroup === 'brand'
                    ? (selectedBrandName ? `'${selectedBrandName}'에 상품 등록` : '새 상품 등록')
                    : (activeCategory ? `'${activeCategory}'에 상품 등록` : '새 상품 등록')}
                </button>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {filteredProducts.length > 0 ? (
              <div className="bg-white border border-[#D1D0C8] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead className="bg-[#F0EEE8] text-xs text-[#697069] border-b border-[#D1D0C8]">
                      <tr>
                        <th className="px-5 py-3.5 font-semibold">상품명</th>
                        <th className="px-5 py-3.5 font-semibold">브랜드</th>
                        <th className="px-5 py-3.5 font-semibold">일반 카테고리</th>
                        <th className="px-5 py-3.5 font-semibold">라이프스타일</th>
                        <th className="px-5 py-3.5 font-semibold">판매가</th>
                        <th className="px-5 py-3.5 text-right font-semibold">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E1DFD8]">
                      {filteredProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-[#FAF9F5] transition-colors">
                          <td className="px-5 py-3 font-medium text-[#202521]">{product.name}</td>
                          <td className="px-5 py-3 text-[#59615B]">{product.brandName ?? product.brandId}</td>
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
                          <td className="px-5 py-3 tabular-nums text-[#4F5751]">
                            {formatPrice(product.salePrice ?? product.price ?? 0)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button onClick={() => openEditModal(product)} className="text-[#59615B] hover:bg-slate-100 p-1.5 rounded-md transition-colors mr-1" title="상품 설정">
                              <Settings className="size-4" />
                            </button>
                            <button className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="상품 삭제" onClick={() => handleDelete(product)}>
                              <Trash2 className="size-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-[#D1D0C8] rounded-xl bg-white/50 text-[#7B827C]">
                <p>해당하는 상품이 없습니다.</p>
                <button onClick={openAddModal} className="mt-3 text-sm font-semibold text-[#2F3B34] underline underline-offset-4">
                  첫 상품 등록하기
                </button>
              </div>
            )}
          </div>

          {/* Add/Edit Product Modal */}
          {isAddingProduct && (
            <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
              <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-[#D1D0C8] bg-[#F8F7F2] flex justify-between items-center shrink-0">
                  <h3 className="font-bold text-[#202521]">{editingProduct ? '상품 수정' : '새 상품 등록'}</h3>
                  <button type="button" onClick={closeModal} className="text-[#8B928C] hover:text-black">✕</button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                  <div>
                    <label className="block text-xs font-semibold text-[#59615B] mb-1.5">상품명</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm"
                      placeholder="예: 시그니처 연어 사료 2kg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#59615B] mb-1.5">브랜드</label>
                    <select
                      required
                      value={form.brandId}
                      onChange={(e) => setForm({ ...form, brandId: e.target.value })}
                      className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm bg-white"
                    >
                      <option value="" disabled>선택...</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#59615B] mb-1.5">일반 카테고리</label>
                      <select
                        required
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm bg-white"
                      >
                        <option value="" disabled>선택...</option>
                        {productCats.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#59615B] mb-1.5">라이프스타일 카테고리</label>
                      <select
                        value={form.lifestyleCategory}
                        onChange={(e) => setForm({ ...form, lifestyleCategory: e.target.value })}
                        className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm bg-white"
                      >
                        <option value="">(없음)</option>
                        {lifestyleCats.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#59615B] mb-1.5">판매가(원, 비우면 0원 표시)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm"
                      placeholder="예: 32000"
                    />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-[#D1D0C8] bg-slate-50 flex justify-end gap-2 shrink-0">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-[#59615B] bg-white border border-[#D1D0C8] rounded-md hover:bg-slate-50">취소</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-[#2F3B34] rounded-md hover:bg-[#1f2823] disabled:opacity-60">
                    {saving ? '저장 중…' : editingProduct ? '수정 완료' : '등록 완료'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
