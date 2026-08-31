'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ExternalLink, Search } from 'lucide-react';
import type { Product, Brand } from '@/types';
import { updateProduct } from '@/lib/storage';
import { formatBrandDisplayName } from '@/lib/brands/presentation';
import {
  productPopularityScore,
  sortByManagedProductOrder,
  type ProductOrderField,
} from '@/lib/products/displayOrder';

import PageHeader from '@/components/admin-new/common/PageHeader';
import SaveBar from '@/components/admin-new/common/SaveBar';

interface ProductDisplayManagerProps {
  initialProducts: Product[];
  brands: Brand[];
}

type TabType = 'best' | 'recommended' | 'visible';
type OrderSurface = 'home' | 'shopFeatured' | 'catalog';

const TAB_INFO: Record<TabType, {
  label: string;
  appliedLabel: string;
  description: string;
  destinations: string[];
}> = {
  best: {
    label: '베스트 상품',
    appliedLabel: 'BEST 표시',
    description: '별도 페이지에 등록하는 기능이 아닙니다. 판매 노출된 상품 카드에 BEST 배지를 붙이고 홈·스토어 추천 상품 후보에도 포함합니다.',
    destinations: ['홈(/) → 베스트·추천 상품 영역', '스토어(/shop) → 상단 추천 상품 영역', '모든 상품 카드 → BEST 배지'],
  },
  recommended: {
    label: '추천 상품 (MD)',
    appliedLabel: '추천',
    description: '판매 노출된 상품을 홈과 스토어의 추천 영역 후보로 등록합니다. 홈은 홈 순서의 1~3번만 실제로 보입니다.',
    destinations: ['홈(/) → 베스트·추천 상품 영역 1~3번', '스토어(/shop) → 상단 추천 상품 영역 전체', '전문가(/experts) → 상품의 전문가 관점도 선택된 경우'],
  },
  visible: {
    label: '스토어 노출 상태',
    appliedLabel: '판매 노출',
    description: '켜면 상품 상세 주소가 열리고 스토어 전체 상품과 해당 브랜드 상품에 연결됩니다. 끄면 추천·BEST가 켜져 있어도 고객에게 보이지 않습니다.',
    destinations: ['스토어(/shop) → 전체 상품', '브랜드 상세(/brands/브랜드주소) → 대표 상품 영역', '상품 상세(/shop/상품번호)'],
  },
};

const ORDER_INFO: Record<OrderSurface, {
  label: string;
  shortLabel: string;
  href: string;
  field: ProductOrderField;
  description: string;
}> = {
  home: {
    label: '홈 추천 상품 순서',
    shortLabel: '홈',
    href: '/',
    field: 'homeFeaturedOrder',
    description: '고객 홈 화면의 베스트·추천 상품 영역입니다. 1~3번 상품만 실제 홈에 보이고 4번부터는 후보로 대기합니다.',
  },
  shopFeatured: {
    label: '스토어 추천 상품 순서',
    shortLabel: '스토어 추천',
    href: '/shop',
    field: 'shopFeaturedOrder',
    description: '고객 스토어 첫 페이지 상단 추천 상품 영역의 왼쪽부터 표시되는 순서입니다.',
  },
  catalog: {
    label: '스토어 전체 상품 기본 순서',
    shortLabel: '스토어 전체',
    href: '/shop?sort=recommended',
    field: 'catalogOrder',
    description: '고객 스토어의 전체 상품 기본 정렬과 브랜드 상품의 순서입니다. 고객이 가격순·후기순 등을 선택하면 고객이 선택한 정렬이 우선합니다.',
  },
};

function isFeatured(product: Product): boolean {
  return product.isBest || product.isRecommended;
}

function stateField(tab: TabType): 'isBest' | 'isRecommended' | 'isVisible' {
  if (tab === 'best') return 'isBest';
  if (tab === 'recommended') return 'isRecommended';
  return 'isVisible';
}

export default function ProductDisplayManager({ initialProducts, brands }: ProductDisplayManagerProps) {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [activeTab, setActiveTab] = useState<TabType>('best');
  const [activeOrderSurface, setActiveOrderSurface] = useState<OrderSurface>('home');
  const [keyword, setKeyword] = useState('');
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, Partial<Product>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const activeInfo = TAB_INFO[activeTab];
  const activeOrderInfo = ORDER_INFO[activeOrderSurface];

  const displayProducts = products.map((product) => ({
    ...product,
    ...(pendingUpdates[product.id] || {}),
  }));
  const brandById = new Map(brands.map((brand) => [brand.id, brand]));
  const visibleProducts = displayProducts.filter((product) => product.isVisible);
  const visibleFeaturedProducts = visibleProducts.filter(isFeatured);

  const homeProducts = sortByManagedProductOrder(
    visibleFeaturedProducts,
    'homeFeaturedOrder',
    (a, b) => productPopularityScore(b) - productPopularityScore(a),
  );
  const shopFeaturedProducts = sortByManagedProductOrder(
    visibleFeaturedProducts,
    'shopFeaturedOrder',
  );
  const catalogProducts = sortByManagedProductOrder(
    visibleProducts,
    'catalogOrder',
    (a, b) => Number(b.isRecommended) - Number(a.isRecommended),
  );

  const orderedProducts = activeOrderSurface === 'home'
    ? homeProducts
    : activeOrderSurface === 'shopFeatured'
      ? shopFeaturedProducts
      : catalogProducts;

  const getFilteredProducts = () => {
    const field = stateField(activeTab);
    return displayProducts.filter((product) => {
      if (!product[field]) return false;
      return !keyword || (product.name ?? '').toLocaleLowerCase('ko-KR').includes(keyword.toLocaleLowerCase('ko-KR'));
    });
  };

  const getAvailableProducts = () => {
    const field = stateField(activeTab);
    return displayProducts.filter((product) => {
      if (product[field]) return false;
      return !keyword || (product.name ?? '').toLocaleLowerCase('ko-KR').includes(keyword.toLocaleLowerCase('ko-KR'));
    });
  };

  const handleToggleState = (
    id: string,
    field: 'isBest' | 'isRecommended' | 'isVisible',
    value: boolean,
  ) => {
    setPendingUpdates((previous) => ({
      ...previous,
      [id]: { ...(previous[id] || {}), [field]: value },
    }));
  };

  const handleMove = (id: string, direction: 'up' | 'down') => {
    const currentIndex = orderedProducts.findIndex((product) => product.id === id);
    const nextIndex = currentIndex + (direction === 'up' ? -1 : 1);
    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= orderedProducts.length) return;

    const nextOrder = [...orderedProducts];
    [nextOrder[currentIndex], nextOrder[nextIndex]] = [nextOrder[nextIndex], nextOrder[currentIndex]];
    const field = activeOrderInfo.field;
    setPendingUpdates((previous) => {
      const next = { ...previous };
      nextOrder.forEach((product, index) => {
        next[product.id] = { ...(next[product.id] || {}), [field]: index };
      });
      return next;
    });
  };

  const handleSave = async () => {
    const ids = Object.keys(pendingUpdates);
    if (ids.length === 0) return;
    setIsSaving(true);

    try {
      for (const id of ids) {
        const { error } = await updateProduct(id, pendingUpdates[id]);
        if (error) throw new Error(error);
      }
      setProducts(displayProducts);
      setPendingUpdates({});
      router.refresh();
    } catch (error) {
      window.alert(`진열 상태 저장에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getBrandPlacement = (product: Product): string | null => {
    const brand = brandById.get(product.brandId);
    if (!brand) return null;
    const brandProducts = catalogProducts.filter((item) => item.brandId === brand.id);
    const representativeProducts = brandProducts.filter((item) => brand.representativeProductIds.includes(item.id));
    const displayed = representativeProducts.length > 0 ? representativeProducts : brandProducts;
    const index = displayed.findIndex((item) => item.id === product.id);
    if (index >= 0) return `브랜드 상세 → 대표 상품 ${index + 1}번째`;
    return '브랜드 상세 → 대표 상품으로 선택되지 않아 카드 미표시';
  };

  const renderPlacementSummary = (product: Product) => {
    if (!product.isVisible) {
      return (
        <div className="mt-2 rounded bg-[#FFF5F3] px-2.5 py-2 text-[11px] font-medium leading-5 text-[#A34232]">
          고객 화면 미노출 — 판매 노출을 켜야 아래 연결이 실제로 보입니다.
        </div>
      );
    }

    const catalogIndex = catalogProducts.findIndex((item) => item.id === product.id);
    const homeIndex = homeProducts.findIndex((item) => item.id === product.id);
    const shopFeaturedIndex = shopFeaturedProducts.findIndex((item) => item.id === product.id);
    const brandPlacement = getBrandPlacement(product);
    const placements = [
      `스토어 전체 → ${catalogIndex + 1}번째${catalogIndex >= 20 ? ` (${Math.floor(catalogIndex / 20) + 1}페이지)` : ''}`,
      isFeatured(product)
        ? homeIndex < 3
          ? `홈 추천 → ${homeIndex + 1}번째`
          : `홈 추천 후보 ${homeIndex + 1}번째 → 홈에는 1~3번만 표시`
        : null,
      isFeatured(product) ? `스토어 추천 → ${shopFeaturedIndex + 1}번째` : null,
      product.isBest ? '모든 상품 카드 → BEST 배지 표시' : null,
      brandPlacement,
      `상품 상세 → /shop/${product.id}`,
    ].filter((item): item is string => Boolean(item));

    return (
      <div className="mt-2 space-y-1 text-[11px] leading-4 text-[#59665E]">
        {placements.map((placement) => <p key={placement}>• {placement}</p>)}
      </div>
    );
  };

  const renderProductItem = (product: Product, isAdding: boolean) => {
    const brandName = formatBrandDisplayName(brandById.get(product.brandId)?.name || '브랜드 없음');
    const field = stateField(activeTab);
    return (
      <div data-testid="display-state-product" key={product.id} className="flex items-start gap-3 rounded-md border border-gray-200 bg-white p-3 shadow-sm transition-colors hover:border-gray-300">
        <div className="h-11 w-11 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[9px] text-gray-300">이미지 없음</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-medium text-[#17201B]">{product.name}</p>
          <p className="truncate text-[12px] text-gray-500">{brandName}</p>
          {!isAdding && renderPlacementSummary(product)}
        </div>
        <div className="shrink-0 border-l border-gray-100 pl-3">
          <button
            type="button"
            onClick={() => handleToggleState(product.id, field, isAdding)}
            className={isAdding
              ? 'rounded bg-[#F3EEE6] px-3 py-1.5 text-[12px] font-medium text-[#8B5E21] hover:bg-[#EBE2D3]'
              : 'rounded bg-red-50 px-3 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-100'}
          >
            {isAdding ? '적용' : '해제'}
          </button>
        </div>
      </div>
    );
  };

  const hasChanges = Object.keys(pendingUpdates).length > 0;

  return (
    <div className="space-y-7 pb-28">
      <PageHeader
        title="상품 진열"
        description="상품의 판매 노출·추천·BEST와 고객 화면별 상품 순서는 이 화면 한 곳에서만 변경합니다."
      />

      <section className="border border-[#D8E0D9] bg-[#F5F8F5] p-5">
        <h2 className="text-[15px] font-semibold text-[#24432F]">이 상품이 어디에 보이는지 먼저 확인하세요</h2>
        <p className="mt-1 text-[12px] leading-5 text-[#59665E]">
          판매 노출이 가장 먼저입니다. 판매 노출을 끄면 추천·BEST 상태가 남아 있어도 고객 화면에는 하나도 보이지 않습니다.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['홈', '/', '베스트·추천 후보 중 홈 순서 1~3번'],
            ['스토어 추천', '/shop', '베스트·추천 후보 전체'],
            ['스토어 전체', '/shop?sort=recommended', '판매 노출 상품 전체·20개씩 페이지 표시'],
            ['브랜드 상세', '/brands', '판매 노출 + 해당 브랜드 대표상품 설정'],
          ].map(([label, href, description]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className="rounded border border-[#D8E0D9] bg-white p-3 hover:border-[#799080]">
              <span className="flex items-center justify-between text-[13px] font-semibold text-[#17201B]">
                {label}<ExternalLink size={14} aria-hidden="true" />
              </span>
              <span className="mt-1 block text-[11px] leading-4 text-[#68756D]">{description}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-[#E1DDD5] bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-[#17201B]">고객 화면별 진열 순서 변경</h2>
            <p className="mt-1 text-[12px] leading-5 text-[#68756D]">
              화면을 먼저 선택한 뒤 위·아래 버튼으로 옮깁니다. 선택한 화면의 순서만 바뀌며 다른 화면 순서는 바뀌지 않습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="순서를 변경할 고객 화면">
            {(Object.entries(ORDER_INFO) as Array<[OrderSurface, (typeof ORDER_INFO)[OrderSurface]]>).map(([id, info]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeOrderSurface === id}
                onClick={() => setActiveOrderSurface(id)}
                className={`min-h-10 rounded border px-3 text-[12px] font-semibold ${
                  activeOrderSurface === id
                    ? 'border-[#17201B] bg-[#17201B] text-white'
                    : 'border-[#D6D7D2] bg-white text-[#4D5851] hover:border-[#17201B]'
                }`}
              >
                {info.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded border border-[#E5E1D9] bg-[#FAF9F6] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[#17201B]">현재 선택: {activeOrderInfo.label}</p>
              <p className="mt-1 text-[12px] leading-5 text-[#68756D]">{activeOrderInfo.description}</p>
            </div>
            <a href={activeOrderInfo.href} target="_blank" rel="noreferrer" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 border border-[#CFD2CC] bg-white px-3 text-[12px] font-semibold text-[#2F3B34] hover:bg-[#F3EEE6]">
              고객 화면 열기 <ExternalLink size={14} aria-hidden="true" />
            </a>
          </div>

          {orderedProducts.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-gray-400">
              {activeOrderSurface === 'catalog' ? '판매 노출된 상품이 없습니다.' : '판매 노출과 추천 또는 BEST가 모두 설정된 상품이 없습니다.'}
            </div>
          ) : (
            <ol className="mt-4 space-y-2">
              {orderedProducts.map((product, index) => {
                const brandName = formatBrandDisplayName(brandById.get(product.brandId)?.name || '브랜드 없음');
                const homeWaiting = activeOrderSurface === 'home' && index >= 3;
                return (
                  <li key={product.id} className="flex items-center gap-3 rounded border border-[#DFE1DC] bg-white p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#17201B] text-[12px] font-bold text-white">{index + 1}</span>
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded border border-gray-200 bg-gray-100">
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.image} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#17201B]">{product.name}</p>
                      <p className="mt-0.5 truncate text-[11px] text-[#68756D]">
                        {brandName} · {homeWaiting ? '홈 미표시 대기(4번 이하)' : `${activeOrderInfo.shortLabel}에 실제 표시`}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => handleMove(product.id, 'up')} disabled={index === 0} aria-label={`${product.name} 위로 이동`} className="flex h-9 w-9 items-center justify-center rounded border border-gray-200 bg-white text-[#3D4741] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30">
                        <ArrowUp size={15} aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => handleMove(product.id, 'down')} disabled={index === orderedProducts.length - 1} aria-label={`${product.name} 아래로 이동`} className="flex h-9 w-9 items-center justify-center rounded border border-gray-200 bg-white text-[#3D4741] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30">
                        <ArrowDown size={15} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="border-b border-gray-200">
          <nav className="flex gap-7 overflow-x-auto">
            {(Object.entries(TAB_INFO) as Array<[TabType, (typeof TAB_INFO)[TabType]]>).map(([id, tab]) => (
              <button key={id} type="button" onClick={() => { setActiveTab(id); setKeyword(''); }} aria-pressed={activeTab === id} className={`whitespace-nowrap border-b-2 px-1 py-4 text-[14px] font-medium ${activeTab === id ? 'border-[#17201B] text-[#17201B]' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}`}>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="border border-[#D8E0D9] bg-[#F5F8F5] px-5 py-4">
          <p className="text-[13px] font-semibold text-[#24432F]">현재 관리: {activeInfo.label}</p>
          <p className="mt-1 text-[12px] leading-5 text-[#59665E]">{activeInfo.description}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {activeInfo.destinations.map((destination) => <span key={destination} className="rounded-full border border-[#D5DDD6] bg-white px-2.5 py-1 text-[11px] text-[#4F5D54]">{destination}</span>)}
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-[15px] font-semibold text-[#17201B]">
              현재 {activeInfo.appliedLabel} 적용 상품
              <span className="ml-2 text-[13px] font-normal text-gray-500">{getFilteredProducts().length}개</span>
            </h3>
            <div className="min-h-[400px] rounded-md border border-gray-200 bg-gray-50 p-4">
              {getFilteredProducts().length === 0 ? (
                <div className="flex min-h-[330px] flex-col items-center justify-center py-16 text-gray-400">
                  <p className="text-[13px]">현재 적용된 상품이 없습니다.</p>
                  <p className="mt-1 text-[12px]">오른쪽 목록에서 적용할 상품을 선택해 주세요.</p>
                </div>
              ) : (
                <div className="space-y-2">{getFilteredProducts().map((product) => renderProductItem(product, false))}</div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[15px] font-semibold text-[#17201B]">{activeInfo.appliedLabel} 적용 가능한 상품</h3>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Search size={16} className="text-gray-400" aria-hidden="true" /></div>
              <input type="text" value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="상품명으로 검색..." className="block w-full rounded-md border border-gray-300 py-2 pl-10 pr-3 text-[13px] focus:border-[#17201B] focus:ring-[#17201B]" />
            </div>
            <div className="max-h-[720px] overflow-y-auto rounded-md border border-gray-200 bg-white p-4">
              {getAvailableProducts().length === 0 ? (
                <div className="py-10 text-center text-[13px] text-gray-400">{keyword ? '검색 결과가 없습니다.' : '적용할 수 있는 상품이 없습니다.'}</div>
              ) : (
                <div className="space-y-2">{getAvailableProducts().map((product) => renderProductItem(product, true))}</div>
              )}
            </div>
          </div>
        </div>
      </section>

      <SaveBar
        isVisible={hasChanges}
        message={`${Object.keys(pendingUpdates).length}개 상품의 진열 상태 또는 순서가 변경되었습니다.`}
        onSave={handleSave}
        onCancel={() => setPendingUpdates({})}
        saveLabel="변경사항 적용"
        cancelLabel="취소"
        isSaving={isSaving}
      />
    </div>
  );
}
