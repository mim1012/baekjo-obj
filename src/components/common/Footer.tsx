import Link from 'next/link';
import { COMPANY } from '@/data/company';
import BrandMark from './BrandMark';

const INSTAGRAM_URL = 'https://www.instagram.com/baekjo.objet/';
const KAKAO_TALK_URL = '';

const footerLinks = [
  { label: '1:1 문의', href: '/mypage?tab=inquiries' },
  { label: '이용약관', href: '/terms' },
  { label: '개인정보처리방침', href: '/privacy' },
];

export default function Footer({ variant = 'default' }: { variant?: 'default' | 'home' }) {
  const isHome = variant === 'home';
  return (
    <footer className="bg-[#202521] pb-20 text-[#FBFAF7]/65 md:pb-0">
      <div className={isHome ? 'mx-auto w-full max-w-[1180px] px-5 sm:px-6 lg:px-8 py-12' : 'site-container-wide py-12'}>
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <Link href="/" aria-label="백조오브제 홈" className="inline-flex text-[#FBFAF7]">
            <BrandMark inverse />
          </Link>

          <div className="flex flex-col gap-5 md:items-end">
            <nav aria-label="푸터 메뉴" className="flex flex-wrap gap-x-5 gap-y-3 text-sm md:justify-end">
              {footerLinks.map((link) => (
                <Link key={link.href} href={link.href} className="transition-colors duration-500 hover:text-[#FBFAF7]">
                  {link.label}
                </Link>
              ))}
              <a
                href={COMPANY.businessLookupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-500 hover:text-[#FBFAF7]"
              >
                사업자정보
              </a>
            </nav>

            <div className="flex items-center gap-3" aria-label="SNS">
              <span className="text-xs font-semibold tracking-[0.12em] text-[#FBFAF7]/45">SNS</span>
              <SnsButton href={INSTAGRAM_URL} label="인스타그램">
                <InstagramIcon />
              </SnsButton>
              <SnsButton href={KAKAO_TALK_URL} label="카카오톡" disabled={!KAKAO_TALK_URL}>
                <KakaoIcon />
              </SnsButton>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[#FBFAF7]/10 pt-6 text-xs md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[13px] font-semibold tracking-[0.12em] text-[#FBFAF7]">BAEKJO OBJET</p>
            <p className="mt-3 max-w-2xl leading-6 text-[#FBFAF7]/45">
              {COMPANY.name} · 대표 {COMPANY.ceo} · 사업자등록번호 {COMPANY.businessNumber} · 통신판매업신고 {COMPANY.mailOrderNumber}
            </p>
          </div>
          <p className="shrink-0 text-[#FBFAF7]/45">@BAEKJO OBJET</p>
        </div>
      </div>
    </footer>
  );
}

function SnsButton({
  href,
  label,
  disabled = false,
  children,
}: {
  href: string;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const className = `flex size-9 items-center justify-center rounded-full border border-[#FBFAF7]/15 transition-colors duration-500 ${
    disabled
      ? 'cursor-not-allowed text-[#FBFAF7]/25'
      : 'text-[#FBFAF7]/70 hover:border-[#FBFAF7]/35 hover:bg-[#FBFAF7]/10 hover:text-[#FBFAF7]'
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
