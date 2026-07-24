import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/common/AppShell";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ë°±ì¡°?¤ë¸Œ??| ë°˜ë ¤?í™œ???„ë¦„?¤ìš´ ê¸°ì?",
    template: "%s | ë°±ì¡°?¤ë¸Œ??,
  },
  description:
    "ë°˜ë ¤?™ë¬¼ê³??¨ê»˜?˜ëŠ” ?œê°„?????¤ë˜, ???„ë¦„?µê²Œ. ê²€ì¦ëœ ë¸Œëœ?œì? ?„ë¬¸ê°€??ê¸°ì????œê³³?ì„œ ë§Œë‚˜ë³´ì„¸??",
};

import { SiteSettingsProvider } from "@/components/providers/SiteSettingsProvider";
import { CategorySettingsProvider } from "@/components/providers/CategorySettingsProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" translate="no" className={`h-full antialiased ${playfair.variable}`}>
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="flex min-h-full flex-col bg-white font-sans text-[#17211D]">
        <SiteSettingsProvider>
          <CategorySettingsProvider>
            <AppShell>{children}</AppShell>
          </CategorySettingsProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
