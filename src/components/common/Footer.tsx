import Link from 'next/link';
import { COMPANY } from '@/data/company';
import BrandMark from './BrandMark';

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

          <nav aria-label="푸터 메뉴" className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
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
            <Link href="/notices" className="transition-colors duration-500 hover:text-[#FBFAF7]">
              SNS
            </Link>
          </nav>
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
