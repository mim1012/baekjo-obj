'use client';

import { FormEvent, Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react';
import { Brand, Concern, Product } from '@/types';
import { normalizeShopCategory, toShopCategoryOption } from '@/data/shopFilters';
import ProductCard from '@/components/common/ProductCard';
import { filterProducts, sortProducts, SortOption } from '@/lib/filters';
import { useCategorySettings } from '@/components/providers/CategorySettingsProvider';

const PRODUCTS_PER_PAGE = 20;

const ageOptions = [
  { id: 'all', label: '?„ì²´ ?°ë ¹' },
  { id: 'puppy', label: '?´ë¦° ê°•ì•„ì§€Â·ê³ ì–‘?? },
  { id: 'adult', label: '?±ê²¬Â·?±ë¬˜' },
  { id: 'senior', label: '?˜ì´ ???„ì´' },
];

const priceOptions = [
  { id: 'all', label: '?„ì²´ ê°€ê²? },
  { id: 'under-20000', label: '2ë§Œì› ë¯¸ë§Œ' },
  { id: '20000-40000', label: '2??ë§Œì›' },
  { id: '40000-plus', label: '4ë§Œì› ?´ìƒ' },
];

const sortOptions: Array<{ id: SortOption; label: string }> = [
  { id: 'recommended', label: 'ê¸°ë³¸?? },
  { id: 'popular', label: '?¸ê¸°?? },
  { id: 'newest', label: 'ìµœì‹ ?? },
  { id: 'reviews', label: '?„ê¸° ë§ì? ?? },
  { id: 'price-low', label: '??? ê°€ê²©ìˆœ' },
  { id: 'price-high', label: '?’ì? ê°€ê²©ìˆœ' },
];

interface Props {
  products: Product[];
  brands: Brand[];
  /** ê³ ë? ?„í„° ?µì…˜. ?œë²„ wrapper(page.tsx)ê°€ concerns repo ë¡??½ì–´ ?´ë ¤ì¤€??ì½˜ì„¼??. */
  concerns: Concern[];
}

function ShopInner({ products, brands, concerns }: Props) {
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

  // products/brands ???œë²„ wrapper(page.tsx)ê°€ repo(listProducts/listBrands)ë¡??´ë?
  // is_visible=true ë§?ê±¸ëŸ¬ ?´ë ¤ì¤€??ì½˜ì„¼?? ???¬ê¸°???¬í•„?°ë§?˜ì? ?ŠëŠ”??
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

  // ì¶”ì²œ ?í’ˆ?€ ?˜ì´ì§€?¤ì´?˜ê³¼ ë¶„ë¦¬???„ì²´ë¥?ê°€ë¡??ìƒ‰?œë‹¤.
  const recommendedProducts = products.filter((p) => p.isRecommended || p.isBest);

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
      <FilterGroup title="ë°˜ë ¤?™ë¬¼" defaultOpen>
        <FilterLink onClick={onNavigate} href={makeHref('petType', 'all')} active={!params.petType}>?„ì²´</FilterLink>
        <FilterLink onClick={onNavigate} href={makeHref('petType', 'dog')} active={params.petType === 'dog'}>ê°•ì•„ì§€</FilterLink>
        <FilterLink onClick={onNavigate} href={makeHref('petType', 'cat')} active={params.petType === 'cat'}>ê³ ì–‘??/FilterLink>
      </FilterGroup>

      <FilterGroup title="ì¹´í…Œê³ ë¦¬" defaultOpen>
        <FilterLink onClick={onNavigate} href={makeHref('category', 'all')} active={!params.category}>?„ì²´</FilterLink>
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

      <FilterGroup title="ê³ ë?">
        <FilterLink onClick={onNavigate} href={makeHref('concern', 'all')} active={!params.concern}>?„ì²´</FilterLink>
        {concerns.map((concern) => (
          <FilterLink onClick={onNavigate} key={concern.slug} href={makeHref('concern', concern.slug)} active={params.concern === concern.slug}>
            {concern.title}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="ë¸Œëœ??>
        <FilterLink onClick={onNavigate} href={makeHref('brandId', 'all')} active={!params.brandId}>?„ì²´</FilterLink>
        {brands.map((brand) => (
          <FilterLink onClick={onNavigate} key={brand.id} href={makeHref('brandId', brand.id)} active={params.brandId === brand.id}>
            {brand.name}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="?°ë ¹">
        {ageOptions.map((option) => (
          <FilterLink onClick={onNavigate} key={option.id} href={makeHref('ageGroup', option.id)} active={(params.ageGroup || 'all') === option.id}>
            {option.label}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="ê°€ê²?>
        {priceOptions.map((option) => (
          <FilterLink onClick={onNavigate} key={option.id} href={makeHref('price', option.id)} active={priceRange === option.id}>
            {option.label}
          </FilterLink>
        ))}
      </FilterGroup>

      <FilterGroup title="?‰ì ">
        <FilterLink onClick={onNavigate} href={makeHref('rating', 'all')} active={!params.rating}>?„ì²´ ?‰ì </FilterLink>
        <FilterLink onClick={onNavigate} href={makeHref('rating', '4')} active={params.rating === '4'}>4.0 ?´ìƒ</FilterLink>
        <FilterLink onClick={onNavigate} href={makeHref('rating', '4.5')} active={params.rating === '4.5'}>4.5 ?´ìƒ</FilterLink>
      </FilterGroup>

      <Link href="/shop" scroll={false} onClick={onNavigate} className="mt-6 inline-flex text-sm font-semibold text-[#6F766F] underline underline-offset-4 transition-colors duration-500 hover:text-[#17211D]">
        ? íƒ??ì¡°ê±´ ëª¨ë‘ ì§€?°ê¸°
      </Link>
    </div>
  );

  return (
    <div className="shop-container mx-auto w-[calc(100%-32px)] max-w-[1280px] pb-20 pt-10 md:w-[calc(100%-64px)] lg:pt-14">
      {/* 1. ?ë‹¨ ?¸íŠ¸ë¡?ë°?ê²€??*/}
      <div className="shop-intro mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[#A8742E]">Baekjo selection</p>
          <h1 className="text-[36px] font-bold leading-tight text-[#17211D] md:text-[42px]">?°ë¦¬ ?„ì´ë¥??„í•œ ?€?‰ì…˜</h1>
          <p className="mt-2 text-[15px] text-[#6F766F]">ë¸Œëœ?œì˜ ?ê°ê³??œí’ˆ ?•ë³´ë¥??´í´, ?¼ìƒ????ë§ì„ ?í’ˆ??ëª¨ìœ¼ê³??ˆì–´??</p>
        </div>
        <form onSubmit={handleSearchSubmit} role="search" className="flex h-12 w-full shrink-0 items-center rounded-full border border-[#E7E0D5] bg-white px-4 transition-colors duration-500 focus-within:border-[#A8742E] focus-within:ring-2 focus-within:ring-[#A8742E]/10 md:w-[420px]">
          <Search aria-hidden="true" className="mr-3 size-4 shrink-0 text-[#6F766F]" />
          <label htmlFor="shop-search" className="sr-only">?í’ˆ ê²€??/label>
          <input
            ref={searchInputRef}
            id="shop-search"
            name="search"
            autoFocus={shouldFocusSearch}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="?í’ˆëª…ì´??ë¸Œëœ?œë? ê²€?‰í•˜?¸ìš”"
            className="min-w-0 flex-1 bg-transparent text-sm text-[#17211D] outline-none placeholder:text-[#6F766F]/60"
          />
          {searchTerm && (
            <button type="button" onClick={clearSearch} aria-label="ê²€?‰ì–´ ì§€?°ê¸°" className="mr-2 rounded-full p-1 text-[#6F766F] transition-colors hover:bg-[#F3EEE6] hover:text-[#17211D]">
              <X className="size-4" />
            </button>
          )}
          <button type="submit" className="rounded-full bg-[#17211D] px-4 py-2 text-xs font-semibold text-[#FBFAF7] transition-colors duration-500 hover:bg-[#202521]">
            ê²€??          </button>
        </form>
      </div>

      {/* 2. ë¹ ë¥¸ ì¹´í…Œê³ ë¦¬ */}
      <div className="shop-category-tabs hide-scrollbar mb-10 flex gap-2 overflow-x-auto border-b border-[#E7E0D5] pb-4">
        <Link href={makeHref('category', 'all')} scroll={false} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${!params.category ? 'bg-[#17211D] text-white' : 'bg-[#F3EEE6] text-[#6F766F] hover:bg-[#EAE4D9] hover:text-[#17211D]'}`}>?„ì²´</Link>
        {categoryOptions.map(cat => (
          <Link key={cat.slug} href={makeHref('category', cat.slug)} scroll={false} className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${normalizeShopCategory(params.category) === cat.slug ? 'bg-[#17211D] text-white' : 'bg-[#F3EEE6] text-[#6F766F] hover:bg-[#EAE4D9] hover:text-[#17211D]'}`}>
            {cat.label}
          </Link>
        ))}
      </div>

      {/* 3. ì¶”ì²œ ?í’ˆ ?ì—­ */}
      {recommendedProducts.length > 0 && validPage === 1 && (
        <section className="mb-14 rounded-3xl bg-[#F3EEE6]/60 p-6 lg:p-8">
          <div className="mb-6 flex items-baseline gap-3">
            <h2 className="text-[22px] font-bold text-[#17211D]">?ë””??ì¶”ì²œ ?í’ˆ</h2>
            <p className="text-sm text-[#6F766F]">ì§€ê¸?ë°±ì¡°?¤ë¸Œ?œê? ê°€??ì£¼ëª©?˜ëŠ” ?œí’ˆ</p>
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

      {/* 4. ?í’ˆ ?´ë°” */}
      <div id="shop-toolbar" ref={shopToolbarRef} className="shop-toolbar mb-6 flex min-h-12 scroll-mt-24 flex-col gap-4 border-b border-[#E7E0D5] pb-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#17211D]">
            {categoryOptions.find(c => c.slug === normalizeShopCategory(params.category))?.label || '?„ì²´ ?í’ˆ'}
          </h2>
          <span className="text-sm font-medium text-[#6F766F]">
            <span className="font-semibold text-[#17211D]">{totalItems}</span>ê°?          </span>
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
            ?„í„°
            {activeFilterCount > 0 && <span className="ml-0.5 flex size-4 items-center justify-center rounded-full bg-[#A8742E] text-[10px] text-white">{activeFilterCount}</span>}
          </button>
        </div>
      </div>

      {/* 6. ëª¨ë°”???„í„° (Bottom Sheet) */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-[#17211D]/40 backdrop-blur-sm md:hidden" onClick={() => setMobileFiltersOpen(false)}>
          <section
            ref={mobileFilterRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-filter-title"
            className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] w-full flex-col overflow-y-auto rounded-t-3xl bg-white p-6 shadow-[0_-8px_40px_rgba(0,0,0,0.12)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between border-b border-[#E7E0D5] pb-4">
              <h2 id="mobile-filter-title" className="text-xl font-bold text-[#17211D]">?„í„°</h2>
              <button type="button" onClick={() => setMobileFiltersOpen(false)} aria-label="?„í„° ?«ê¸°" className="rounded-full p-2 text-[#6F766F] hover:bg-[#F3EEE6] hover:text-[#17211D]">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderFilterPanel()}
            </div>
            <div className="sticky bottom-0 mt-2 border-t border-[#E7E0D5] bg-white pt-4">
              <button type="button" onClick={() => setMobileFiltersOpen(false)} className="btn-primary min-h-12 w-full text-base">
                {totalItems}ê°??í’ˆ ë³´ê¸°
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 5. PC ?„í„° ë°?7. ?í’ˆ ê·¸ë¦¬??*/}
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

              {/* ?˜ì´ì§€?¤ì´??*/}
              {totalPages > 1 && (
                <div className="shop-pagination mt-12 flex items-center justify-center gap-2 lg:mt-16">
                  <Link
                    href={makeHref('page', String(validPage - 1)) + '#shop-toolbar'}
                    className={`flex size-11 items-center justify-center rounded-xl border border-[#E7E0D5] transition-colors ${validPage <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-[#F3EEE6]'}`}
                    aria-label="?´ì „ ?˜ì´ì§€"
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
                    aria-label="?¤ìŒ ?˜ì´ì§€"
                  >
                    <ChevronRight className="size-5" />
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#D8C4A3] bg-[#FAF8F3] px-6 py-20 text-center">
              <p className="text-lg font-bold text-[#17211D]">? íƒ??ì¡°ê±´??ë§ëŠ” ?í’ˆ??ì°¾ì? ëª»í–ˆ?´ìš”.</p>
              <p className="mt-2 text-[15px] text-[#6F766F]">ì¡°ê±´??ì¡°ê¸ˆ ?“í? ?¤ì‹œ ?´í´ë³¼ê¹Œ??</p>
              <Link href="/shop" scroll={false} className="btn-primary mt-8 inline-flex px-8">
                ?„í„° ëª¨ë‘ ì§€?°ê¸°
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ShopContent({ products, brands, concerns }: Props) {
  return (
    <main className="shop-page min-h-dvh bg-white">
      <Suspense fallback={<div className="shop-container mx-auto w-[calc(100%-32px)] max-w-[1280px] py-16"><div className="h-96 animate-pulse rounded-3xl bg-[#E7E0D5]/50" /></div>}>
        <ShopInner products={products} brands={brands} concerns={concerns} />
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
