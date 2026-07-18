'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { defaultHomeSettings, HomeSettings } from '@/data/homeContent';

interface SiteSettingsContextType {
  settings: HomeSettings;
  updateSettings: (newSettings: HomeSettings) => Promise<boolean>;
  /** true = 마운트 후 GET /api/settings 가 성공적으로 resolve 됐다(DB 실 데이터든, 서버 폴백 default
   * 든 무관 — "settings 값이 임의로 초기 useState 시드가 아니라 서버 응답임"만 보장한다). 공개
   * 홈(§ audit class C, default-first SSR fallback)은 이 값을 쓰지 않고 그대로 default-first 렌더를
   * 유지한다 — 관리자 편집 화면(admin/settings)만 이 값으로 저장 레이스를 막는다(전수조사 A-1). */
  loaded: boolean;
  /** true = 초기 GET 이 네트워크 실패 등으로 완전히 실패했다(응답 자체가 깨짐 — 서버가 500 을
   * 내지 않는 한 거의 발생하지 않는다). loaded 와 동시에 true 가 될 수 없다. */
  loadError: boolean;
}

export const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  // 첫 페인트는 defaultHomeSettings 로 콘텐츠를 보장하고, 마운트 후 GET /api/settings 가
  // DB 에 저장된 실제 설정으로 하이드레이트한다(콘센트 경계 — provider 만 fetch, §4).
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);
  // loaded/loadError — 관리자 저장 화면이 "GET 이 실제로 resolve 되기 전엔 편집·저장을 시작할 수
  // 없다"를 강제하는 근거다. 로드 전 편집을 허용하면 dirty 락이 늦게 도착한 실제 설정의 resync 를
  // 영구히 막아, 화면에 안 보인 섹션들이 default 값 그대로 실 DB 위에 PUT 되는 레이스가 있었다
  // (전수조사 A-1, 2026-07-18).
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data: { settings?: HomeSettings }) => {
        if (cancelled) return;
        if (!data?.settings) {
          setLoadError(true);
          return;
        }
        setSettings(data.settings);
        setLoaded(true);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('Failed to load settings from /api/settings', e);
        setLoadError(true);
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
    <SiteSettingsContext.Provider value={{ settings, updateSettings, loaded, loadError }}>
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
