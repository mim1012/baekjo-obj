'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GripVertical, Eye, EyeOff, Search } from 'lucide-react';
import type { Product, Brand } from '@/types';
import { updateProduct } from '@/lib/storage';

import PageHeader from '@/components/admin-new/common/PageHeader';
import SaveBar from '@/components/admin-new/common/SaveBar';

interface ProductDisplayManagerProps {
  initialProducts: Product[];
  brands: Brand[];
}

type TabType = 'best' | 'recommended' | 'visible';

export default function ProductDisplayManager({ initialProducts, brands }: ProductDisplayManagerProps) {
  const router = useRouter();
  
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [activeTab, setActiveTab] = useState<TabType>('best');
  const [keyword, setKeyword] = useState('');
  
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, Partial<Product>>>({});
  const [isSaving, setIsSaving] = useState(false);

  // 현재 탭에 맞는 리스트 (수정 중인 상태 반영)
  const displayProducts = products.map(p => {
    const updates = pendingUpdates[p.id] || {};
    return { ...p, ...updates };
  });

  const getFilteredProducts = () => {
    let filtered = displayProducts;

    if (activeTab === 'best') filtered = filtered.filter(p => p.isBest);
    if (activeTab === 'recommended') filtered = filtered.filter(p => p.isRecommended);
    if (activeTab === 'visible') filtered = filtered.filter(p => p.isVisible);

    if (keyword) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(keyword.toLowerCase()));
    }

    return filtered;
  };

  const getAvailableProducts = () => {
    let available = displayProducts;

    if (activeTab === 'best') available = available.filter(p => !p.isBest);
    if (activeTab === 'recommended') available = available.filter(p => !p.isRecommended);
    if (activeTab === 'visible') available = available.filter(p => !p.isVisible);

    if (keyword) {
      available = available.filter(p => p.name.toLowerCase().includes(keyword.toLowerCase()));
    }

    return available;
  };

  const handleToggleState = (id: string, field: 'isBest' | 'isRecommended' | 'isVisible', value: boolean) => {
    setPendingUpdates(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    const ids = Object.keys(pendingUpdates);
    if (ids.length === 0) return;

    setIsSaving(true);
    
    try {
      // 순차 업데이트 (실제 운영에서는 bulk update API 권장)
      for (const id of ids) {
        const { error } = await updateProduct(id, pendingUpdates[id]);
        if (error) throw new Error(error);
      }
      
      setProducts(displayProducts); // 로컬 상태 확정
      setPendingUpdates({}); // 보류된 변경사항 초기화
      router.refresh();
      
    } catch (err) {
      alert('진열 상태 저장에 실패했습니다: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.keys(pendingUpdates).length > 0;

  const renderProductItem = (p: Product, isAdding: boolean) => {
    const brandName = brands.find(b => b.id === p.brandId)?.name || '';
    
    return (
      <div key={p.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-md shadow-sm hover:border-gray-300 transition-colors">
        <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 overflow-hidden shrink-0">
          {p.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">No Img</div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-[#17201B] truncate">{p.name}</p>
          <p className="text-[12px] text-gray-500 truncate">{brandName}</p>
        </div>

        <div className="shrink-0 pl-3 border-l border-gray-100">
          {isAdding ? (
            <button 
              onClick={() => handleToggleState(p.id, activeTab === 'best' ? 'isBest' : activeTab === 'recommended' ? 'isRecommended' : 'isVisible', true)}
              className="px-3 py-1.5 text-[12px] font-medium bg-[#F3EEE6] text-[#A8742E] hover:bg-[#EBE2D3] rounded"
            >
              추가
            </button>
          ) : (
            <button 
              onClick={() => handleToggleState(p.id, activeTab === 'best' ? 'isBest' : activeTab === 'recommended' ? 'isRecommended' : 'isVisible', false)}
              className="px-3 py-1.5 text-[12px] font-medium bg-red-50 text-red-600 hover:bg-red-100 rounded"
            >
              해제
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="진열 관리"
        description="고객 화면에 노출되는 베스트, 추천 상품을 빠르게 관리합니다."
      />

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'best', label: '베스트 상품' },
            { id: 'recommended', label: '추천 상품 (MD)' },
            { id: 'visible', label: '스토어 노출 상태' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as TabType); setKeyword(''); }}
              className={`
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-[14px]
                ${activeTab === tab.id
                  ? 'border-[#17201B] text-[#17201B]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* 등록된 상품 목록 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#17201B]">
              현재 등록된 {activeTab === 'best' ? '베스트' : activeTab === 'recommended' ? '추천' : '노출'} 상품
              <span className="ml-2 text-[13px] text-gray-500 font-normal">
                {getFilteredProducts().length}개
              </span>
            </h3>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-4 min-h-[400px]">
            {getFilteredProducts().length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
                <p className="text-[13px]">등록된 상품이 없습니다.</p>
                <p className="text-[12px] mt-1">우측 목록에서 추가해주세요.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {getFilteredProducts().map(p => renderProductItem(p, false))}
              </div>
            )}
          </div>
        </div>

        {/* 대기 상품 목록 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#17201B]">
              추가 가능한 상품
            </h3>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="상품명으로 검색..."
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-[13px] focus:ring-[#17201B] focus:border-[#17201B]"
            />
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-4 max-h-[600px] overflow-y-auto">
            {getAvailableProducts().length === 0 ? (
              <div className="text-center text-gray-400 py-10 text-[13px]">
                {keyword ? '검색 결과가 없습니다.' : '추가할 수 있는 상품이 없습니다.'}
              </div>
            ) : (
              <div className="space-y-2">
                {getAvailableProducts().map(p => renderProductItem(p, true))}
              </div>
            )}
          </div>
        </div>
      </div>

      <SaveBar
        isVisible={hasChanges}
        message={`${Object.keys(pendingUpdates).length}개 상품의 진열 상태가 변경되었습니다.`}
        onSave={handleSave}
        onCancel={() => setPendingUpdates({})}
        saveLabel="변경사항 적용"
        cancelLabel="취소"
        isSaving={isSaving}
      />
    </div>
  );
}
