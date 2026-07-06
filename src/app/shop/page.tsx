import Link from 'next/link';
import { brands } from '@/data/brands';
import { concerns } from '@/data/concerns';
import { products } from '@/data/products';
import ProductCard from '@/components/common/ProductCard';
import { filterProducts, sortProducts, SortOption } from '@/lib/filters';

export const metadata = {
  title: '쇼핑',
  description: '검증된 성분, 엄선된 퀄리티. 백조오브제가 큐레이션한 프리미엄 상품을 쇼핑하세요.',
};

const categoryOptions = ['사료', '간식', '영양제', '위생용품', '생활용품', '장난감', '산책용품', '미용용품'];
const lifestyleOptions = ['식사와 영양', '건강과 관리', '향기와 위생', '주거와 미학', '놀이와 활동', '기록과 소품'];
const ageOptions = [
  { id: 'all', label: '전체 연령' },
  { id: 'puppy', label: '퍼피/키튼' },
  { id: 'adult', label: '성견/성묘' },
  { id: 'senior', label: '시니어' },
];
const priceOptions = [
  { id: 'all', label: '전체 가격' },
  { id: 'under-20000', label: '2만원 미만' },
  { id: '20000-40000', label: '2–4만원' },
  { id: '40000-plus', label: '4만원 이상' },
];
const sortOptions: Array<{ id: SortOption; label: string }> = [
  { id: 'recommended', label: '추천순' },
  { id: 'popular', label: '인기순' },
  { id: 'newest', label: '최신순' },
  { id: 'reviews', label: '리뷰순' },
  { id: 'price-low', label: '낮은 가격순' },
  { id: 'price-high', label: '높은 가격순' },
];

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const currentSort = (params.sort as SortOption) || 'recommended';
  const priceRange = params.price || 'all';
  const minPrice = priceRange === '20000-40000' ? 20000 : priceRange === '40000-plus' ? 40000 : undefined;
  const maxPrice = priceRange === 'under-20000' ? 19999 : priceRange === '20000-40000' ? 40000 : undefined;

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

  const makeHref = (key: string, value: string) => {
    const next = new URLSearchParams();
    Object.entries(params).forEach(([paramKey, paramValue]) => {
      if (paramValue) next.set(paramKey, paramValue);
    });
    if (value === 'all') next.delete(key);
    else next.set(key, value);
    const query = next.toString();
    return query ? `/shop?${query}` : '/shop';
  };

  return (
    <div className="min-h-dvh bg-[#F4F2EC] py-10">
      <div className="site-container">
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-editorial text-lg italic text-[#667368]">Curated shop</p>
            <h1 className="mt-2 text-4xl font-normal text-[#202521]">전체 상품</h1>
            <p className="mt-3 text-sm text-[#747B75]">검증된 기준을 통과한 제품만 엄선했습니다.</p>
          </div>
          <div className="text-sm text-[#747B75]">
            총 <span className="font-semibold tabular-nums text-[#2F3B34]">{filtered.length}</span>개의 상품
          </div>
        </div>

        <div className="grid gap-9 lg:grid-cols-[240px_1fr]">
          <aside className="border-t border-[#BBBDB7] lg:sticky lg:top-24 lg:self-start">
            <FilterGroup title="반려동물">
              <FilterLink href={makeHref('petType', 'all')} active={!params.petType}>전체</FilterLink>
              <FilterLink href={makeHref('petType', 'dog')} active={params.petType === 'dog'}>강아지</FilterLink>
              <FilterLink href={makeHref('petType', 'cat')} active={params.petType === 'cat'}>고양이</FilterLink>
            </FilterGroup>

            <FilterGroup title="카테고리">
              <FilterLink href={makeHref('category', 'all')} active={!params.category}>전체</FilterLink>
              {categoryOptions.map((category) => (
                <FilterLink key={category} href={makeHref('category', category)} active={params.category === category}>
                  {category}
                </FilterLink>
              ))}
            </FilterGroup>

            <FilterGroup title="고민">
              <FilterLink href={makeHref('concern', 'all')} active={!params.concern}>전체</FilterLink>
              {concerns.map((concern) => (
                <FilterLink key={concern.slug} href={makeHref('concern', concern.slug)} active={params.concern === concern.slug}>
                  {concern.title}
                </FilterLink>
              ))}
            </FilterGroup>

            <FilterGroup title="브랜드">
              <FilterLink href={makeHref('brandId', 'all')} active={!params.brandId}>전체</FilterLink>
              {brands.map((brand) => (
                <FilterLink key={brand.id} href={makeHref('brandId', brand.id)} active={params.brandId === brand.id}>
                  {brand.name}
                </FilterLink>
              ))}
            </FilterGroup>

            <FilterGroup title="연령">
              {ageOptions.map((option) => (
                <FilterLink key={option.id} href={makeHref('ageGroup', option.id)} active={(params.ageGroup || 'all') === option.id}>
                  {option.label}
                </FilterLink>
              ))}
            </FilterGroup>

            <FilterGroup title="가격">
              {priceOptions.map((option) => (
                <FilterLink key={option.id} href={makeHref('price', option.id)} active={priceRange === option.id}>
                  {option.label}
                </FilterLink>
              ))}
            </FilterGroup>

            <FilterGroup title="평점">
              <FilterLink href={makeHref('rating', 'all')} active={!params.rating}>전체 평점</FilterLink>
              <FilterLink href={makeHref('rating', '4')} active={params.rating === '4'}>4.0 이상</FilterLink>
              <FilterLink href={makeHref('rating', '4.5')} active={params.rating === '4.5'}>4.5 이상</FilterLink>
            </FilterGroup>

            <FilterGroup title="라이프스타일">
              <FilterLink href={makeHref('lifestyle', 'all')} active={!params.lifestyle}>전체</FilterLink>
              {lifestyleOptions.map((lifestyle) => (
                <FilterLink key={lifestyle} href={makeHref('lifestyle', lifestyle)} active={params.lifestyle === lifestyle}>
                  {lifestyle}
                </FilterLink>
              ))}
            </FilterGroup>

            <Link href="/shop" className="mt-5 inline-flex text-xs font-semibold text-[#5E6B61] underline underline-offset-4">
              필터 초기화
            </Link>
          </aside>

          <div>
            <div className="mb-7 flex flex-wrap justify-end gap-x-4 gap-y-2 border-b border-[#D5D4CC] pb-4 text-xs text-[#7B827C]">
              {sortOptions.map((sort) => (
                <Link
                  key={sort.id}
                  href={makeHref('sort', sort.id)}
                  className={currentSort === sort.id ? 'font-semibold text-[#202521]' : 'hover:text-[#202521]'}
                >
                  {sort.label}
                </Link>
              ))}
            </div>

            {filtered.length > 0 ? (
              <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 xl:grid-cols-4">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-[#C9C8C0] bg-[#FAF9F5] px-6 py-20 text-center">
                <p className="text-sm text-[#747B75]">조건에 맞는 상품이 없습니다.</p>
                <Link href="/shop" className="mt-5 inline-flex bg-[#2F3B34] px-5 py-3 text-sm font-semibold text-white">
                  전체 상품 보기
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="border-b border-[#D5D4CC] py-4">
      <summary className="cursor-pointer list-none text-sm font-semibold text-[#273029]">{title}</summary>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 lg:flex-col lg:items-start">{children}</div>
    </details>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`text-xs ${active ? 'font-semibold text-[#2F3B34]' : 'text-[#747B75] hover:text-[#2F3B34]'}`}>
      {children}
    </Link>
  );
}
