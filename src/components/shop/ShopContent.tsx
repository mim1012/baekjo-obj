'use client';

import { FormEvent, Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { Brand, Product } from '@/types';
import type { ProductTagDefinition } from '@/lib/productTags/config';
import { getDataBackedShopCategoryOptions, normalizeShopCategory } from '@/data/shopFilters';
import ProductCard from '@/components/common/ProductCard';
import { filterProducts, sortProducts, SortOption } from '@/lib/filters';
import { sortByManagedProductOrder } from '@/lib/products/displayOrder';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';
import { formatBrandDisplayName } from '@/lib/brands/presentation';

const PRODUCTS_PER_PAGE = 20;

const priceOptions = [
  { id: 'all', label: '전체' },
  { id: 'under-20000', label: '2만원 미만' },
  { id: '20000-50000', label: '2-5만원' },
  { id: '50000-100000', label: '5-10만원' },
  { id: '100000-plus', label: '10만원 이상' },
];

const concernOptions = [
  { slug: 'skin', title: '피부' },
  { slug: 'joint', title: '관절' },
  { slug: 'obesity', title: '체중' },
  { slug: 'oral', title: '구강' },
  { slug: 'odor', title: '냄새' },
];

const sortOptions: Array<{ id: SortOption; label: string }> = [
  { id: 'recommended', label: '기본순' },
  { id: 'popular', label: '인기순' },
  { id: 'newest', label: '최신순' },
  { id: 'reviews', label: '후기 많은 순' },
  { id: 'price-low', label: '낮은 가격순' },
  { id: 'price-high', label: '높은 가격순' },
];

type LifestyleFilterOption = {
  slug: string;
  label: string;
};
interface Props {
  products: Product[];
  brands: Brand[];
  /** 현재 홈페이지의 상품 태그 중 스토어 필터에 표시하도록 설정한 항목. */
  productTags: ProductTagDefinition[];
  content: ShopPageContent;
}

export interface ShopPageContent {
  hero: { eyebrow: string; title: string; description: string; searchPlaceholder: string; searchButtonLabel: string };
  featured: { visible: boolean; title: string };
  catalog: { allLabel: string; allProductsLabel: string; filterLabel: string; resetLabel: string; countSuffix: string; resultsButtonSuffix: string };
  filters: {
    petTypeTitle: string; categoryTitle: string; brandTitle: string; priceTitle: string;
    detailLabel: string; concernTitle: string; ratingTitle: string; allOptionLabel: string;
    sortRecommendedLabel: string; sortPopularLabel: string; sortNewestLabel: string;
    sortReviewsLabel: string; sortPriceLowLabel: string; sortPriceHighLabel: string;
  };
  empty: { title: string; buttonLabel: string };
}

function ShopInner({ products, brands, productTags, content }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { categorySettings } = useCategorySettings();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileFilterRef = useRef<HTMLElement>(null);
  const shopToolbarRef = useRef<HTMLDivElement>(null);
  const concernOptions = productTags
    .filter((tag) => tag.isVisible && tag.showInShopFilter)
    .map((tag) => ({ slug: tag.slug, title: tag.label }));
  const priceOptions = [
    { id: 'all', label: content.filters.allOptionLabel, minPrice: undefined, maxPrice: undefined },
    ...categorySettings.priceRanges,
  ];
  const sortOptions: Array<{ id: SortOption; label: string }> = [
    { id: 'recommended', label: content.filters.sortRecommendedLabel },
    { id: 'popular', label: content.filters.sortPopularLabel },
    { id: 'newest', label: content.filters.sortNewestLabel },
    { id: 'reviews', label: content.filters.sortReviewsLabel },
    { id: 'price-low', label: content.filters.sortPriceLowLabel },
    { id: 'price-high', label: content.filters.sortPriceHighLabel },
  ];

  const params: Record<string, string | undefined> = {
    sort: searchParams.get('sort') || undefined,
    petType: searchParams.get('petType') || undefined,
    category: searchParams.get('category') || undefined,
    lifestyle: searchParams.get('lifestyle') || undefined,
    concern: searchParams.get('concern') || undefined,
    brandId: searchParams.get('brandId') || undefined,
    price: searchParams.get('price') || undefined,
    rating: searchParams.get('rating') || undefined,
    search: searchParams.get('search') || undefined,
    page: searchParams.get('page') || undefined,
  };

  useEffect(() => {
    if (searchParams.get('focus') === 'search') {
      searchInputRef.current?.focus();
    }
  }, [searchParams]);

  useEffect(() => {
    if (!mobileFiltersOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = mobileFilterRef.current;
    const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled])';
    dialog?.querySelector<HTMLElement>(focusableSelector)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileFiltersOpen(false);
        return;
      }

      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileFiltersOpen]);

  const currentSort = (params.sort as SortOption) || 'recommended';
  const priceRange = params.price || 'all';
  const selectedPriceRange = categorySettings.priceRanges.find((option) => option.id === priceRange);
  const selectedRatingRange = categorySettings.ratingRanges.find((option) => option.id === params.rating);

  // 상품 detail에 저장된 과거 브랜드명이 오래되었더라도 현재 브랜드 테이블을 정본으로 사용한다.
  // 카드 표기와 브랜드명 검색이 같은 이름을 바라보게 해 브랜드 필터/검색 결과가 어긋나지 않는다.
  const brandNameById = new Map(brands.map((brand) => [brand.id, brand.name]));
  const productsWithBrandNames = products.map((product) => ({
    ...product,
    brandName: brandNameById.get(product.brandId) ?? product.brandName,
  }));

  // products/brands 는 서버 wrapper(page.tsx)가 repo(listProducts/listBrands)로 이미
  // is_visible=true 만 걸러 내려준다(콘센트) — 여기서 재필터링하지 않는다.
  const filtered = sortProducts(
    filterProducts(productsWithBrandNames, {
      petType: params.petType,
      category: params.category,
      lifestyleCategory: params.lifestyle,
      concern: params.concern,
      brandId: params.brandId,
      minPrice: selectedPriceRange?.minPrice,
      maxPrice: selectedPriceRange?.maxPrice,
      minRating: selectedRatingRange?.minRating,
      search: params.search,
    }),
    currentSort,
  );

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PRODUCTS_PER_PAGE));
  const rawPage = parseInt(params.page || '1', 10);
  const validPage = isNaN(rawPage) || rawPage < 1 ? 1 : Math.min(rawPage, totalPages);

  const startIndex = (validPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const paginatedProducts = filtered.slice(startIndex, endIndex);

  // 추천 상품은 페이지네이션과 분리해 전체를 가로 탐색한다.
  const recommendedProducts = sortByManagedProductOrder(
    productsWithBrandNames.filter((p) => p.isRecommended || p.isBest),
    'shopFeaturedOrder',
  );

  const makeHref = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === 'all' || value === '') next.delete(key);
    else next.set(key, value);

    if (key !== 'page') {
      next.delete('page');
    }

    const query = next.toString();
    return query ? `/shop?${query}` : '/shop';
  };

  const categoryOptions = getDataBackedShopCategoryOptions(
    categorySettings.productCategories,
    productsWithBrandNames.map((product) => product.categorySlug ?? product.category),
  );
  const lifestyleOptions = getLifestyleFilterOptions(
    categorySettings.lifestyleCategories,
    productsWithBrandNames.map((product) => product.lifestyleCategory),
  );

  const activeFilterCount = [
    params.petType,
    params.category,
    params.lifestyle,
    params.concern,
    params.brandId,
    params.price,
    params.rating,
  ].filter((value) => value && value !== 'all').length;

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = new URLSearchParams(searchParams.toString());
    const query = searchTerm.trim();
    if (query) next.set('search', query);
    else next.delete('search');
    next.delete('focus');
    next.delete('page'); // reset page on search
    const nextQuery = next.toString();
    router.push(nextQuery ? `/shop?${nextQuery}` : '/shop');
  };

  const clearSearch = () => {
    setSearchTerm('');
    const next = new URLSearchParams(searchParams.toString());
    next.delete('search');
    next.delete('focus');
    next.delete('page');
    const nextQuery = next.toString();
    router.push(nextQuery ? `/shop?${nextQuery}` : '/shop');
  };

  const shouldFocusSearch = searchParams.get('focus') === 'search';

  // 2026-08-27 고객 요청: 상세 필터는 고민·평점만 유지한다.
  const hasDetailFilter = Boolean(params.concern || params.rating);

  const renderFilterPanel = (onNavigate?: () => void) => (
    <div className="shop-filter-sidebar pb-8">
      <FilterGroup title={content.filters.petTypeTitle} defaultOpen>
        <FilterLink onClick={onNavigate} href={makeHref('petType', 'all')} active={!params.petType}>{content.filters.allOptionLabel}</FilterLink>
        {categorySettings.petTypes.map((petType) => (
          <FilterLink onClick={onNavigate} key={petType.id} href={makeHref('petType', petType.id)} active={params.petType === petType.id}>
            {petType.label}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title={content.filters.categoryTitle} defaultOpen>
        <FilterLink onClick={onNavigate} href={makeHref('category', 'all')} active={!params.category}>{content.filters.allOptionLabel}</FilterLink>
        {categoryOptions.map((category) => (
          <FilterLink
            key={category.slug}
            onClick={onNavigate}
            href={makeHref('category', category.slug)}
            active={normalizeShopCategory(params.category) === category.slug}
          >
            {category.label}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title={content.filters.brandTitle}>
        <FilterLink onClick={onNavigate} href={makeHref('brandId', 'all')} active={!params.brandId}>{content.filters.allOptionLabel}</FilterLink>
      <FilterGroup title="라이프스타일" defaultOpen>
        <FilterLink onClick={onNavigate} href={makeHref('lifestyle', 'all')} active={!params.lifestyle}>전체</FilterLink>
        {lifestyleOptions.map((lifestyle) => (
          <FilterLink
            key={lifestyle.slug}
            onClick={onNavigate}
            href={makeHref('lifestyle', lifestyle.slug)}
            active={params.lifestyle === lifestyle.slug}
          >
            {lifestyle.label}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="브랜드">
        <FilterLink onClick={onNavigate} href={makeHref('brandId', 'all')} active={!params.brandId}>전체</FilterLink>
        {brands.map((brand) => (
          <FilterLink onClick={onNavigate} key={brand.id} href={makeHref('brandId', brand.id)} active={params.brandId === brand.id}>
            {formatBrandDisplayName(brand.name)}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title={content.filters.priceTitle}>
        {priceOptions.map((option) => (
          <FilterLink onClick={onNavigate} key={option.id} href={makeHref('price', option.id)} active={priceRange === option.id}>
            {option.label}
          </FilterLink>
        ))}
      </FilterGroup>

      {/* 상세 필터 — 고민·평점은 기본 노출에서 분리.
          해당 필터가 이미 적용된 상태라면 접힌 채 숨지 않도록 펼쳐서 보여준다. */}
      <details open={hasDetailFilter} className="group border-b border-[#E7E0D5] py-4">
        <summary className="cursor-pointer list-none py-1 text-[13px] font-semibold tracking-wide text-[#59615B] transition-colors hover:text-[#A8742E]">
          {content.filters.detailLabel} +
        </summary>
        <div className="mt-1">
          <FilterGroup title={content.filters.concernTitle}>
            <FilterLink onClick={onNavigate} href={makeHref('concern', 'all')} active={!params.concern}>{content.filters.allOptionLabel}</FilterLink>
            {concernOptions.map((concern) => (
              <FilterLink onClick={onNavigate} key={concern.slug} href={makeHref('concern', concern.slug)} active={params.concern === concern.slug}>
                {concern.title}
              </FilterLink>
            ))}
          </FilterGroup>

          <FilterGroup title={content.filters.ratingTitle}>
            <FilterLink onClick={onNavigate} href={makeHref('rating', 'all')} active={!params.rating}>{content.filters.allOptionLabel}</FilterLink>
            {categorySettings.ratingRanges.map((rating) => (
              <FilterLink onClick={onNavigate} key={rating.id} href={makeHref('rating', rating.id)} active={params.rating === rating.id}>
                {rating.label}
              </FilterLink>
            ))}
          </FilterGroup>
        </div>
      </details>

      <Link href="/shop" scroll={false} onClick={onNavigate} className="mt-6 inline-flex text-sm font-semibold text-[#59615B] underline underline-offset-4 transition-colors duration-500 hover:text-[#17211D]">
        {content.catalog.resetLabel}
      </Link>
    </div>
  );

  return (
    <div className="shop-container mx-auto w-[calc(100%-32px)] max-w-[1280px] pb-20 pt-10 md:w-[calc(100%-64px)] lg:pt-14">
      {/* 1. 상단 인트로 및 검색 */}
      <div className="shop-intro mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#7A4E1D]">{content.hero.eyebrow}</p>
          <h1 className="text-[36px] font-bold leading-tight text-[#17211D] md:text-[42px]">{content.hero.title}</h1>
          <p className="mt-2 text-[15px] text-[#59615B]">{content.hero.description}</p>
        </div>
        <form onSubmit={handleSearchSubmit} role="search" className="flex h-12 w-full shrink-0 items-center rounded-full border border-[#E7E0D5] bg-white px-4 transition-colors duration-500 focus-within:border-[#A8742E] focus-within:ring-2 focus-within:ring-[#A8742E]/10 md:w-[420px]">
          <Search aria-hidden="true" className="mr-3 size-4 shrink-0 text-[#59615B]" />
          <label htmlFor="shop-search" className="sr-only">상품 검색</label>
          <input
            ref={searchInputRef}
            id="shop-search"
            name="search"
            autoFocus={shouldFocusSearch}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={content.hero.searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-sm text-[#17211D] outline-none placeholder:text-[#59615B]/60"
          />
          {searchTerm && (
            <button type="button" onClick={clearSearch} aria-label="검색어 지우기" className="mr-2 rounded-full p-1 text-[#59615B] transition-colors hover:bg-[#F3EEE6] hover:text-[#17211D]">
              <X className="size-4" />
            </button>
          )}
          <button type="submit" className="rounded-full bg-[#17211D] px-4 py-2 text-xs font-semibold text-[#FBFAF7] transition-colors duration-500 hover:bg-[#202521]">
            {content.hero.searchButtonLabel}
          </button>
        </form>
      </div>

      {/* 2. 빠른 카테고리 */}
      <div className="shop-category-tabs mb-10 flex flex-wrap gap-2 border-b border-[#E7E0D5] pb-4">
        <Link href={makeHref('category', 'all')} scroll={false} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${!params.category ? 'bg-[#17211D] text-white' : 'bg-[#F3EEE6] text-[#59615B] hover:bg-[#EAE4D9] hover:text-[#17211D]'}`}>{content.catalog.allLabel}</Link>
        {categoryOptions.map(cat => (
          <Link key={cat.slug} href={makeHref('category', cat.slug)} scroll={false} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${normalizeShopCategory(params.category) === cat.slug ? 'bg-[#17211D] text-white' : 'bg-[#F3EEE6] text-[#59615B] hover:bg-[#EAE4D9] hover:text-[#17211D]'}`}>
            {cat.label}
          </Link>
        ))}
      </div>

      {/* 3. 추천 상품 영역 */}
      {content.featured.visible && recommendedProducts.length > 0 && validPage === 1 && (
        <section className="mb-14 rounded-3xl bg-[#F3EEE6]/60 p-6 lg:p-8">
          <div className="mb-6">
            <h2 className="text-[22px] font-bold text-[#17211D]">{content.featured.title}</h2>
          </div>
          <div className="flex w-full min-w-0 snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-4 hide-scrollbar">
            {recommendedProducts.map(product => (
              <div key={product.id} className="min-w-0 basis-[calc(50%-0.5rem)] shrink-0 snap-start sm:basis-[18.75rem] lg:basis-[calc(25%-0.75rem)]">
                <ProductCard product={product} variant="shop" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. 상품 툴바 */}
      <div id="shop-toolbar" ref={shopToolbarRef} className="shop-toolbar mb-6 flex min-h-12 scroll-mt-24 flex-col gap-4 border-b border-[#E7E0D5] pb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#17211D]">
            {categoryOptions.find(c => c.slug === normalizeShopCategory(params.category))?.label || content.catalog.allProductsLabel}
          </h2>
          <span className="text-sm font-medium text-[#59615B]">
            <span className="font-semibold text-[#17211D]">{totalItems}</span>{content.catalog.countSuffix}
          </span>
        </div>

        <div className="flex items-center gap-3 md:justify-end">
          <div className="hide-scrollbar flex min-w-0 flex-1 gap-3 overflow-x-auto whitespace-nowrap text-sm text-[#59615B] md:flex-none md:gap-4">
            {sortOptions.map((sort) => (
              <Link
                key={sort.id}
                href={makeHref('sort', sort.id)}
                scroll={false}
                className={`shrink-0 border-b-2 pb-1 transition-colors ${currentSort === sort.id ? 'border-[#17211D] font-semibold text-[#17211D]' : 'border-transparent hover:text-[#17211D]'}`}
              >
                {sort.label}
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            aria-expanded={mobileFiltersOpen}
            className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#E7E0D5] bg-white px-3 text-sm font-semibold text-[#17211D] md:hidden"
          >
            <SlidersHorizontal className="size-4" />
            {content.catalog.filterLabel}
            {activeFilterCount > 0 && <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-[#A8742E] text-[10px] text-white">{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      {/* 6. 모바일 필터 (Bottom Sheet) */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-[#17211D]/40 backdrop-blur-sm md:hidden" onClick={() => setMobileFiltersOpen(false)}>
          <section
            ref={mobileFilterRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] w-full flex-col overflow-y-auto rounded-t-3xl bg-[#FBFAF7] p-6 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between border-b border-[#E7E0D5] pb-4">
              <h2 id="mobile-filter-title" className="text-xl font-bold text-[#17211D]">{content.catalog.filterLabel}</h2>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="필터 닫기" className="rounded-full p-2 text-[#59615B] hover:bg-[#F3EEE6] hover:text-[#17211D]">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderFilterPanel()}
            </div>
            <div className="sticky bottom-0 mt-2 border-t border-[#E7E0D5] bg-[#FBFAF7] pt-4">
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="btn-primary min-h-12 w-full text-base">
                {totalItems}{content.catalog.resultsButtonSuffix}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 5. PC 필터 및 7. 상품 그리드 */}
      <div className="flex flex-col md:flex-row md:items-start md:gap-8 lg:gap-10">
        <aside className="hidden w-[210px] shrink-0 pt-0 md:sticky md:top-24 md:block lg:w-[220px]">
          {renderFilterPanel()}
        </aside>

        <div className="min-w-0 flex-1">
          {paginatedProducts.length > 0 ? (
            <>
              <div className="shop-product-grid grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4 xl:gap-6">
                {paginatedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} variant="shop" />
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="shop-pagination mt-12 flex items-center justify-center gap-2 lg:mt-16">
                  <Link
                    href={makeHref('page', String(validPage - 1)) + '#shop-toolbar'}
                    className={`flex size-11 items-center justify-center rounded-xl border border-[#E7E0D5] transition-colors ${validPage <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-[#F3EEE6]'}`}
                    aria-label="이전 페이지"
                  >
                    <ChevronLeft className="size-5" />
                  </Link>

                  <div className="hidden gap-1.5 sm:flex">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                      if (totalPages > 7) {
                        if (p !== 1 && p !== totalPages && Math.abs(p - validPage) > 1) {
                          if (p === 2 || p === totalPages - 1) return <span key={p} className="flex size-11 items-center justify-center text-[#8A918B]">...</span>;
                          return null;
                        }
                      }
                      return (
                        <Link
                          key={p}
                          href={makeHref('page', String(p)) + '#shop-toolbar'}
                          className={`flex size-11 items-center justify-center rounded-xl text-sm font-bold transition-colors ${p === validPage ? 'bg-[#17211D] text-white' : 'text-[#59615B] hover:bg-[#F3EEE6] hover:text-[#17211D]'}`}
                          aria-current={p === validPage ? 'page' : undefined}
                        >
                          {p}
                        </Link>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-center px-4 text-sm font-semibold text-[#17211D] sm:hidden">
                    {validPage} <span className="mx-1.5 font-normal text-[#8A918B]">/</span> {totalPages}
                  </div>

                  <Link
                    href={makeHref('page', String(validPage + 1)) + '#shop-toolbar'}
                    className={`flex size-11 items-center justify-center rounded-xl border border-[#E7E0D5] transition-colors ${validPage >= totalPages ? 'pointer-events-none opacity-40' : 'hover:bg-[#F3EEE6]'}`}
                    aria-label="다음 페이지"
                  >
                    <ChevronRight className="size-5" />
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#D8C4A3] bg-[#FAF8F3] px-6 py-20 text-center">
              <p className="text-lg font-bold text-[#17211D]">{content.empty.title}</p>
              <Link href="/shop" scroll={false} className="btn-primary mt-8 inline-flex px-8">
                {content.empty.buttonLabel}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShopContent({ products, brands, productTags, content }: Props) {
  return (
    <main className="shop-page min-h-dvh bg-[#FBFAF7]">
      <Suspense fallback={<div className="shop-container mx-auto w-[calc(100%-32px)] max-w-[1280px] py-16"><div className="h-96 animate-pulse rounded-3xl bg-[#E7E0D5]/50" /></div>}>
        <ShopInner products={products} brands={brands} productTags={productTags} content={content} />
      </Suspense>
    </main>
  );
}

function FilterGroup({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-[#E7E0D5] py-4">
      <summary className="cursor-pointer list-none py-1 text-[15px] font-bold text-[#17211D] transition-colors hover:text-[#A8742E]">
        {title}
      </summary>
      <div className="mt-3 flex flex-wrap gap-1.5 md:flex-col md:items-stretch md:gap-1">{children}</div>
    </details>
  );
}

function FilterLink({
  href,
  active,
  children,
  onClick,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link onClick={onClick} href={href} scroll={false} className={`flex min-h-9 items-center rounded-lg px-3 text-[13px] transition-colors duration-300 md:px-2 ${active ? 'bg-[#F3EEE6] font-bold text-[#17211D]' : 'text-[#59615B] hover:bg-[#FAF8F3] hover:text-[#17211D]'}`}>
      {children}
    </Link>
  );
}

function getLifestyleFilterOptions(
  configuredValues: readonly string[],
  productValues: readonly string[],
): LifestyleFilterOption[] {
  const options = new Map<string, LifestyleFilterOption>();

  for (const value of [...configuredValues, ...productValues]) {
    const label = value.trim();
    if (!label || options.has(label)) continue;
    options.set(label, { slug: label, label });
  }

  return [...options.values()];
}
