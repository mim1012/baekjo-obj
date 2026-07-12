'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Edit2, Plus, Trash2 } from 'lucide-react';
import ProductCard from '@/components/common/ProductCard';
import { SectionHeading } from '@/components/common/EditorialHeading';
import { getCurrentUser } from '@/lib/storage';
import { Product, Brand, User } from '@/types';

interface BrandProductsClientProps {
  brand: Brand;
  initialProducts: Product[];
  shortBrandName: string;
}

export default function BrandProductsClient({ brand, initialProducts, shortBrandName }: BrandProductsClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [user, setUser] = useState<User | null>(null);
  
  // Modals state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    // getCurrentUser 는 client-only(localStorage) 라 SSR 시엔 null — mount 후에만 채워야
    // hydration mismatch 가 없다(dad 동작 보존, DB 전환 PR에서 재작업 예정).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getCurrentUser());
  }, []);

  const hasAdminRights = user?.role === 'admin' || (user?.role === 'partner' && user.managedBrandIds?.includes(brand.id));

  const representativeProducts = products.filter((p) => brand.representativeProductIds.includes(p.id));
  const additionalProducts = products.filter((p) => !brand.representativeProductIds.includes(p.id));

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`'${name}' 상품을 삭제하시겠습니까?`)) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get('name') as string;
    const price = Number(formData.get('price'));
    const isRep = formData.get('isRepresentative') === 'on';

    if (!name.trim()) {
      alert('상품명을 입력해주세요.');
      return;
    }

    if (editingProduct) {
      setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, name, price } : p));
      // In a real app, we would also update the brand's representativeProductIds if isRep changed.
    } else {
      const newProd: Product = {
        id: `prod-${Date.now()}`,
        name,
        brandId: brand.id,
        price,
        category: '미분류',
        rating: 0,
        reviewCount: 0,
        stock: 100,
        isVisible: true,
        image: '',
        description: '설명이 없습니다.',
        concernTags: [],
        ingredients: '',
        howToUse: '',
        recommendedFor: [],
        caution: [],
        lifestyleCategory: '미분류',
        petType: 'both',
        ageGroup: 'all',
        isBest: false,
        isRecommended: false,
      };
      setProducts(prev => [newProd, ...prev]);
    }
    
    setIsAddingProduct(false);
    setEditingProduct(null);
  };

  return (
    <div id="brand-products" className="scroll-mt-24 space-y-20 pt-20">
      <section>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="먼저 만나볼 상품"
            title="이 브랜드에서 먼저 보여드리고 싶은 것들"
            description="브랜드의 방향을 잘 보여주는 상품부터 차분히 모았어요. 판매 준비 중인 상품은 현재 상태를 그대로 안내합니다."
          />
          <div className="flex flex-wrap items-center gap-3">
            {hasAdminRights && (
              <button 
                onClick={() => setIsAddingProduct(true)}
                className="btn-secondary shrink-0 self-start sm:self-auto border-[#17211D] bg-[#17211D] text-white hover:bg-[#202521] hover:text-white"
              >
                <Plus className="size-4" aria-hidden="true" />
                새 상품 등록
              </button>
            )}
            {products.length > 0 && (
              <Link href={`/shop?brandId=${brand.id}`} className="btn-secondary shrink-0 self-start sm:self-auto">
                쇼핑에서 모두 보기
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        {representativeProducts.length > 0 ? (
          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
            {representativeProducts.map((product) => (
              <div key={product.id} className="relative group">
                <ProductCard product={product} />
                {hasAdminRights && (
                  <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <button 
                      onClick={(e) => { e.preventDefault(); setEditingProduct(product); }}
                      className="flex size-8 items-center justify-center rounded-full bg-white/90 text-[#17211D] shadow-sm hover:bg-white backdrop-blur-sm"
                      title="수정"
                    >
                      <Edit2 className="size-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.preventDefault(); handleDelete(product.id, product.name); }}
                      className="flex size-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm hover:bg-red-50 backdrop-blur-sm"
                      title="삭제"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-3xl border border-dashed border-[#D8C4A3] bg-[#FAF8F3] px-6 py-12 text-center sm:py-16">
            <p className="break-keep text-base font-semibold text-[#17211D]">먼저 소개할 상품을 고르고 있어요.</p>
            <p className="mt-2 break-keep text-sm leading-6 text-[#6F766F]">상품 정보가 준비되는 대로 이곳에 차근차근 채워둘게요.</p>
          </div>
        )}
      </section>

      {additionalProducts.length > 0 && (
        <section>
          <SectionHeading
            eyebrow="조금 더 둘러보기"
            title={`${shortBrandName}의 다른 상품`}
            description="같은 마음으로 만든 다른 상품도 함께 살펴보세요."
          />
          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
            {additionalProducts.map((product) => (
              <div key={product.id} className="relative group">
                <ProductCard product={product} />
                {hasAdminRights && (
                  <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                    <button 
                      onClick={(e) => { e.preventDefault(); setEditingProduct(product); }}
                      className="flex size-8 items-center justify-center rounded-full bg-white/90 text-[#17211D] shadow-sm hover:bg-white backdrop-blur-sm"
                      title="수정"
                    >
                      <Edit2 className="size-4" />
                    </button>
                    <button 
                      onClick={(e) => { e.preventDefault(); handleDelete(product.id, product.name); }}
                      className="flex size-8 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-sm hover:bg-red-50 backdrop-blur-sm"
                      title="삭제"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Product Add/Edit Modal */}
      {(isAddingProduct || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17211D]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E7E0D5] bg-[#FAF8F3] px-6 py-4">
              <h3 className="text-lg font-bold text-[#17211D]">{editingProduct ? '상품 수정' : '새 상품 등록'}</h3>
              <button 
                onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
                className="text-[#8A918B] hover:text-[#17211D]"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#17211D]">상품명</label>
                  <input 
                    name="name" 
                    defaultValue={editingProduct?.name}
                    className="w-full rounded-lg border border-[#E7E0D5] px-4 py-2.5 text-sm focus:border-[#17211D] focus:outline-none" 
                    placeholder="상품명을 입력하세요"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-[#17211D]">판매가</label>
                  <input 
                    type="number" 
                    name="price" 
                    defaultValue={editingProduct?.price || ''}
                    className="w-full rounded-lg border border-[#E7E0D5] px-4 py-2.5 text-sm focus:border-[#17211D] focus:outline-none" 
                    placeholder="숫자만 입력"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    name="isRepresentative" 
                    id="isRepresentative"
                    defaultChecked={editingProduct ? brand.representativeProductIds.includes(editingProduct.id) : false}
                    className="size-4 rounded border-[#E7E0D5] text-[#17211D] focus:ring-[#17211D]"
                  />
                  <label htmlFor="isRepresentative" className="text-sm font-medium text-[#17211D]">
                    이 브랜드의 먼저 만나볼 상품(대표 상품)으로 설정
                  </label>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button" 
                    onClick={() => { setIsAddingProduct(false); setEditingProduct(null); }}
                    className="flex-1 rounded-full border border-[#E7E0D5] bg-white py-3 text-sm font-semibold text-[#17211D] hover:bg-[#FAF8F3]"
                  >
                    취소
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 rounded-full bg-[#17211D] py-3 text-sm font-semibold text-white hover:bg-[#202521]"
                  >
                    {editingProduct ? '수정 내용 저장' : '상품 등록'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
