import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/common/AppShell";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/data/site";

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

import { SiteSettingsProvider } from "@/components/providers/SiteSettingsProvider";
import { CategorySettingsProvider } from "@/components/providers/CategorySettingsProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" translate="no" data-scroll-behavior="smooth" className={`h-full antialiased ${playfair.variable}`}>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="flex min-h-full flex-col bg-[#FBFAF7] font-sans text-[#17211D]">
        <SiteSettingsProvider>
          <CategorySettingsProvider>
            <AppShell>{children}</AppShell>
          </CategorySettingsProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
