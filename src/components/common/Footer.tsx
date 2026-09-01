'use client';

import Link from 'next/link';
import { usePublicSiteContent } from '@/components/providers/PublicSiteContentProvider';
import BrandMark from './BrandMark';

export default function Footer({ variant = 'default' }: { variant?: 'default' | 'home' }) {
  const siteContent = usePublicSiteContent();
  const company = siteContent.company;
  const footerLinks = siteContent.navigation.footerLinks.filter((link) => link.visible);
  const isHome = variant === 'home';
  return (
    <footer className="bg-[#202521] pb-20 text-[#FBFAF7]/65 md:pb-0">
      <div className={isHome ? 'mx-auto w-full max-w-[1180px] px-5 sm:px-6 lg:px-8 py-12' : 'site-container-wide py-12'}>
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <Link
            href="/"
            aria-label="백조오브제 홈"
            className="block shrink-0"
          >
            <BrandMark inverse />
          </Link>

          <div className="flex flex-col gap-5 md:items-end">
            <nav aria-label="푸터 메뉴" className="flex flex-wrap gap-x-5 gap-y-3 text-sm md:justify-end">
              {footerLinks.map((link) => (
                <Link key={link.href} href={link.href} className="inline-flex min-h-11 items-center transition-colors duration-500 hover:text-[#FBFAF7] md:min-h-0">
                  {link.label}
                </Link>
              ))}
              <a
                href={company.businessLookupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center transition-colors duration-500 hover:text-[#FBFAF7] md:min-h-0"
              >
                사업자정보
              </a>
            </nav>

            <div className="flex items-center gap-3" aria-label="SNS">
              <span className="text-xs font-semibold tracking-[0.12em] text-[#FBFAF7]/70">SNS</span>
              <SnsButton href={siteContent.social.instagramUrl} label="인스타그램" tone="instagram" disabled={!siteContent.social.instagramUrl}>
                <InstagramIcon />
              </SnsButton>
              <SnsButton href={siteContent.social.kakaoTalkUrl} label="카카오톡" tone="kakao" disabled={!siteContent.social.kakaoTalkUrl}>
                <KakaoIcon />
              </SnsButton>
              <p className="ml-1 shrink-0 text-xs text-[#FBFAF7]/70">{siteContent.social.instagramLabel}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[#FBFAF7]/10 pt-6 text-xs md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.12em] text-[#FBFAF7]">BAEKJO OBJET</p>
            <p className="mt-3 max-w-2xl leading-6 text-[#FBFAF7]/70">
              {company.name} · 대표 {company.ceo} · 사업자등록번호 {company.businessNumber} · 통신판매업신고 {company.mailOrderNumber}
            </p>
            <p className="mt-1 max-w-2xl leading-6 text-[#FBFAF7]/70">
              사업장주소 {company.address} · 전화 {company.tel}
            </p>
            <p className="mt-1 max-w-2xl leading-6 text-[#FBFAF7]/70">
              영업시간 {company.supportHours}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function SnsButton({
  href,
  label,
  tone,
  disabled = false,
  children,
}: {
  href: string;
  label: string;
  tone: 'instagram' | 'kakao';
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const tones = {
    instagram: 'border-transparent bg-[radial-gradient(circle_at_30%_107%,#fdf497_0%,#fdf497_5%,#fd5949_45%,#d6249f_60%,#285AEB_90%)] text-white shadow-[0_8px_18px_rgba(214,36,159,0.18)] hover:brightness-110',
    kakao: 'border-transparent bg-[#FEE500] text-[#000000] shadow-[0_8px_18px_rgba(254,229,0,0.12)] hover:bg-[#F7D900]',
  };
  const className = `flex size-11 items-center justify-center rounded-full transition-all duration-500 md:size-9 ${
    disabled ? `${tones[tone]} cursor-not-allowed` : tones[tone]
  }`;

  if (disabled) {
    return (
      <button type="button" aria-label={`${label} 링크 준비 중`} title={`${label} 링크 준비 중`} disabled className={className}>
        {children}
      </button>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className={className}>
      {children}
    </a>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[18px]" fill="none">
      <rect x="4.5" y="4.5" width="15" height="15" rx="4.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3.6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.6" cy="7.4" r="1.1" fill="currentColor" />
    </svg>
  );
}

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[19px]" fill="none">
      <path
        d="M12 5.2c-4.35 0-7.7 2.65-7.7 5.95 0 2.13 1.42 4 3.55 5.05l-.58 2.42a.45.45 0 0 0 .7.47l2.9-1.94c.37.04.75.06 1.13.06 4.35 0 7.7-2.65 7.7-5.95S16.35 5.2 12 5.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
