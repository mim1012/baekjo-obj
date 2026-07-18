'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { defaultCategorySettings, type CategorySettings } from '@/lib/categorySettings/config';

// 타입/기본값은 서버(API route)도 import 하므로 'use client' 가 없는 config.ts 에 있다.
// 이 provider 에서 기존 방식으로 import 하던 다른 파일들이 깨지지 않도록 그대로 재노출한다.
export type { CategorySettings, BrandFilter } from '@/lib/categorySettings/config';
export { defaultCategorySettings } from '@/lib/categorySettings/config';

interface CategorySettingsContextType {
  categorySettings: CategorySettings;
  updateCategorySettings: (newSettings: CategorySettings) => Promise<boolean>;
  /** true = 마운트 후 GET /api/category-settings 가 성공적으로 resolve 됐다(DB 실 데이터든, 서버
   * 폴백 default 든 무관). 공개 소비자(ShopContent·BrandsContent 등, audit class C)는 이 값을 쓰지
   * 않고 그대로 default-first 렌더를 유지한다 — 관리자 편집 화면(admin/categories)만 이 값으로
   * 저장 레이스를 막는다(전수조사 A-2). */
  loaded: boolean;
  /** true = 초기 GET 이 네트워크 실패 등으로 완전히 실패했다. loaded 와 동시에 true 가 될 수 없다. */
  loadError: boolean;
}

export const CategorySettingsContext = createContext<CategorySettingsContextType | undefined>(undefined);

export function CategorySettingsProvider({ children }: { children: ReactNode }) {
  // 첫 페인트는 defaultCategorySettings 로 카테고리를 보장하고, 마운트 후 GET /api/category-settings 가
  // DB 에 저장된 실제 설정으로 하이드레이트한다(콘센트 경계 — provider 만 fetch, §4).
  const [categorySettings, setCategorySettings] = useState<CategorySettings>(defaultCategorySettings);
  // 사용자가 한 번이라도 편집(updateCategorySettings 호출)했으면 true — 늦게 도착하는 초기 GET 이
  // 그 편집을 덮어쓰지 못하도록 막는 가드(하드 리로드 레이스 방지). loaded 는 이것과 별개다 —
  // userWrote 는 "늦게 도착한 GET 이 이미 한 편집을 덮지 않게" 막고, loaded 는 "GET 이 오기 전에는
  // 편집·저장을 아예 시작할 수 없게" 막는다(전수조사 A-2, 2026-07-18 — 로드 전 편집을 허용하면
  // 화면에 안 보인 카테고리들이 default 값 그대로 실 DB 위에 PUT 될 수 있었다).
  const userWrote = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/category-settings')
      .then((res) => res.json())
      .then((data: { settings?: CategorySettings }) => {
        if (cancelled) return;
        if (!data?.settings) {
          setLoadError(true);
          return;
        }
        if (!userWrote.current) setCategorySettings(data.settings);
        setLoaded(true);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('Failed to load category settings from /api/category-settings', e);
        setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 낙관적 갱신: 화면(관리자 편집)은 즉시 반영하고, DB 저장 성공 여부는 Promise<boolean> 으로
  // 반환한다 — 호출부(admin/products/page.tsx)가 실패 시 사용자에게 알릴 수 있도록.
  const updateCategorySettings = (newSettings: CategorySettings): Promise<boolean> => {
    userWrote.current = true;
    const prev = categorySettings;
    setCategorySettings(newSettings);
    return fetch('/api/admin/category-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    })
      .then((res) => {
        if (!res.ok) {
          console.error('Failed to save category settings to DB', res.status);
          setCategorySettings(prev);
          return false;
        }
        return true;
      })
      .catch((e) => {
        console.error('Failed to save category settings to /api/admin/category-settings', e);
        setCategorySettings(prev);
        return false;
      });
  };

  return (
    <CategorySettingsContext.Provider value={{ categorySettings, updateCategorySettings, loaded, loadError }}>
      {children}
    </CategorySettingsContext.Provider>
  );
}

export function useCategorySettings() {
  const context = useContext(CategorySettingsContext);
  if (context === undefined) {
    throw new Error('useCategorySettings must be used within CategorySettingsProvider');
  }
  return context;
}
