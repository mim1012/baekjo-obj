'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultProductTagsConfig, type ProductTagsConfig } from '@/lib/productTags/config';

export interface ProductTagFilterOption {
  slug: string;
  label: string;
}

interface ProductTagSettingsValue {
  /** slug → 관리자가 저장한 고객 노출 이름. 미등록 slug는 값이 없다 — 호출부가 slug 원문으로 폴백한다. */
  labelBySlug: Record<string, string>;
  /** 고객 카드에 노출해야 하는 slug 목록(isVisible=true). */
  visibleSlugs: string[];
  /** 관리자가 삭제한 slug — 상품에 남아 있어도 고객 화면에서 완전히 숨긴다. */
  hiddenSlugs: string[];
  /** 스토어 '고민' 필터에 노출할 옵션(showInShopFilter=true && isVisible=true), 저장 순서 그대로. */
  filterOptions: ProductTagFilterOption[];
}

interface ProductTagSettingsContextType extends ProductTagSettingsValue {
  /** true = 마운트 후 GET /api/product-tags 가 성공적으로 resolve 됐다(DB 실 데이터든, 서버 폴백
   * default 든 무관). 공개 소비자(ProductCard·ShopContent)는 이 값을 쓰지 않고 그대로
   * default-first 렌더를 유지한다 — CategorySettingsProvider와 동일한 경계(§4). */
  loaded: boolean;
  /** true = 초기 GET 이 네트워크 실패 등으로 완전히 실패했다. loaded 와 동시에 true 가 될 수 없다. */
  loadError: boolean;
}

function deriveValue(config: ProductTagsConfig): ProductTagSettingsValue {
  const labelBySlug: Record<string, string> = {};
  const visibleSlugs: string[] = [];
  const filterOptions: ProductTagFilterOption[] = [];

  for (const item of config.items) {
    labelBySlug[item.slug] = item.label;
    if (item.isVisible) {
      visibleSlugs.push(item.slug);
      if (item.showInShopFilter) filterOptions.push({ slug: item.slug, label: item.label });
    }
  }

  return { labelBySlug, visibleSlugs, hiddenSlugs: [...config.hiddenSlugs], filterOptions };
}

const defaultValue = deriveValue(defaultProductTagsConfig);

export const ProductTagSettingsContext = createContext<ProductTagSettingsContextType | undefined>(undefined);

export function ProductTagSettingsProvider({ children }: { children: ReactNode }) {
  // 첫 페인트는 defaultProductTagsConfig 로 현재 고객 홈페이지 표기(라벨·필터 5개)를 보장하고,
  // 마운트 후 GET /api/product-tags 가 관리자 저장값으로 하이드레이트한다(콘센트 경계 — provider만
  // fetch, §4). CategorySettingsProvider와 동일하게 no-store로 매 마운트마다 최신값을 받는다.
  const [value, setValue] = useState<ProductTagSettingsValue>(defaultValue);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/product-tags', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: ProductTagsConfig) => {
        if (cancelled) return;
        if (!data || !Array.isArray(data.items) || !Array.isArray(data.hiddenSlugs)) {
          setLoadError(true);
          return;
        }
        setValue(deriveValue(data));
        setLoaded(true);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('Failed to load product tags from /api/product-tags', e);
        setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const contextValue = useMemo<ProductTagSettingsContextType>(
    () => ({ ...value, loaded, loadError }),
    [value, loaded, loadError],
  );

  return (
    <ProductTagSettingsContext.Provider value={contextValue}>
      {children}
    </ProductTagSettingsContext.Provider>
  );
}

export function useProductTagSettings() {
  const context = useContext(ProductTagSettingsContext);
  if (context === undefined) {
    throw new Error('useProductTagSettings must be used within a ProductTagSettingsProvider');
  }
  return context;
}
