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
    default: "백조오브제 | 반려생활의 아름다운 기준",
    template: "%s | 백조오브제",
  },
  description:
    "반려동물과 함께하는 시간을 더 오래, 더 아름답게. 검증된 브랜드와 전문가의 기준을 한곳에서 만나보세요.",
};

import { SiteSettingsProvider } from "@/components/providers/SiteSettingsProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`h-full antialiased ${playfair.variable}`}>
      <body className="flex min-h-full flex-col bg-[#F4F2EC] font-sans text-[#202521]">
        <SiteSettingsProvider>
          <AppShell>{children}</AppShell>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
