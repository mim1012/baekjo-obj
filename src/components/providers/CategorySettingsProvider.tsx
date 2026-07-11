'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  updateCategorySettings: (newSettings: CategorySettings) => void;
}

export const CategorySettingsContext = createContext<CategorySettingsContextType | undefined>(undefined);

export function CategorySettingsProvider({ children }: { children: ReactNode }) {
  const [categorySettings, setCategorySettings] = useState<CategorySettings>(defaultCategorySettings);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('categorySettings');
      if (saved) {
        // localStorage is client-only; loading after mount keeps SSR hydration consistent
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCategorySettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load category settings from localStorage', e);
    }
  }, []);

  const updateCategorySettings = (newSettings: CategorySettings) => {
    setCategorySettings(newSettings);
    try {
      localStorage.setItem('categorySettings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save category settings to localStorage', e);
    }
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
    return { categorySettings: defaultCategorySettings, updateCategorySettings: () => {} };
  }
  return context;
}
