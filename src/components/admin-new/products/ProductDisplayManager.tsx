'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ExternalLink, Search } from 'lucide-react';
import type { Brand, Product } from '@/types';
import { updateProduct } from '@/lib/storage';
import { formatBrandDisplayName } from '@/lib/brands/presentation';
import {
  sortProductsByDisplayOrder,
  type ProductDisplayOrderField,
} from '@/lib/products/displayOrder';

import PageHeader from '@/components/admin-new/common/PageHeader';
import SaveBar from '@/components/admin-new/common/SaveBar';

interface ProductDisplayManagerProps {
  initialProducts: Product[];
  brands: Brand[];
}

type TabType = 'home' | 'daily-pick' | 'store';
type MembershipField = 'isRecommended' | 'isBest' | 'isVisible';

interface DisplayTabConfig {
  id: TabType;
  shortLabel: string;
  location: string;
  route: '/' | '/shop';
  description: string;
  membershipField: MembershipField;
  orderField: ProductDisplayOrderField;
  limit?: number;
}

const DISPLAY_TABS: DisplayTabConfig[] = [
  {
    id: 'home',
    shortLabel: '홈 추천',
    location: '고객 홈 > 오늘의 추천',
    route: '/',
    description: '선택한 상품 중 위에서부터 3개가 고객 홈의 오늘의 추천 영역에 노출됩니다.',
    membershipField: 'isRecommended',
    orderField: 'homeDisplayOrder',
    limit: 3,
  },
  {
    id: 'daily-pick',
    shortLabel: 'DAILY PICK',
    location: '스토어 > DAILY PICK',
    route: '/shop',
    description: 'BEST로 선택한 상품이 스토어 상단의 가로 DAILY PICK 영역에 이 순서대로 노출됩니다.',
    membershipField: 'isBest',
    orderField: 'dailyPickDisplayOrder',
  },
  {
    id: 'store',
    shortLabel: '전체 상품',
    location: '스토어 > 전체 상품',
    route: '/shop',
    description: '공개 상태인 상품이 스토어 기본 추천순에서 이 순서대로 노출됩니다.',
    membershipField: 'isVisible',
    orderField: 'storeDisplayOrder',
  },
];

export default function ProductDisplayManager({ initialProducts, brands }: ProductDisplayManagerProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [keyword, setKeyword] = useState('');
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, Partial<Product>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const activeConfig = DISPLAY_TABS.find((tab) => tab.id === activeTab) ?? DISPLAY_TABS[0];
  const displayProducts = products.map((product) => ({
    ...product,
    ...(pendingUpdates[product.id] || {}),
  }));
  const selectedProducts = sortProductsByDisplayOrder(
    displayProducts.filter((product) => Boolean(product[activeConfig.membershipField])),
    activeConfig.orderField,
  );
  const normalizedKeyword = keyword.trim().toLocaleLowerCase('ko-KR');
  const availableProducts = displayProducts.filter((product) => {
    if (product[activeConfig.membershipField]) return false;
    if (!normalizedKeyword) return true;
    const brandName = brands.find((brand) => brand.id === product.brandId)?.name ?? '';
    return `${product.name} ${brandName}`.toLocaleLowerCase('ko-KR').includes(normalizedKeyword);
  });

  const patchProduct = (id: string, patch: Partial<Product>) => {
    setPendingUpdates((previous) => ({
      ...previous,
      [id]: { ...(previous[id] || {}), ...patch },
    }));
  };

  const handleAdd = (id: string) => {
    patchProduct(id, {
      [activeConfig.membershipField]: true,
      [activeConfig.orderField]: selectedProducts.length + 1,
    });
  };

  const handleRemove = (id: string) => {
    patchProduct(id, { [activeConfig.membershipField]: false });
  };

  const handleMove = (id: string, direction: -1 | 1) => {
    const currentIndex = selectedProducts.findIndex((product) => product.id === id);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= selectedProducts.length) return;

    const reordered = [...selectedProducts];
    [reordered[currentIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[currentIndex]];
    setPendingUpdates((previous) => {
      const next = { ...previous };
      reordered.forEach((product, index) => {
        next[product.id] = {
          ...(next[product.id] || {}),
          [activeConfig.orderField]: index + 1,
        };
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
      alert(`진열 상태 저장에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.keys(pendingUpdates).length > 0;

  const productIdentity = (product: Product) => {
    const brandName = formatBrandDisplayName(brands.find((brand) => brand.id === product.brandId)?.name || '');
    return (
      <>
        <div className="size-11 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
          {product.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-gray-400">No Img</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-semibold text-[#17201B]">{product.name}</p>
          <p className="mt-0.5 truncate text-[12px] text-gray-500">{brandName}</p>
        </div>
      </>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="진열 관리"
        description="고객이 실제로 보는 화면별 상품 구성과 노출 순서를 관리합니다. 숫자가 작을수록 먼저 보입니다."
      />

      <section aria-labelledby="display-location-title" className="rounded-xl border border-[#DDD5C8] bg-[#FBF9F5] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="display-location-title" className="text-[15px] font-bold text-[#17201B]">진열 위치 선택</h2>
            <p className="mt-1 text-[12px] leading-5 text-gray-600">아래 위치를 누르면 그 고객 화면에 들어갈 상품과 순서를 따로 관리할 수 있습니다.</p>
          </div>
          <Link href={activeConfig.route} target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-[#CDBB9F] bg-white px-3 py-2 text-[12px] font-semibold text-[#7A4E1D] hover:bg-[#F5EFE5]">
            현재 고객 화면 미리보기 <ExternalLink className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {DISPLAY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setKeyword(''); }}
              aria-pressed={activeTab === tab.id}
              className={`rounded-xl border p-4 text-left transition-colors ${activeTab === tab.id ? 'border-[#17201B] bg-[#17201B] text-white' : 'border-[#DDD5C8] bg-white text-[#17201B] hover:border-[#A8742E]'}`}
            >
              <span className={`text-[11px] font-semibold ${activeTab === tab.id ? 'text-[#EAD7BC]' : 'text-[#8A6433]'}`}>{tab.route}</span>
              <strong className="mt-1 block text-[14px]">{tab.shortLabel}</strong>
              <span className={`mt-2 block text-[11px] leading-4 ${activeTab === tab.id ? 'text-white/75' : 'text-gray-500'}`}>{tab.location}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-[#E7E0D5] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#A8742E]">현재 관리 위치</p>
            <h2 className="mt-1 text-[18px] font-bold text-[#17201B]">{activeConfig.location}</h2>
            <p className="mt-2 text-[13px] leading-6 text-gray-600">{activeConfig.description}</p>
          </div>
          <span className="rounded-full bg-[#F3EEE6] px-3 py-1.5 text-[12px] font-semibold text-[#7A4E1D]">
            현재 {selectedProducts.length}개
          </span>
        </div>
        {activeConfig.limit && selectedProducts.length > activeConfig.limit && (
          <p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-800">
            홈에는 상위 {activeConfig.limit}개만 보입니다. {activeConfig.limit + 1}위부터는 대기 상태입니다.
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        <section className="space-y-4" aria-labelledby="ordered-products-title">
          <div className="flex items-center justify-between gap-3">
            <h3 id="ordered-products-title" className="text-[15px] font-semibold text-[#17201B]">노출 중인 상품 · 순서</h3>
            <span className="text-[12px] text-gray-500">위에서부터 고객 화면에 표시</span>
          </div>
          <div className="min-h-[420px] rounded-xl border border-gray-200 bg-gray-50 p-4">
            {selectedProducts.length === 0 ? (
              <div className="flex min-h-[380px] flex-col items-center justify-center text-center text-gray-400">
                <p className="text-[13px]">이 위치에 진열된 상품이 없습니다.</p>
                <p className="mt-1 text-[12px]">오른쪽 목록에서 상품을 추가해주세요.</p>
              </div>
            ) : (
              <ol className="space-y-2">
                {selectedProducts.map((product, index) => (
                  <li key={product.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#17201B] text-[12px] font-bold text-white" aria-label={`${index + 1}위`}>
                      {index + 1}
                    </span>
                    {productIdentity(product)}
                    <div className="flex shrink-0 items-center gap-1 border-l border-gray-100 pl-2">
                      <button type="button" onClick={() => handleMove(product.id, -1)} disabled={index === 0} aria-label={`${product.name} 위로 이동`} className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30">
                        <ArrowUp className="size-4" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => handleMove(product.id, 1)} disabled={index === selectedProducts.length - 1} aria-label={`${product.name} 아래로 이동`} className="rounded-md border border-gray-200 p-2 text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30">
                        <ArrowDown className="size-4" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => handleRemove(product.id)} className="ml-1 rounded-md bg-red-50 px-3 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-100">
                        빼기
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <section className="space-y-4" aria-labelledby="available-products-title">
          <h3 id="available-products-title" className="text-[15px] font-semibold text-[#17201B]">이 위치에 추가할 상품</h3>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="상품명 또는 브랜드명으로 검색"
              className="block w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-3 text-[13px] focus:border-[#17201B] focus:ring-[#17201B]"
            />
          </div>
          <div className="max-h-[620px] overflow-y-auto rounded-xl border border-gray-200 bg-white p-4">
            {availableProducts.length === 0 ? (
              <div className="py-10 text-center text-[13px] text-gray-400">{keyword ? '검색 결과가 없습니다.' : '추가할 수 있는 상품이 없습니다.'}</div>
            ) : (
              <div className="space-y-2">
                {availableProducts.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 hover:border-gray-300">
                    {productIdentity(product)}
                    <button type="button" onClick={() => handleAdd(product.id)} className="shrink-0 rounded-md bg-[#F3EEE6] px-3 py-2 text-[12px] font-semibold text-[#8A6433] hover:bg-[#EBE2D3]">
                      추가
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      <SaveBar
        isVisible={hasChanges}
        message={`${Object.keys(pendingUpdates).length}개 상품의 진열 위치 또는 순서가 변경되었습니다.`}
        onSave={handleSave}
        onCancel={() => setPendingUpdates({})}
        saveLabel="진열 변경 저장"
        cancelLabel="취소"
        isSaving={isSaving}
      />
    </div>
  );
}
