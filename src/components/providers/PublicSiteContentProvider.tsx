'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { getCmsPageDefinition, type CmsLinkItem } from '@/lib/cms/pageDefinitions';

export interface SiteShellContent {
  branding: { headerLogo: string; logoAlt: string };
  features: { insurance: boolean; experts: boolean };
  navigation: {
    mainLinks: CmsLinkItem[];
    storyLinks: CmsLinkItem[];
    footerLinks: CmsLinkItem[];
  };
  company: {
    serviceName: string;
    name: string;
    ceo: string;
    businessNumber: string;
    mailOrderNumber: string;
    address: string;
    tel: string;
    email: string;
    kakaoTalkUrl: string;
    privacyOfficer: string;
    hostingProvider: string;
    businessLookupUrl: string;
    supportHours: string;
  };
  social: { instagramUrl: string; instagramLabel: string; kakaoTalkUrl: string };
}

const definition = getCmsPageDefinition('site-shell');
if (!definition) throw new Error('site-shell-definition-missing');
const DEFAULT_SITE_SHELL = definition.defaultContent as unknown as SiteShellContent;

const Context = createContext<SiteShellContent>(DEFAULT_SITE_SHELL);

export function PublicSiteContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState(DEFAULT_SITE_SHELL);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/content/site-shell')
      .then(async (response) => {
        if (!response.ok) throw new Error(`site-shell-load:${response.status}`);
        return response.json() as Promise<{ content?: SiteShellContent }>;
      })
      .then((result) => {
        if (!cancelled && result.content) setContent(result.content);
      })
      .catch(() => {
        // 공개 화면은 관리자 데이터가 일시적으로 불러와지지 않아도 기본값으로 정상 동작한다.
      });
    return () => { cancelled = true; };
  }, []);

  return <Context.Provider value={content}>{children}</Context.Provider>;
}

export function usePublicSiteContent() {
  return useContext(Context);
}
