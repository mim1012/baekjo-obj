'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Edit, Trash2, Eye, EyeOff, LayoutTemplate } from 'lucide-react';

import { useProductList } from '@/hooks/admin-new/useProductList';
import PageHeader from '@/components/admin-new/common/PageHeader';
import DataTable from '@/components/admin-new/common/DataTable';
import FilterBar from '@/components/admin-new/common/FilterBar';
import Badge from '@/components/admin-new/common/Badge';
import { formatPrice } from '@/lib/format';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';
import type { Product, Brand } from '@/types';
import { formatBrandDisplayName } from '@/lib/brands/presentation';

interface AdminProductsClientProps {
  initialProducts: Product[];
  initialBrands: Brand[];
}

export default function AdminProductsClient({ initialProducts, initialBrands }: AdminProductsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { categorySettings } = useCategorySettings();
  const [bestUpdatingId, setBestUpdatingId] = useState<string | null>(null);
  
  const {
    brands,
    loading,
    filters,
    setFilters,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedProducts,
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    performBulkDelete,
    performBulkUpdate,
  } = useProductList(20, { products: initialProducts, brands: initialBrands });

  // URL 쿼리 파라미터 초기화 연동
  useEffect(() => {
    const missing = searchParams.get('missing');
    const isVisible = searchParams.get('isVisible');
    const isRecommended = searchParams.get('isRecommended');
    const isBest = searchParams.get('isBest');

    setFilters(prev => ({
      ...prev,
      missing: missing || 'all',
      isVisible: isVisible || 'all',
      isRecommended: isRecommended || 'all',
      isBest: isBest || 'all',
    }));
  }, [searchParams, setFilters]);

  const handleCreate = () => {
    router.push('/admin/products/new');
  };

  const handleEdit = (id: string) => {
    router.push(`/admin/products/${id}`);
  };

  const handleEditDetails = (id: string) => {
    router.push(`/admin/products/${id}/editor`);
  };

  const handleEditSeller = (id: string) => {
    router.push(`/admin/products/${id}#actual-seller`);
  };

  const handleBestToggle = async (product: Product) => {
    setBestUpdatingId(product.id);
    try {
      const { failedItems } = await performBulkUpdate([product.id], { isBest: !product.isBest });
      if (failedItems.length > 0) window.alert('BEST 표시를 변경하지 못했습니다. 다시 시도해주세요.');
    } finally {
      setBestUpdatingId(null);
    }
  };

  const columns = [
    {
      key: 'image',
      header: '이미지',
      width: '64px',
      render: (p: Product) => (
        <div className="w-10 h-10 bg-gray-100 rounded border border-gray-200 bg-cover bg-center shrink-0 overflow-hidden" 
             style={{ backgroundImage: p.image ? `url(${p.image})` : 'none' }}>
          {!p.image && <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">No Img</div>}
        </div>
      )
    },
    {
      key: 'name',
      header: '상품명 / 분류',
      render: (p: Product) => {
        const rawBrandName = brands.find(b => b.id === p.brandId)?.name;
        const brandName = rawBrandName ? formatBrandDisplayName(rawBrandName) : '브랜드 없음';
        return (
          <div>
            <div className="font-medium text-[#17201B] hover:underline cursor-pointer" onClick={() => handleEdit(p.id)}>
              {p.name}
            </div>
            <div className="text-[12px] text-gray-500 mt-1 flex items-center gap-1">
              <span>{brandName}</span>
              <span className="text-gray-300">|</span>
              <span>{p.categoryName || p.category}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'seller',
      header: '실제 판매자',
      width: '220px',
      render: (p: Product) => (
        <div className="space-y-2">
          {p.seller ? (
            <div>
              <p className="font-medium text-[#17201B]">{p.seller.displayName}</p>
              <p className="mt-1 text-[12px] text-gray-500">{p.seller.legalName}</p>
            </div>
          ) : (
            <Badge label="판매자 미지정" variant="error" />
          )}
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); handleEditSeller(p.id); }}
            className="text-[12px] font-semibold text-[#9A5B20] underline underline-offset-4"
          >
            {p.seller ? '판매자 변경' : '판매자 지정'}
          </button>
        </div>
      ),
    },
    {
      key: 'price',
      header: '판매가 / 재고',
      render: (p: Product) => (
        <div>
          <div className="font-medium text-[#17201B]">
            {p.price ? formatPrice(p.price) : <span className="text-[#A65348] text-[12px]">가격 미등록</span>}
          </div>
          <div className="text-[12px] mt-1">
            {p.stock > 0 ? (
              <span className="text-gray-500">재고: {p.stock}개</span>
            ) : (
              <span className="text-[#A65348] font-medium">품절</span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'bestCuration',
      header: 'BEST · 자체 큐레이션',
      width: '190px',
      render: (p: Product) => (
        <div className="space-y-2">
          <button
            type="button"
            aria-pressed={p.isBest}
            disabled={bestUpdatingId === p.id}
            onClick={(event) => { event.stopPropagation(); void handleBestToggle(p); }}
            className={`min-w-20 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${p.isBest ? 'border-[#17211D] bg-[#17211D] text-white' : 'border-gray-300 bg-white text-gray-500 hover:border-[#17211D]'}`}
          >
            {bestUpdatingId === p.id ? '저장 중…' : p.isBest ? '표시 중' : '표시 안 함'}
          </button>
          <p className="max-w-44 whitespace-normal text-[11px] leading-4 text-gray-500">
            켜면 고객 상품카드에 BEST와 기준 보기 링크가 함께 표시됩니다.
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태 / 노출',
      width: '180px',
      render: (p: Product) => {
        const hasDetailBlocks = p.detailBlocks && p.detailBlocks.length > 0;
        const hasDescription = p.description && p.description.trim() !== '';
        const missingDetail = !hasDetailBlocks && !hasDescription;
        
        return (
          <div className="flex flex-wrap gap-1">
            <Badge 
              label={p.isVisible ? '노출' : '숨김'} 
              variant={p.isVisible ? 'success' : 'default'} 
            />
            {p.isBest && <Badge label="베스트" variant="warning" />}
            {p.isRecommended && <Badge label="추천" variant="primary" />}
            {missingDetail && <Badge label="상세 미작성" variant="error" />}
            {!p.sellerId && <Badge label="판매자 미지정" variant="error" />}
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: '관리',
      width: '120px',
      align: 'right' as const,
      render: (p: Product) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); handleEditDetails(p.id); }}
            className="p-1.5 text-gray-400 hover:text-[#17201B] hover:bg-gray-100 rounded"
            title="상세페이지 편집"
          >
            <LayoutTemplate size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleEdit(p.id); }}
            className="p-1.5 text-gray-400 hover:text-[#17201B] hover:bg-gray-100 rounded"
            title="상품 수정"
          >
            <Edit size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="상품 관리"
        description="전체 상품 목록을 확인하고, 수정하거나 새 상품을 등록합니다."
      >
        <button 
          onClick={() => router.push('/admin/products/display')}
          className="flex items-center gap-2 border border-[#E7E0D5] bg-white text-gray-700 hover:bg-[#F3EEE6] px-4 py-2 rounded text-[13px] font-medium transition-colors"
        >
          <LayoutTemplate size={16} />
          진열 관리
        </button>
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 bg-[#17201B] hover:bg-[#2F3B34] text-white px-4 py-2 rounded text-[13px] font-medium transition-colors"
        >
          <Plus size={16} />
          새 상품 등록
        </button>
      </PageHeader>

      <FilterBar
        searchPlaceholder="상품명 또는 상품코드 검색..."
        searchValue={filters.keyword}
        onSearch={(val) => setFilters(prev => ({ ...prev, keyword: val }))}
      >
        <select 
          value={filters.category} 
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
          className="border border-gray-300 rounded-md text-[13px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2F3B34] focus:border-[#2F3B34]"
        >
          <option value="">카테고리 (전체)</option>
          {categorySettings.productCategories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        
        <select 
          value={filters.brandId} 
          onChange={(e) => setFilters(prev => ({ ...prev, brandId: e.target.value }))}
          className="border border-gray-300 rounded-md text-[13px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2F3B34] focus:border-[#2F3B34]"
        >
          <option value="">브랜드 (전체)</option>
          {brands.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        <select 
          value={filters.isVisible} 
          onChange={(e) => setFilters(prev => ({ ...prev, isVisible: e.target.value }))}
          className="border border-gray-300 rounded-md text-[13px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2F3B34] focus:border-[#2F3B34]"
        >
          <option value="all">노출 상태 (전체)</option>
          <option value="true">노출</option>
          <option value="false">숨김</option>
        </select>

        <select
          value={filters.isBest}
          onChange={(e) => setFilters(prev => ({ ...prev, isBest: e.target.value }))}
          className="border border-gray-300 rounded-md text-[13px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2F3B34] focus:border-[#2F3B34]"
        >
          <option value="all">BEST 표시 (전체)</option>
          <option value="true">BEST 표시 중</option>
          <option value="false">BEST 표시 안 함</option>
        </select>

        <select 
          value={filters.missing} 
          onChange={(e) => setFilters(prev => ({ ...prev, missing: e.target.value }))}
          className="border border-gray-300 rounded-md text-[13px] px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#2F3B34] focus:border-[#2F3B34]"
        >
          <option value="all">조치 현황 (전체)</option>
          <option value="stock">품절</option>
          <option value="price">가격 미등록</option>
          <option value="image">이미지 미등록</option>
          <option value="detail">상세 미작성</option>
          <option value="seller">판매자 미지정</option>
          <option value="any">조치 필요 (전체)</option>
        </select>
      </FilterBar>

      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={paginatedProducts}
          isLoading={loading}
          keyExtractor={(row) => row.id}
          selectedIds={selectedIds}
          onSelect={toggleSelection}
          onSelectAll={toggleSelectAll}
        />
        
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-gray-200 flex justify-center">
            <nav className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-[13px] font-medium text-gray-500 hover:bg-gray-50 border border-gray-200 rounded-l-md disabled:opacity-50"
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .map((p, i, arr) => (
                  <React.Fragment key={p}>
                    {i > 0 && arr[i-1] !== p - 1 && (
                      <span className="px-2 text-gray-400">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`px-3 py-1.5 text-[13px] font-medium border-y border-r border-gray-200 ${
                        currentPage === p 
                          ? 'bg-[#17201B] text-white border-[#17201B]' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
              ))}
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-[13px] font-medium text-gray-500 hover:bg-gray-50 border-y border-r border-gray-200 rounded-r-md disabled:opacity-50"
              >
                다음
              </button>
            </nav>
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] md:left-[236px] transition-all duration-300">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
            <div className="text-[14px] font-medium text-gray-600 hidden sm:block flex-1">
              {selectedIds.length}개 상품 선택됨
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`선택한 ${selectedIds.length}개 상품을 숨김 처리하시겠습니까?`)) return;
                  await performBulkUpdate(selectedIds, { isVisible: false });
                }}
                className="px-3 py-1.5 text-[13px] font-medium text-white bg-gray-600 hover:bg-gray-700 rounded border border-transparent flex items-center gap-1.5"
              >
                <EyeOff size={14} /> 숨김 처리
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`선택한 ${selectedIds.length}개 상품을 노출 처리하시겠습니까?`)) return;
                  await performBulkUpdate(selectedIds, { isVisible: true });
                }}
                className="px-3 py-1.5 text-[13px] font-medium text-white bg-gray-600 hover:bg-gray-700 rounded border border-transparent flex items-center gap-1.5"
              >
                <Eye size={14} /> 노출 처리
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm(`정말로 선택한 ${selectedIds.length}개 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;
                  const { failedItems, hasHistoryConflict } = await performBulkDelete(selectedIds);
                  if (failedItems.length > 0) {
                    alert(
                      hasHistoryConflict
                        ? '리뷰/문의가 있는 상품은 삭제 대신 숨김 처리하세요.'
                        : '상품 삭제에 실패했습니다.',
                    );
                  }
                }}
                className="px-3 py-1.5 text-[13px] font-medium text-[#A65348] bg-white hover:bg-[#FDF2F2] rounded border border-[#A65348] flex items-center gap-1.5"
              >
                <Trash2 size={14} /> 삭제
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="px-4 py-2 border border-gray-300 rounded-md text-[14px] font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                선택 해제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
