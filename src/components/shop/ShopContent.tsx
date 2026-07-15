'use client';

import { FormEvent, Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { Brand, Product } from '@/types';
import { concerns } from '@/data/concerns';
import { normalizeShopCategory, toShopCategoryOption } from '@/data/shopFilters';
import ProductCard from '@/components/common/ProductCard';
import { filterProducts, sortProducts, SortOption } from '@/lib/filters';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';

const PRODUCTS_PER_PAGE = 20;

const ageOptions = [
  { id: 'all', label: '전체 연령' },
  { id: 'puppy', label: '어린 강아지·고양이' },
  { id: 'adult', label: '성견·성묘' },
  { id: 'senior', label: '나이 든 아이' },
];

const priceOptions = [
  { id: 'all', label: '전체 가격' },
  { id: 'under-20000', label: '2만원 미만' },
  { id: '20000-40000', label: '2–4만원' },
  { id: '40000-plus', label: '4만원 이상' },
];

const sortOptions: Array<{ id: SortOption; label: string }> = [
  { id: 'recommended', label: '기본순' },
  { id: 'popular', label: '인기순' },
  { id: 'newest', label: '최신순' },
  { id: 'reviews', label: '후기 많은 순' },
  { id: 'price-low', label: '낮은 가격순' },
  { id: 'price-high', label: '높은 가격순' },
];

interface Props {
  products: Product[];
  brands: Brand[];
}

function ShopInner({ products, brands }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { categorySettings } = useCategorySettings();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileFilterRef = useRef<HTMLElement>(null);
  const shopToolbarRef = useRef<HTMLDivElement>(null);

  const params: Record<string, string | undefined> = {
    sort: searchParams.get('sort') || undefined,
    petType: searchParams.get('petType') || undefined,
    category: searchParams.get('category') || undefined,
    lifestyle: searchParams.get('lifestyle') || undefined,
    concern: searchParams.get('concern') || undefined,
    brandId: searchParams.get('brandId') || undefined,
    ageGroup: searchParams.get('ageGroup') || undefined,
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
  const minPrice = priceRange === '20000-40000' ? 20000 : priceRange === '40000-plus' ? 40000 : undefined;
  const maxPrice = priceRange === 'under-20000' ? 19999 : priceRange === '20000-40000' ? 40000 : undefined;

  // products/brands 는 서버 wrapper(page.tsx)가 repo(listProducts/listBrands)로 이미
  // is_visible=true 만 걸러 내려준다(콘센트) — 여기서 재필터링하지 않는다.
  const filtered = sortProducts(
    filterProducts(products, {
      petType: params.petType,
      category: params.category,
      lifestyleCategory: params.lifestyle,
      concern: params.concern,
      brandId: params.brandId,
      ageGroup: params.ageGroup,
      minPrice,
      maxPrice,
      minRating: params.rating ? Number(params.rating) : undefined,
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

  // Recommended products (independent of pagination, max 4)
  const recommendedProducts = products.filter((p) => p.isRecommended || p.isBest).slice(0, 4);

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

  const rawCategoryOptions = categorySettings.productCategories.map(toShopCategoryOption);

  const categoryOptions = rawCategoryOptions.filter((cat, index, self) =>
    index === self.findIndex((c) => c.slug === cat.slug)
  );

  const activeFilterCount = [
    params.petType,
    params.category,
    params.lifestyle,
    params.concern,
    params.brandId,
    params.ageGroup,
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

  const renderFilterPanel = (onNavigate?: () => void) => (
    <div className="shop-filter-sidebar pb-8">
      <FilterGroup title="반려동물" defaultOpen>
        <FilterLink onClick={onNavigate} href={makeHref('petType', 'all')} active={!params.petType}>전체</FilterLink>
        <FilterLink onClick={onNavigate} href={makeHref('petType', 'dog')} active={params.petType === 'dog'}>강아지</FilterLink>
        <FilterLink onClick={onNavigate} href={makeHref('petType', 'cat')} active={params.petType === 'cat'}>고양이</FilterLink>
      </FilterGroup>

      <FilterGroup title="카테고리" defaultOpen>
        <FilterLink onClick={onNavigate} href={makeHref('category', 'all')} active={!params.category}>전체</FilterLink>
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

      <FilterGroup title="고민">
        <FilterLink onClick={onNavigate} href={makeHref('concern', 'all')} active={!params.concern}>전체</FilterLink>
        {concerns.map((concern) => (
          <FilterLink onClick={onNavigate} key={concern.slug} href={makeHref('concern', concern.slug)} active={params.concern === concern.slug}>
            {concern.title}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="브랜드">
        <FilterLink onClick={onNavigate} href={makeHref('brandId', 'all')} active={!params.brandId}>전체</FilterLink>
        {brands.map((brand) => (
          <FilterLink onClick={onNavigate} key={brand.id} href={makeHref('brandId', brand.id)} active={params.brandId === brand.id}>
            {brand.name}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="연령">
        {ageOptions.map((option) => (
          <FilterLink onClick={onNavigate} key={option.id} href={makeHref('ageGroup', option.id)} active={(params.ageGroup || 'all') === option.id}>
            {option.label}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="가격">
        {priceOptions.map((option) => (
          <FilterLink onClick={onNavigate} key={option.id} href={makeHref('price', option.id)} active={priceRange === option.id}>
            {option.label}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="평점">
        <FilterLink onClick={onNavigate} href={makeHref('rating', 'all')} active={!params.rating}>전체 평점</FilterLink>
        <FilterLink onClick={onNavigate} href={makeHref('rating', '4')} active={params.rating === '4'}>4.0 이상</FilterLink>
        <FilterLink onClick={onNavigate} href={makeHref('rating', '4.5')} active={params.rating === '4.5'}>4.5 이상</FilterLink>
      </FilterGroup>

      <Link href="/shop" scroll={false} onClick={onNavigate} className="mt-6 inline-flex text-sm font-semibold text-[#6F766F] underline underline-offset-4 transition-colors duration-500 hover:text-[#17211D]">
        선택한 조건 모두 지우기
      </Link>
    </div>
  );

  return (
    <div className="shop-container mx-auto w-[calc(100%-32px)] max-w-[1280px] pb-20 pt-10 md:w-[calc(100%-64px)] lg:pt-14">
      {/* 1. 상단 인트로 및 검색 */}
      <div className="shop-intro mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#A8742E]">Baekjo selection</p>
          <h1 className="text-[36px] font-bold leading-tight text-[#17211D] md:text-[42px]">우리 아이를 위한 셀렉션</h1>
          <p className="mt-2 text-[15px] text-[#6F766F]">브랜드의 생각과 제품 정보를 살펴, 일상에 잘 맞을 상품을 모으고 있어요.</p>
        </div>
        <form onSubmit={handleSearchSubmit} role="search" className="flex h-12 w-full shrink-0 items-center rounded-full border border-[#E7E0D5] bg-white px-4 transition-colors duration-500 focus-within:border-[#A8742E] focus-within:ring-2 focus-within:ring-[#A8742E]/10 md:w-[420px]">
          <Search aria-hidden="true" className="mr-3 size-4 shrink-0 text-[#6F766F]" />
          <label htmlFor="shop-search" className="sr-only">상품 검색</label>
          <input
            ref={searchInputRef}
            id="shop-search"
            name="search"
            autoFocus={shouldFocusSearch}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="상품명이나 브랜드를 검색하세요"
            className="min-w-0 flex-1 bg-transparent text-sm text-[#17211D] outline-none placeholder:text-[#6F766F]/60"
          />
          {searchTerm && (
            <button type="button" onClick={clearSearch} aria-label="검색어 지우기" className="mr-2 rounded-full p-1 text-[#6F766F] transition-colors hover:bg-[#F3EEE6] hover:text-[#17211D]">
              <X className="size-4" />
            </button>
          )}
          <button type="submit" className="rounded-full bg-[#17211D] px-4 py-2 text-xs font-semibold text-[#FBFAF7] transition-colors duration-500 hover:bg-[#202521]">
            검색
          </button>
        </form>
      </div>

      {/* 2. 빠른 카테고리 */}
      <div className="shop-category-tabs hide-scrollbar mb-10 flex gap-2 overflow-x-auto border-b border-[#E7E0D5] pb-4">
        <Link href={makeHref('category', 'all')} scroll={false} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${!params.category ? 'bg-[#17211D] text-white' : 'bg-[#F3EEE6] text-[#6F766F] hover:bg-[#EAE4D9] hover:text-[#17211D]'}`}>전체</Link>
        {categoryOptions.map(cat => (
          <Link key={cat.slug} href={makeHref('category', cat.slug)} scroll={false} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${normalizeShopCategory(params.category) === cat.slug ? 'bg-[#17211D] text-white' : 'bg-[#F3EEE6] text-[#6F766F] hover:bg-[#EAE4D9] hover:text-[#17211D]'}`}>
            {cat.label}
          </Link>
        ))}
      </div>

      {/* 3. 추천 상품 영역 */}
      {recommendedProducts.length > 0 && validPage === 1 && (
        <section className="mb-14 rounded-3xl bg-[#F3EEE6]/60 p-6 lg:p-8">
          <div className="mb-6 flex items-baseline gap-3">
            <h2 className="text-[22px] font-bold text-[#17211D]">에디터 추천 상품</h2>
            <p className="text-sm text-[#6F766F]">지금 백조오브제가 가장 주목하는 제품</p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 xl:grid-cols-4 xl:gap-6">
            {recommendedProducts.map(product => (
              <ProductCard key={product.id} product={product} variant="shop" />
            ))}
          </div>
        </section>
      )}

      {/* 4. 상품 툴바 */}
      <div id="shop-toolbar" ref={shopToolbarRef} className="shop-toolbar mb-6 flex min-h-12 scroll-mt-24 flex-col gap-4 border-b border-[#E7E0D5] pb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#17211D]">
            {categoryOptions.find(c => c.slug === normalizeShopCategory(params.category))?.label || '전체 상품'}
          </h2>
          <span className="text-sm font-medium text-[#6F766F]">
            <span className="font-semibold text-[#17211D]">{totalItems}</span>개
          </span>
        </div>

        <div className="flex items-center gap-3 md:justify-end">
          <div className="hide-scrollbar flex min-w-0 flex-1 gap-3 overflow-x-auto whitespace-nowrap text-sm text-[#8A918B] md:flex-none md:gap-4">
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
            필터
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
              <h2 id="mobile-filter-title" className="text-xl font-bold text-[#17211D]">필터</h2>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="필터 닫기" className="rounded-full p-2 text-[#6F766F] hover:bg-[#F3EEE6] hover:text-[#17211D]">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderFilterPanel()}
            </div>
            <div className="sticky bottom-0 mt-2 border-t border-[#E7E0D5] bg-[#FBFAF7] pt-4">
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="btn-primary min-h-12 w-full text-base">
                {totalItems}개 상품 보기
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
                          className={`flex size-11 items-center justify-center rounded-xl text-sm font-bold transition-colors ${p === validPage ? 'bg-[#17211D] text-white' : 'text-[#6F766F] hover:bg-[#F3EEE6] hover:text-[#17211D]'}`}
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
              <p className="text-lg font-bold text-[#17211D]">선택한 조건에 맞는 상품을 찾지 못했어요.</p>
              <p className="mt-2 text-[15px] text-[#6F766F]">조건을 조금 넓혀 다시 살펴볼까요?</p>
              <Link href="/shop" scroll={false} className="btn-primary mt-8 inline-flex px-8">
                필터 모두 지우기
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShopContent({ products, brands }: Props) {
  return (
    <main className="shop-page min-h-dvh bg-[#FBFAF7]">
      <Suspense fallback={<div className="shop-container mx-auto w-[calc(100%-32px)] max-w-[1280px] py-16"><div className="h-96 animate-pulse rounded-3xl bg-[#E7E0D5]/50" /></div>}>
        <ShopInner products={products} brands={brands} />
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
    <Link onClick={onClick} href={href} scroll={false} className={`flex min-h-9 items-center rounded-lg px-3 text-[13px] transition-colors duration-300 md:px-2 ${active ? 'bg-[#F3EEE6] font-bold text-[#17211D]' : 'text-[#6F766F] hover:bg-[#FAF8F3] hover:text-[#17211D]'}`}>
      {children}
    </Link>
  );
}
