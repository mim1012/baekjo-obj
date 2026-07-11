'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { shopCategoryFilters, toShopCategoryOption } from '@/data/shopFilters';

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
  productCategories: shopCategoryFilters.map((category) => category.label),
  lifestyleCategories: shopCategoryFilters.map((category) => category.label),
  brandFilters: [
    { id: 'all', label: '전체' },
    { id: 'recommended', label: '전문가 추천' },
    { id: 'new', label: '신규 입점' },
  ],
};

function normalizeCategorySettings(settings: CategorySettings): CategorySettings {
  const normalizeList = (values: string[]) => Array.from(new Set(
    values.map((value) => toShopCategoryOption(value).label).filter(label => !label.includes('A등급') && !label.includes('A 등급') && !label.includes('인증'))
  ));

  return {
    ...settings,
    productCategories: normalizeList(settings.productCategories || []),
    lifestyleCategories: normalizeList(settings.lifestyleCategories || []),
    brandFilters: (settings.brandFilters || defaultCategorySettings.brandFilters).filter(f => !f.label.includes('A등급') && !f.label.includes('A 등급') && !f.label.includes('인증')),
  };
}

interface CategorySettingsContextType {
  categorySettings: CategorySettings;
  updateCategorySettings: (newSettings: CategorySettings) => void;
}

export const CategorySettingsContext = createContext<CategorySettingsContextType | undefined>(undefined);

export function CategorySettingsProvider({ children }: { children: ReactNode }) {
  const [categorySettings, setCategorySettings] = useState<CategorySettings>(defaultCategorySettings);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem('categorySettings');
        if (saved) {
          setCategorySettings(normalizeCategorySettings(JSON.parse(saved) as CategorySettings));
        }
      } catch (e) {
        console.error('Failed to load category settings from localStorage', e);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const updateCategorySettings = (newSettings: CategorySettings) => {
    const normalizedSettings = normalizeCategorySettings(newSettings);
    setCategorySettings(normalizedSettings);
    try {
      localStorage.setItem('categorySettings', JSON.stringify(normalizedSettings));
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
