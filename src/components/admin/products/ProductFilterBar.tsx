import type { ChangeEvent, Dispatch, SetStateAction } from 'react';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import type { ProductFilterState } from '@/hooks/admin/useAdminProducts';
import type { Brand } from '@/types';
import { CATALOG_STATUS_META, VISIBILITY_META } from '@/lib/products/constants';

interface ProductFilterBarProps {
  filters: ProductFilterState;
  setFilters: Dispatch<SetStateAction<ProductFilterState>>;
  brands: Brand[];
  categories: string[];
  lifestyleCategories: string[];
}

const SELECT_CLASS = 'min-h-11 w-full border border-[#E7E0D5] bg-white px-3 text-sm text-[#17211D] focus:border-[#A8742E] focus:outline-none';

export function ProductFilterBar({
  filters,
  setFilters,
  brands,
  categories,
  lifestyleCategories,
}: ProductFilterBarProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilters((previous) => ({ ...previous, [name]: value }));
  };

  const handleReset = () => {
    setFilters({
      searchKeyword: '',
      brandId: '',
      category: '',
      lifestyleCategory: '',
      catalogStatus: '',
      isVisible: '',
      priceStatus: '',
    });
  };

  return (
    <section className="mb-6 border border-[#E7E0D5] bg-white" aria-labelledby="product-filter-title">
      <div className="flex items-center justify-between border-b border-[#E7E0D5] bg-[#FAF8F3] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-[#A8742E]" />
          <h2 id="product-filter-title" className="text-xs font-semibold text-[#17211D]">검색 및 상세 필터</h2>
        </div>
        <button type="button" onClick={handleReset} className="inline-flex min-h-9 items-center gap-1.5 px-2 text-xs font-semibold text-[#6F766F] transition-colors hover:bg-[#F3EEE6] hover:text-[#17211D]">
          <RotateCcw className="size-3.5" /> 초기화
        </button>
      </div>

      <div className="p-4 sm:p-5">
        <label className="relative block">
          <span className="sr-only">상품명 또는 상품 코드 검색</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#8B928C]" />
          <input
            type="search"
            name="searchKeyword"
            value={filters.searchKeyword}
            onChange={handleChange}
            placeholder="상품명 또는 상품 코드 검색"
            className="min-h-12 w-full border border-[#E7E0D5] bg-[#FBFAF7] pl-10 pr-4 text-sm text-[#17211D] placeholder:text-[#9AA09A] focus:border-[#A8742E] focus:bg-white focus:outline-none"
          />
        </label>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <label className="text-[10px] font-semibold tracking-wide text-[#7B827C]">브랜드
            <select name="brandId" value={filters.brandId} onChange={handleChange} className={`mt-1.5 ${SELECT_CLASS}`}>
              <option value="">전체 브랜드</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-semibold tracking-wide text-[#7B827C]">상품군
            <select name="category" value={filters.category} onChange={handleChange} className={`mt-1.5 ${SELECT_CLASS}`}>
              <option value="">전체 상품군</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-semibold tracking-wide text-[#7B827C]">라이프스타일
            <select name="lifestyleCategory" value={filters.lifestyleCategory} onChange={handleChange} className={`mt-1.5 ${SELECT_CLASS}`}>
              <option value="">전체 라이프스타일</option>
              {lifestyleCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-semibold tracking-wide text-[#7B827C]">판매 상태
            <select name="catalogStatus" value={filters.catalogStatus} onChange={handleChange} className={`mt-1.5 ${SELECT_CLASS}`}>
              <option value="">전체 판매 상태</option>
              {Object.entries(CATALOG_STATUS_META).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-semibold tracking-wide text-[#7B827C]">노출 상태
            <select name="isVisible" value={filters.isVisible} onChange={handleChange} className={`mt-1.5 ${SELECT_CLASS}`}>
              <option value="">전체 노출 상태</option>
              <option value="true">{VISIBILITY_META.true.label}</option>
              <option value="false">{VISIBILITY_META.false.label}</option>
            </select>
          </label>
          <label className="text-[10px] font-semibold tracking-wide text-[#7B827C]">가격 상태
            <select name="priceStatus" value={filters.priceStatus} onChange={handleChange} className={`mt-1.5 ${SELECT_CLASS}`}>
              <option value="">전체 가격 상태</option>
              <option value="UNSET">가격 미등록</option>
              <option value="ZERO">0원 · 확인 필요</option>
              <option value="VALID">정상가 등록</option>
            </select>
          </label>
        </div>
      </div>
    </section>
  );
}
