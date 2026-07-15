'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Building2, Package, Search, Edit2, Trash2, ExternalLink, SlidersHorizontal } from 'lucide-react';
import { getAdminBrands, getAdminProducts, deleteBrand, updateBrand } from '@/lib/storage';
import type { Brand, Product } from '@/types';

import PageHeader from '@/components/admin-new/common/PageHeader';
import DataTable from '@/components/admin-new/common/DataTable';
import Badge from '@/components/admin-new/common/Badge';
import StatusBadge from '@/components/admin-new/common/StatusBadge';
import SummaryStrip from '@/components/admin-new/common/SummaryStrip';
import BrandForm from '@/components/admin-new/brands/BrandForm';

export default function BrandListPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [keyword, setKeyword] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  // 노출 토글이 진행 중인 브랜드 id. 버튼 disabled + 중복 클릭 무시(M1 in-flight 가드).
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [brandList, productList] = await Promise.all([
        getAdminBrands(),
        getAdminProducts()
      ]);
      // 공개 BrandsContent.tsx:46 과 동일 정책 — displayOrder 오름차순, 미지정은 뒤로.
      const sorted = [...brandList].sort(
        (a, b) => (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER)
      );
      setBrands(sorted);
      setProducts(productList);
    } catch (err) {
      console.error(err);
      alert('브랜드 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, []);

  const handleCreate = () => {
    setEditingBrand(null);
    setIsFormOpen(true);
  };

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 브랜드를 삭제하시겠습니까? 소속 상품이 있는 경우 문제가 발생할 수 있습니다.')) return;
    
    try {
      const { error } = await deleteBrand(id);
      if (error) throw new Error(error);
      await fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제에 실패했습니다.');
    }
  };

  const handleToggleVisible = async (brand: Brand) => {
    if (togglingIds.has(brand.id)) return; // 이미 진행 중이면 재클릭 무시(M1)

    const currentlyVisible = brand.isVisible !== false;
    const next = !currentlyVisible;

    // 낙관적 업데이트 — 해당 row의 isVisible만 즉시 뒤집는다. 전체 fetchData(=스피너로
    // 목록 교체)를 토글 경로에서 호출하지 않아 깜빡임·스크롤 점프가 없다. 실패 시 롤백.
    setBrands(prev => prev.map(b => (b.id === brand.id ? { ...b, isVisible: next } : b)));
    setTogglingIds(prev => new Set(prev).add(brand.id));

    try {
      const { error } = await updateBrand(brand.id, { isVisible: next });
      if (error) throw new Error(error);
    } catch (err) {
      setBrands(prev => prev.map(b => (b.id === brand.id ? { ...b, isVisible: currentlyVisible } : b)));
      alert(err instanceof Error ? err.message : '노출 상태 변경에 실패했습니다.');
    } finally {
      setTogglingIds(prev => {
        const nextSet = new Set(prev);
        nextSet.delete(brand.id);
        return nextSet;
      });
    }
  };

  const filteredBrands = brands.filter(b => {
    if (!keyword) return true;
    const lower = keyword.toLowerCase();
    return b.name.toLowerCase().includes(lower) || 
           (b.description && b.description.toLowerCase().includes(lower));
  });

  const columns = [
    {
      key: 'logo',
      header: '로고',
      width: '80px',
      render: (b: Brand) => (
        <div className="w-12 h-12 bg-white rounded border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
          {b.logo && b.logo !== '/images/icon-product.svg' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logo} alt={b.name} className="w-full h-full object-contain p-1" />
          ) : (
            <Building2 size={20} className="text-gray-300" />
          )}
        </div>
      )
    },
    {
      key: 'name',
      header: '브랜드 정보',
      render: (b: Brand) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-[#17201B] hover:underline cursor-pointer" onClick={() => handleEdit(b)}>
              {b.name}
            </span>
            {b.officialUrl && (
              <a href={b.officialUrl} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500" onClick={e => e.stopPropagation()}>
                <ExternalLink size={14} />
              </a>
            )}
          </div>
          <p className="text-[12px] text-gray-500 mt-1 line-clamp-1">{b.description}</p>
        </div>
      )
    },
    {
      key: 'grade',
      header: '검증 등급',
      width: '100px',
      render: (b: Brand) => (
        <Badge 
          label={`${b.auditGrade} 등급`} 
          variant={b.auditGrade?.includes('A') ? 'success' : 'primary'} 
        />
      )
    },
    {
      key: 'products',
      header: '등록 상품',
      width: '100px',
      render: (b: Brand) => {
        const count = products.filter(p => p.brandId === b.id).length;
        return (
          <div className="text-[13px] text-gray-600 flex items-center gap-1.5">
            <Package size={14} className="text-gray-400" /> {count}개
          </div>
        );
      }
    },
    {
      key: 'visible',
      header: '노출 상태',
      width: '110px',
      render: (b: Brand) => {
        const visible = b.isVisible !== false;
        const busy = togglingIds.has(b.id);
        return (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleToggleVisible(b); }}
            disabled={busy}
            aria-pressed={visible}
            aria-label={`브랜드관 노출 ${visible ? '켜짐' : '꺼짐'}, 클릭하여 전환`}
            title="클릭하여 노출 상태 전환"
            className="cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <StatusBadge status={visible ? 'success' : 'neutral'} label={visible ? '노출' : '숨김'} />
          </button>
        );
      }
    },
    {
      key: 'actions',
      header: '관리',
      width: '100px',
      align: 'right' as const,
      render: (b: Brand) => (
        <div className="flex justify-end gap-2">
          <Link
            href={`/admin/brands/${b.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1.5 text-gray-400 hover:text-[#17201B] hover:bg-gray-100 rounded"
            title="상세 편집 (감사 보고서·대표상품 등 전 필드)"
          >
            <SlidersHorizontal size={16} />
          </Link>
          <button
            onClick={(e) => { e.stopPropagation(); handleEdit(b); }}
            className="p-1.5 text-gray-400 hover:text-[#17201B] hover:bg-gray-100 rounded"
            title="빠른 수정 (기본 정보)"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="삭제"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="브랜드 관리"
        description="입점된 브랜드 정보와 스토리, 검증 등급을 관리합니다."
      >
        <button 
          onClick={handleCreate}
          className="flex items-center gap-2 bg-[#17201B] hover:bg-[#2F3B34] text-white px-4 py-2 rounded text-[13px] font-medium transition-colors"
        >
          <Plus size={16} />
          새 브랜드 등록
        </button>
      </PageHeader>

      <SummaryStrip 
        items={[
          { label: '전체 브랜드', value: brands.length },
          { label: '노출', value: brands.filter(b => b.isVisible !== false).length },
          { label: '숨김', value: brands.filter(b => b.isVisible === false).length },
          { label: '추천 브랜드', value: brands.filter(b => b.isRecommended).length },
          { label: '전체 상품', value: products.length },
        ]}
      />

      <div className="flex items-center justify-between mb-4 mt-6">
        <div className="relative w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="브랜드명 검색..." 
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-[13px] focus:border-[#17201B] focus:ring-1 focus:ring-[#17201B] outline-none"
          />
        </div>
        <p className="text-[13px] text-gray-500">
          총 <span className="font-semibold text-[#17201B]">{filteredBrands.length}</span>개 브랜드
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredBrands}
          isLoading={loading}
          keyExtractor={(row) => row.id}
        />
      </div>

      {isFormOpen && (
        <BrandForm 
          initialData={editingBrand}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
