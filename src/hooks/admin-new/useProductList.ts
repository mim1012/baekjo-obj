'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Product, Brand } from '@/types';
import { getAdminProducts, getAdminBrands, deleteProduct, updateProduct } from '@/lib/storage';

export type ProductFilterState = {
  keyword: string;
  brandId: string;
  category: string;
  lifestyleCategory: string;
  petType: string;
  isVisible: string; // 'all', 'true', 'false'
  isRecommended: string; // 'all', 'true', 'false'
  isBest: string; // 'all', 'true', 'false'
  missing: string; // 'all', 'stock', 'price', 'image', 'detail', 'any'
};

export const defaultFilters: ProductFilterState = {
  keyword: '',
  brandId: '',
  category: '',
  lifestyleCategory: '',
  petType: '',
  isVisible: 'all',
  isRecommended: 'all',
  isBest: 'all',
  missing: 'all',
};

export function useProductList(pageSize: number = 20) {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFiltersState] = useState<ProductFilterState>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchInitialData = useCallback(async () => {
    try {
      const [productList, brandList] = await Promise.all([getAdminProducts(), getAdminBrands()]);
      setProducts(productList);
      setBrands(brandList);
      setError(null);
    } catch {
      setError('상품 및 브랜드 정보를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchInitialData();
    })();
  }, [fetchInitialData]);

  const setFilters = useCallback((newFilters: React.SetStateAction<ProductFilterState>) => {
    setFiltersState(newFilters);
    setCurrentPage(1);
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Keyword
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        if (!p.name.toLowerCase().includes(keyword) && !p.id.toLowerCase().includes(keyword)) {
          return false;
        }
      }
      // Exact matches
      if (filters.brandId && p.brandId !== filters.brandId) return false;
      if (filters.category && p.category !== filters.category) return false;
      if (filters.lifestyleCategory && p.lifestyleCategory !== filters.lifestyleCategory) return false;
      if (filters.petType && p.petType !== filters.petType) return false;
      
      // Booleans
      if (filters.isVisible !== 'all') {
        const isVisible = p.isVisible !== false;
        if (filters.isVisible === 'true' && !isVisible) return false;
        if (filters.isVisible === 'false' && isVisible) return false;
      }
      if (filters.isRecommended !== 'all') {
        if (filters.isRecommended === 'true' && !p.isRecommended) return false;
        if (filters.isRecommended === 'false' && p.isRecommended) return false;
      }
      if (filters.isBest !== 'all') {
        if (filters.isBest === 'true' && !p.isBest) return false;
        if (filters.isBest === 'false' && p.isBest) return false;
      }

      // Missing attributes
      if (filters.missing !== 'all') {
        const isMissingStock = p.stock <= 0;
        const isMissingPrice = p.price === null || p.price === undefined || p.price <= 0;
        const isMissingImage = !p.image || p.image.trim() === '';
        
        const hasDetailBlocks = p.detailBlocks && p.detailBlocks.length > 0;
        const hasDescription = p.description && p.description.trim() !== '';
        const isMissingDetail = !hasDetailBlocks && !hasDescription;

        if (filters.missing === 'stock' && !isMissingStock) return false;
        if (filters.missing === 'price' && !isMissingPrice) return false;
        if (filters.missing === 'image' && !isMissingImage) return false;
        if (filters.missing === 'detail' && !isMissingDetail) return false;
        if (filters.missing === 'any' && !isMissingStock && !isMissingPrice && !isMissingImage && !isMissingDetail) return false;
      }
      
      return true;
    });
  }, [products, filters]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const toggleSelection = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(paginatedProducts.map((p) => p.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const executeBulkAction = async (
    ids: string[],
    actionFn: (id: string) => Promise<boolean>
  ) => {
    const successIds: string[] = [];
    const failedItems: string[] = [];

    // Process sequentially or in small batches. Here doing one by one for simplicity and safety.
    for (const id of ids) {
      try {
        const success = await actionFn(id);
        if (success) successIds.push(id);
        else failedItems.push(id);
      } catch (e) {
        failedItems.push(id);
      }
    }

    if (successIds.length > 0) {
      await fetchInitialData();
      clearSelection();
    }

    return { successIds, failedItems };
  };

  const performBulkDelete = async (ids: string[]) => {
    let hasHistoryConflict = false;
    const result = await executeBulkAction(ids, async (id) => {
      const res = await deleteProduct(id);
      if (res.error) {
        if (res.error === 'product-has-history') hasHistoryConflict = true;
        throw new Error(res.error);
      }
      return true;
    });
    return { ...result, hasHistoryConflict };
  };

  const performBulkUpdate = async (ids: string[], updates: Partial<Product>) => {
    return executeBulkAction(ids, async (id) => {
      const res = await updateProduct(id, updates);
      if (res.error) throw new Error(res.error);
      return true;
    });
  };

  return {
    products,
    brands,
    loading,
    error,
    filters,
    setFilters,
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedProducts,
    totalFiltered: filteredProducts.length,
    selectedIds: Array.from(selectedIds),
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    refreshData: fetchInitialData,
    performBulkDelete,
    performBulkUpdate,
  };
}
