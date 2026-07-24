import Link from 'next/link';
import BrandMark from './BrandMark';
import { COMPANY } from '@/data/company';

// 클라이언트 요청(2026-07-24)으로 간결 구성: 로고 / 1:1 문의 / 이용약관 /
// 개인정보처리방침 / 사업자정보 / SNS. 사업자 법정 표기 한 줄은 유지한다.
export default function Footer() {
  return (
    <footer className="bg-[#202521] pb-20 text-[#FBFAF7]/65 md:pb-0">
      <div className="site-container-wide py-14 lg:py-16">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/" aria-label="백조오브제 홈" className="inline-flex text-[#FBFAF7]">
              <BrandMark inverse />
            </Link>
            <p className="mt-4 font-editorial text-sm tracking-[0.2em] text-[#D8C4A3]">BAEKJO OBJET</p>
          </div>

          <nav aria-label="푸터 메뉴" className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm md:justify-end">
            <Link href="/mypage?tab=inquiries" className="transition-colors duration-500 hover:text-[#FBFAF7]">1:1 문의</Link>
            <Link href="/terms" className="transition-colors duration-500 hover:text-[#FBFAF7]">이용약관</Link>
            <Link href="/privacy" className="font-semibold text-[#FBFAF7]/85 transition-colors duration-500 hover:text-[#FBFAF7]">개인정보처리방침</Link>
            <a
              href={COMPANY.businessLookupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-500 hover:text-[#FBFAF7]"
            >
              사업자정보
            </a>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-[#FBFAF7]/10 pt-6 text-xs md:flex-row md:items-end md:justify-between">
          <p className="max-w-2xl leading-6 text-[#FBFAF7]/45">
            {COMPANY.name} · 대표 {COMPANY.ceo} · 사업자등록번호 {COMPANY.businessNumber} · 통신판매업신고 {COMPANY.mailOrderNumber}
            <br />
            {COMPANY.address} · 고객센터 {COMPANY.tel}
          </p>
          <div className="flex shrink-0 flex-col gap-1 md:items-end">
            <p className="text-[#FBFAF7]/70">
              <span className="mr-2 font-semibold text-[#FBFAF7]/85">SNS</span>@BAEKJO OBJET
            </p>
            <p className="text-[#FBFAF7]/45">© 2026 Baekjo Company.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
