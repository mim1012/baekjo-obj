'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultProductTagsConfig, type ProductTagDefinition } from '@/lib/productTags/config';

interface ProductTagSettingsContextValue {
  items: ProductTagDefinition[];
  labelBySlug: Readonly<Record<string, string>>;
  knownSlugs: ReadonlySet<string>;
  visibleSlugs: ReadonlySet<string>;
  hiddenSlugs: ReadonlySet<string>;
  loaded: boolean;
  reload: () => Promise<void>;
}

export const PRODUCT_TAGS_CHANGED_EVENT = 'baekjo:product-tags-changed';

const Context = createContext<ProductTagSettingsContextValue | null>(null);

async function fetchProductTags(): Promise<{ items: ProductTagDefinition[]; hiddenSlugs: string[] }> {
  const response = await fetch('/api/product-tags', { cache: 'no-store' });
  if (!response.ok) throw new Error(`product-tags:${response.status}`);
  const body = await response.json() as { items?: ProductTagDefinition[]; hiddenSlugs?: string[] };
  if (!Array.isArray(body.items) || !Array.isArray(body.hiddenSlugs)) {
    throw new Error('product-tags:invalid-response');
  }
  return { items: body.items, hiddenSlugs: body.hiddenSlugs };
}

export function ProductTagSettingsProvider({ children }: { children: ReactNode }) {
  // 첫 화면은 현재 홈페이지에 쓰던 값과 정확히 같은 기본값으로 렌더해 깜빡임·문구 변경을 막는다.
  const [items, setItems] = useState<ProductTagDefinition[]>(defaultProductTagsConfig.items);
  const [deletedSlugs, setDeletedSlugs] = useState<string[]>(defaultProductTagsConfig.hiddenSlugs);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const body = await fetchProductTags();
      setItems(body.items);
      setDeletedSlugs(body.hiddenSlugs);
      setLoaded(true);
    } catch (error) {
      console.error('Failed to load product tags', error);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchProductTags()
      .then((body) => {
        if (cancelled) return;
        setItems(body.items);
        setDeletedSlugs(body.hiddenSlugs);
        setLoaded(true);
      })
      .catch((error) => {
        if (!cancelled) console.error('Failed to load product tags', error);
      });
    const handleChanged = () => void reload();
    window.addEventListener(PRODUCT_TAGS_CHANGED_EVENT, handleChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(PRODUCT_TAGS_CHANGED_EVENT, handleChanged);
    };
  }, [reload]);

  const labelBySlug = useMemo(
    () => Object.fromEntries(items.filter((item) => item.isVisible).map((item) => [item.slug, item.label])),
    [items],
  );
  const visibleSlugs = useMemo(
    () => new Set(items.filter((item) => item.isVisible).map((item) => item.slug)),
    [items],
  );
  const knownSlugs = useMemo(() => new Set(items.map((item) => item.slug)), [items]);
  const hiddenSlugs = useMemo(() => new Set(deletedSlugs), [deletedSlugs]);

  return (
    <Context.Provider value={{ items, labelBySlug, knownSlugs, visibleSlugs, hiddenSlugs, loaded, reload }}>
      {children}
    </Context.Provider>
  );
}

export function useProductTagSettings(): ProductTagSettingsContextValue {
  const value = useContext(Context);
  if (!value) throw new Error('useProductTagSettings must be used within ProductTagSettingsProvider');
  return value;
}
