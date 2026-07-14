'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Building2, Package, Search, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { getAdminBrands, getAdminProducts, deleteBrand } from '@/lib/storage';
import type { Brand, Product } from '@/types';

import PageHeader from '@/components/admin-new/common/PageHeader';
import DataTable from '@/components/admin-new/common/DataTable';
import Badge from '@/components/admin-new/common/Badge';
import SummaryStrip from '@/components/admin-new/common/SummaryStrip';
import BrandForm from '@/components/admin-new/brands/BrandForm';

export default function BrandListPage() {
  const router = useRouter();
  
  const [brands, setBrands] = useState<Brand[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [keyword, setKeyword] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [brandList, productList] = await Promise.all([
        getAdminBrands(),
        getAdminProducts()
      ]);
      setBrands(brandList);
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
      key: 'actions',
      header: '관리',
      width: '100px',
      align: 'right' as const,
      render: (b: Brand) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); handleEdit(b); }}
            className="p-1.5 text-gray-400 hover:text-[#17201B] hover:bg-gray-100 rounded"
            title="수정"
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
