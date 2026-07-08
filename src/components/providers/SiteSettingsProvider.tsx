'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { defaultHomeSettings, HomeSettings } from '@/data/homeContent';

interface SiteSettingsContextType {
  settings: HomeSettings;
  updateSettings: (newSettings: HomeSettings) => void;
}

export const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);

  useEffect(() => {
    // Load from localStorage on mount
    try {
      const saved = localStorage.getItem('siteSettings');
      if (saved) {
        // localStorage is client-only; loading after mount keeps SSR hydration consistent
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettings(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load settings from localStorage', e);
    }
  }, []);

  const updateSettings = (newSettings: HomeSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('siteSettings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  };

  return (
    <SiteSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
}
