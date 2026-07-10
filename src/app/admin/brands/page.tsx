'use client';

import { useEffect, useState } from 'react';
import {
  getAdminProducts,
  getAdminBrands,
  createProduct,
  deleteProduct,
  createBrand,
  updateBrand,
  deleteBrand,
} from '@/lib/storage';
import { formatPrice } from '@/lib/format';
import { Plus, Trash2, Edit2, Search, Settings } from 'lucide-react';
import { Brand, Product } from '@/types';

interface ProductFormState {
  name: string;
  category: string;
  brandId: string;
}

interface BrandFormState {
  name: string;
  auditGrade: Brand['auditGrade'];
  description: string;
  philosophy: string;
}

const emptyProductForm: ProductFormState = { name: '', category: '', brandId: '' };
const emptyBrandForm: BrandFormState = { name: '', auditGrade: 'A+', description: '', philosophy: '' };

export default function AdminBrandsDashboard() {
  // 브랜드·상품은 서버(관리자)에서 비동기로 불러온다(§4 콘센트 — 컴포넌트에서 fetch 직접 금지).
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeBrandId, setActiveBrandId] = useState<string | null>(null); // null means 'All Brands'
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [brandForm, setBrandForm] = useState<BrandFormState>(emptyBrandForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getAdminBrands(), getAdminProducts()]).then(([brandList, productList]) => {
      if (cancelled) return;
      setBrands(brandList);
      setProducts(productList);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeBrand = brands.find(b => b.id === activeBrandId);

  // Filter products by active brand
  const filteredProducts = products.filter(p => {
    if (searchQuery && !p.name.includes(searchQuery)) return false;
    if (activeBrandId && p.brandId !== activeBrandId) return false;
    return true;
  });

  const handleDeleteBrand = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('이 브랜드를 삭제하시겠습니까? 해당 브랜드의 상품들도 영향을 받습니다.')) return;
    const before = brands;
    setBrands((prev) => prev.filter((b) => b.id !== id));
    if (activeBrandId === id) setActiveBrandId(null);
    const { error } = await deleteBrand(id);
    if (error) {
      alert('브랜드 삭제에 실패했습니다.');
      setBrands(before);
    }
  };

  const openAddProductModal = () => {
    setProductForm({ name: '', category: '', brandId: activeBrandId || brands[0]?.id || '' });
    setIsAddingProduct(true);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`'${product.name}' 상품을 삭제하시겠습니까?`)) return;
    const before = products;
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    const { error } = await deleteProduct(product.id);
    if (error) {
      alert('상품 삭제에 실패했습니다.');
      setProducts(before);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name.trim() || !productForm.brandId || !productForm.category.trim()) {
      alert('상품명, 브랜드, 카테고리는 필수입니다.');
      return;
    }
    setSaving(true);
    const brandName = brands.find((b) => b.id === productForm.brandId)?.name;
    const { product, error } = await createProduct({
      name: productForm.name.trim(),
      brandId: productForm.brandId,
      brandName,
      category: productForm.category.trim(),
      lifestyleCategory: productForm.category.trim(),
      price: null,
      rating: 0,
      reviewCount: 0,
      concernTags: [],
      petType: 'both',
      ageGroup: 'all',
      // 이미지 업로드는 이번 범위 밖 — 플레이스홀더 아이콘으로 등록 후 추후 교체.
      image: '/images/icon-product.svg',
      stock: 0,
      description: productForm.name.trim(),
      isBest: false,
      isRecommended: false,
    });
    setSaving(false);
    if (error || !product) {
      alert('상품 등록에 실패했습니다.');
      return;
    }
    setProducts((prev) => [product, ...prev]);
    setIsAddingProduct(false);
  };

  const openAddBrandModal = () => {
    setBrandForm(emptyBrandForm);
    setEditingBrand(null);
    setIsAddingBrand(true);
  };

  const openEditBrandModal = (brand: Brand, e: React.MouseEvent) => {
    e.stopPropagation();
    setBrandForm({
      name: brand.name,
      auditGrade: brand.auditGrade,
      description: brand.description,
      philosophy: brand.philosophy,
    });
    setEditingBrand(brand);
    setIsAddingBrand(true);
  };

  const handleSubmitBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim() || !brandForm.description.trim() || !brandForm.philosophy.trim()) {
      alert('브랜드명, 소개, 철학은 필수입니다.');
      return;
    }
    setSaving(true);

    if (editingBrand) {
      const { brand, error } = await updateBrand(editingBrand.id, {
        name: brandForm.name.trim(),
        auditGrade: brandForm.auditGrade,
        description: brandForm.description.trim(),
        philosophy: brandForm.philosophy.trim(),
      });
      setSaving(false);
      if (error || !brand) {
        alert('브랜드 수정에 실패했습니다.');
        return;
      }
      setBrands((prev) => prev.map((b) => (b.id === brand.id ? brand : b)));
      setIsAddingBrand(false);
      setEditingBrand(null);
      return;
    }

    const { brand, error } = await createBrand({
      name: brandForm.name.trim(),
      // 로고 업로드는 이번 범위 밖 — 플레이스홀더 아이콘으로 등록 후 추후 교체.
      logo: '/images/icon-product.svg',
      description: brandForm.description.trim(),
      philosophy: brandForm.philosophy.trim(),
      auditGrade: brandForm.auditGrade,
      auditPoints: [],
      representativeProductIds: [],
      relatedConcernSlugs: [],
      isRecommended: false,
    });
    setSaving(false);
    if (error || !brand) {
      alert('브랜드 생성에 실패했습니다.');
      return;
    }
    setBrands((prev) => [brand, ...prev]);
    setIsAddingBrand(false);
  };

  if (loading) {
    return <p className="p-12 text-center text-sm text-[#7B827C]">브랜드 목록 불러오는 중…</p>;
  }

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
              전체 브랜드 상품 <span className="float-right opacity-60 text-xs mt-0.5">{products.length}</span>
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
                    {products.filter(p => p.brandId === brand.id).length}
                  </span>

                  <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${activeBrandId === brand.id ? 'text-white' : 'text-[#4F5751]'}`}>
                    <span onClick={(e) => openEditBrandModal(brand, e)} className="p-1 hover:bg-black/10 rounded cursor-pointer" title="브랜드 정보 수정"><Settings className="size-3" /></span>
                    <span onClick={(e) => handleDeleteBrand(brand.id, e)} className="p-1 hover:bg-black/10 rounded cursor-pointer text-red-400" title="브랜드 삭제"><Trash2 className="size-3" /></span>
                  </div>
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-[#D1D0C8] bg-[#F8F7F2]">
            <button
              onClick={openAddBrandModal}
              className="w-full bg-[#2F3B34] text-white p-2 rounded-md hover:bg-[#1f2823] transition-colors text-sm font-semibold flex items-center justify-center gap-1"
            >
              <Plus className="size-4" /> 새 브랜드 등록
            </button>
          </div>
        </div>

        {/* Main Content: Products of the Brand */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <div className="p-6 pb-4 shrink-0 flex flex-col gap-4">
            {/* 브랜드 관리 패널 — 활성 브랜드가 있을 때만 노출 */}
            {activeBrand ? (
              <div className="bg-white border border-[#D1D0C8] rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 items-center min-w-0">
                    <div className="w-16 h-16 shrink-0 rounded-lg border border-[#E1DFD8] bg-slate-50 flex items-center justify-center text-2xl font-bold text-slate-300">
                      {activeBrand.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
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
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => openEditBrandModal(activeBrand, e)}
                      className="px-3 py-1.5 text-sm font-medium bg-[#F0EEE8] text-[#4F5751] rounded hover:bg-[#E1DFD8] transition-colors flex items-center gap-1.5"
                    >
                      <Settings className="size-3.5" /> 정보 수정
                    </button>
                    <button
                      type="button"
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
                  onClick={openAddProductModal}
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
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-left text-sm">
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
                            <button className="text-[#59615B] hover:bg-slate-100 p-1.5 rounded-md transition-colors mr-1" title="상품 설정">
                              <Settings className="size-4" />
                            </button>
                            <button className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="상품 삭제" onClick={() => handleDeleteProduct(product)}>
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
                <button onClick={openAddProductModal} className="mt-3 text-sm font-semibold text-[#2F3B34] underline underline-offset-4">
                  첫 상품 추가하기
                </button>
              </div>
            )}
          </div>

          {/* Add Product Modal */}
          {isAddingProduct && (
            <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
              <form onSubmit={handleCreateProduct} className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-[#D1D0C8] bg-[#F8F7F2] flex justify-between items-center shrink-0">
                  <h3 className="font-bold text-[#202521]">새 상품 등록</h3>
                  <button type="button" onClick={() => setIsAddingProduct(false)} className="text-[#8B928C] hover:text-black">✕</button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                  <div>
                    <label className="block text-xs font-semibold text-[#59615B] mb-1.5">상품명</label>
                    <input
                      type="text"
                      required
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm"
                      placeholder="상품 이름"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#59615B] mb-1.5">카테고리</label>
                    <input
                      type="text"
                      required
                      value={productForm.category}
                      onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                      className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm"
                      placeholder="예: 식사와 영양"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#59615B] mb-1.5">소속 브랜드 지정</label>
                    <select
                      required
                      value={productForm.brandId}
                      onChange={(e) => setProductForm({ ...productForm, brandId: e.target.value })}
                      className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm bg-white"
                    >
                      <option value="" disabled>브랜드 선택...</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                    <p className="text-[11px] text-[#8B928C] mt-1">현재 활성화된 브랜드로 기본 선택됩니다.</p>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-[#D1D0C8] bg-slate-50 flex justify-end gap-2 shrink-0">
                  <button type="button" onClick={() => setIsAddingProduct(false)} className="px-4 py-2 text-sm font-medium text-[#59615B] bg-white border border-[#D1D0C8] rounded-md hover:bg-slate-50">취소</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-[#2F3B34] rounded-md hover:bg-[#1f2823] disabled:opacity-60">
                    {saving ? '저장 중…' : '등록 완료'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Add/Edit Brand Modal */}
          {isAddingBrand && (
            <div className="absolute inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
              <form onSubmit={handleSubmitBrand} className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-[#D1D0C8] bg-[#F8F7F2] flex justify-between items-center shrink-0">
                  <h3 className="font-bold text-[#202521]">{editingBrand ? '브랜드 수정' : '새 브랜드 등록'}</h3>
                  <button type="button" onClick={() => { setIsAddingBrand(false); setEditingBrand(null); }} className="text-[#8B928C] hover:text-black">✕</button>
                </div>
                <div className="p-6 space-y-4 overflow-y-auto">
                  <div>
                    <label className="block text-xs font-semibold text-[#59615B] mb-1.5">브랜드명</label>
                    <input
                      type="text"
                      required
                      value={brandForm.name}
                      onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                      className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm"
                      placeholder="예: 백조오브제"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#59615B] mb-1.5">검증 등급</label>
                    <select
                      value={brandForm.auditGrade}
                      onChange={(e) => setBrandForm({ ...brandForm, auditGrade: e.target.value as Brand['auditGrade'] })}
                      className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm bg-white"
                    >
                      <option value="A+">A+ 등급</option>
                      <option value="A">A 등급</option>
                      <option value="B+">B+ 등급</option>
                      <option value="B">B 등급</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#59615B] mb-1.5">브랜드 소개</label>
                    <textarea
                      required
                      rows={2}
                      value={brandForm.description}
                      onChange={(e) => setBrandForm({ ...brandForm, description: e.target.value })}
                      className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm"
                      placeholder="브랜드관 상단에 노출될 한두 줄 소개"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#59615B] mb-1.5">브랜드 철학</label>
                    <textarea
                      required
                      rows={3}
                      value={brandForm.philosophy}
                      onChange={(e) => setBrandForm({ ...brandForm, philosophy: e.target.value })}
                      className="w-full border border-[#D1D0C8] rounded-md px-3 py-2 text-sm"
                      placeholder="브랜드 철학 / 스토리"
                    />
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-[#D1D0C8] bg-slate-50 flex justify-end gap-2 shrink-0">
                  <button type="button" onClick={() => { setIsAddingBrand(false); setEditingBrand(null); }} className="px-4 py-2 text-sm font-medium text-[#59615B] bg-white border border-[#D1D0C8] rounded-md hover:bg-slate-50">취소</button>
                  <button type="submit" disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-[#2F3B34] rounded-md hover:bg-[#1f2823] disabled:opacity-60">
                    {saving ? '저장 중…' : editingBrand ? '수정 완료' : '브랜드 생성'}
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
