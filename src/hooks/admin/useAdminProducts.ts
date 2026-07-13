import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Product, Brand } from '@/types';
import { getAdminProducts, getAdminBrands, deleteProduct, updateProduct } from '@/lib/storage';

export type ProductFilterState = {
  searchKeyword: string;
  brandId: string;
  category: string;
  lifestyleCategory: string;
  catalogStatus: string;
  isVisible: string;
  priceStatus: string; // UNSET, ZERO, VALID, or empty
};

export type BulkActionResult = {
  successIds: string[];
  failedItems: Array<{ id: string; message: string; }>;
};

const defaultFilters: ProductFilterState = {
  searchKeyword: '',
  brandId: '',
  category: '',
  lifestyleCategory: '',
  catalogStatus: '',
  isVisible: '',
  priceStatus: '',
};

export function useAdminProducts(pageSize: number = 20) {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFiltersState] = useState<ProductFilterState>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Use a ref to track if it's the first render
  const isFirstRender = useRef(true);

  const fetchInitialData = useCallback(async () => {
    // setLoading is true initially, and on refresh we don't strictly need to set it true 
    // unless we want a full page loader. For refresh, we can just fetch silently.
    setError(null);
    try {
      const [productList, brandList] = await Promise.all([getAdminProducts(), getAdminBrands()]);
      setProducts(productList);
      setBrands(brandList);
    } catch {
      setError('상품 및 브랜드 정보를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // To avoid "Calling setState synchronously within an effect" lint error, 
    // we use an IIFE that makes it asynchronous
    void (async () => {
      await fetchInitialData();
    })();
  }, [fetchInitialData]);

  const setFilters = useCallback((newFilters: React.SetStateAction<ProductFilterState>) => {
    setFiltersState(newFilters);
    setCurrentPage(1); // Reset page automatically when filter is updated
  }, []);

  // Apply Filters
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (filters.searchKeyword) {
        const keyword = filters.searchKeyword.toLowerCase();
        const code = (p as Product & { code?: string }).code;
        if (!p.name.toLowerCase().includes(keyword) && !(code && code.toLowerCase().includes(keyword))) {
          return false;
        }
      }
      if (filters.brandId && p.brandId !== filters.brandId) return false;
      if (filters.category && p.category !== filters.category) return false;
      if (filters.lifestyleCategory && p.lifestyleCategory !== filters.lifestyleCategory) return false;
      if (filters.catalogStatus && p.catalogStatus !== filters.catalogStatus) return false;
      if (filters.isVisible && String(p.isVisible !== false) !== filters.isVisible) return false;
      
      if (filters.priceStatus) {
        const isUnset = p.price === null || p.price === undefined || String(p.price) === '';
        const isZero = p.price === 0;
        const isValid = !isUnset && !isZero;
        if (filters.priceStatus === 'UNSET' && !isUnset) return false;
        if (filters.priceStatus === 'ZERO' && !isZero) return false;
        if (filters.priceStatus === 'VALID' && !isValid) return false;
      }
      return true;
    });
  }, [products, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedProducts.length && paginatedProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedProducts.map((p) => p.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const executeBulkAction = async (
    ids: string[], 
    actionFn: (id: string) => Promise<boolean>, 
    batchSize: number = 3
  ): Promise<BulkActionResult> => {
    const successIds: string[] = [];
    const failedItems: Array<{ id: string; message: string }> = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map((id) => actionFn(id)));

      results.forEach((result, idx) => {
        const id = batch[idx];
        if (result.status === 'fulfilled' && result.value) {
          successIds.push(id);
        } else {
          failedItems.push({ id, message: result.status === 'rejected' ? result.reason?.message || 'Unknown error' : 'Action failed' });
        }
      });
    }

    if (successIds.length > 0) {
      await fetchInitialData(); // Re-fetch to sync state with server
      clearSelection();
    }

    return { successIds, failedItems };
  };

  const performBulkDelete = async (ids: string[]) => {
    return executeBulkAction(ids, async (id) => {
      const res = await deleteProduct(id);
      if (res.error) throw new Error(res.error);
      return true;
    });
  };

  const performBulkUpdateStatus = async (ids: string[], status: 'draft' | 'ready' | 'sold_out') => {
    return executeBulkAction(ids, async (id) => {
      const res = await updateProduct(id, { catalogStatus: status });
      if (res.error) throw new Error(res.error);
      return true;
    });
  };

  const performBulkUpdateVisibility = async (ids: string[], isVisible: boolean) => {
    return executeBulkAction(ids, async (id) => {
      const res = await updateProduct(id, { isVisible });
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
    selectedIds,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    refreshData: fetchInitialData,
    performBulkDelete,
    performBulkUpdateStatus,
    performBulkUpdateVisibility,
  };
}
