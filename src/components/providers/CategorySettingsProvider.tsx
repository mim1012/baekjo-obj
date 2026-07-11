'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

export interface BrandFilter {
  id: string;
  label: string;
}

export interface CategorySettings {
  productCategories: string[];
  lifestyleCategories: string[];
  brandFilters: BrandFilter[];
}

export const defaultCategorySettings: CategorySettings = {
  productCategories: ['사료', '간식', '영양제', '위생용품', '생활용품', '장난감', '산책용품', '미용용품'],
  lifestyleCategories: ['식사와 영양', '건강과 관리', '향기와 위생', '주거와 미학', '놀이와 활동', '기록과 소품'],
  brandFilters: [
    { id: 'all', label: '전체 브랜드' },
    { id: 'recommended', label: '전문가 추천' },
    { id: 'new', label: '신규 입점' },
  ],
};

interface CategorySettingsContextType {
  categorySettings: CategorySettings;
  updateCategorySettings: (newSettings: CategorySettings) => Promise<boolean>;
}

export const CategorySettingsContext = createContext<CategorySettingsContextType | undefined>(undefined);

export function CategorySettingsProvider({ children }: { children: ReactNode }) {
  // 첫 페인트는 defaultCategorySettings 로 카테고리를 보장하고, 마운트 후 GET /api/category-settings 가
  // DB 에 저장된 실제 설정으로 하이드레이트한다(콘센트 경계 — provider 만 fetch, §4).
  const [categorySettings, setCategorySettings] = useState<CategorySettings>(defaultCategorySettings);
  // 사용자가 한 번이라도 편집(updateCategorySettings 호출)했으면 true — 늦게 도착하는 초기 GET 이
  // 그 편집을 덮어쓰지 못하도록 막는 가드(하드 리로드 레이스 방지).
  const userWrote = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/category-settings')
      .then((res) => res.json())
      .then((data: { settings?: CategorySettings }) => {
        if (cancelled || userWrote.current || !data?.settings) return;
        setCategorySettings(data.settings);
      })
      .catch((e) => {
        console.error('Failed to load category settings from /api/category-settings', e);
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
    <CategorySettingsContext.Provider value={{ categorySettings, updateCategorySettings }}>
      {children}
    </CategorySettingsContext.Provider>
  );
}

export function useCategorySettings() {
  const context = useContext(CategorySettingsContext);
  if (context === undefined) {
    return { categorySettings: defaultCategorySettings, updateCategorySettings: () => Promise.resolve(false) };
  }
  return context;
}
