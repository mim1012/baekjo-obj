import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/common/AppShell";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/data/site";
import { getPublishedPageContent } from "@/lib/cms/content";
import type { SiteShellContent } from "@/lib/cms/source/siteShell";
import { logServerError } from "@/lib/logServerError";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | 백조오브제",
  },
  description: SITE_DESCRIPTION,
  // 파비콘/앱아이콘/og·twitter 이미지는 src/app 의 icon.png·apple-icon.png·
  // opengraph-image.png·twitter-image.png·favicon.ico 를 Next.js 가 자동 인식한다.
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "백조오브제",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

import { CategorySettingsProvider } from "@/components/providers/CategorySettingsProvider";
import PageTextRuntime from "@/components/providers/PageTextRuntime";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // getPublishedPageContent → cachedPublishedCmsPage(public-read-cache.ts)는 unstable_cache로
  // 태그('cmsPages')·60초 revalidate가 걸려 있고, 그 아래 getSupabase()는 고정 URL/시크릿 키로
  // 클라이언트를 만들 뿐 cookies()/headers() 등 동적 API를 전혀 쓰지 않는다. audit·b2b·shop·
  // brands 등 이미 같은 경로로 CMS를 읽는 다른 페이지들도 force-dynamic 없이 정적/ISR을 유지하고
  // 있으므로, 루트 레이아웃에서 이 값을 읽어도 '/', '/audit'처럼 자체적으로 force-dynamic을
  // 선언하지 않은 라우트가 동적으로 승격되지 않는다(2026-09-15 npm run build 라우트 표로 대조 확인).
  const siteShell = await getPublishedPageContent<SiteShellContent>('site-shell').catch(
    (error: unknown) => {
      logServerError('[RootLayout] site-shell CMS 조회 실패', error);
      return null;
    },
  );

  return (
    <html lang="ko" translate="no" data-scroll-behavior="smooth" className={`h-full antialiased ${playfair.variable}`}>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="flex min-h-full flex-col bg-[#FBFAF7] font-sans text-[#17211D]">
        <CategorySettingsProvider>
          <AppShell siteShell={siteShell}>{children}</AppShell>
          <PageTextRuntime />
        </CategorySettingsProvider>
      </body>
    </html>
  );
}
