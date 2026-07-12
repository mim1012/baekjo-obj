'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { defaultHomeSettings, HomeSettings } from '@/data/homeContent';

interface SiteSettingsContextType {
  settings: HomeSettings;
  updateSettings: (newSettings: HomeSettings) => Promise<boolean>;
}

export const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  // 첫 페인트는 defaultHomeSettings 로 콘텐츠를 보장하고, 마운트 후 GET /api/settings 가
  // DB 에 저장된 실제 설정으로 하이드레이트한다(콘센트 경계 — provider 만 fetch, §4).
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data: { settings?: HomeSettings }) => {
        if (cancelled || !data?.settings) return;
        setSettings(data.settings);
      })
      .catch((e) => {
        console.error('Failed to load settings from /api/settings', e);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 낙관적 갱신: 화면(관리자 미리보기)은 즉시 반영하고, DB 저장 성공 여부는 Promise<boolean> 으로
  // 반환한다 — 호출부(admin/settings/page.tsx)가 실패 시 사용자에게 알릴 수 있도록.
  const updateSettings = (newSettings: HomeSettings): Promise<boolean> => {
    setSettings(newSettings);
    return fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSettings),
    })
      .then((res) => {
        if (!res.ok) {
          console.error('Failed to save settings to DB', res.status);
          return false;
        }
        return true;
      })
      .catch((e) => {
        console.error('Failed to save settings to /api/admin/settings', e);
        return false;
      });
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
