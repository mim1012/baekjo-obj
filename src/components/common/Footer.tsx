import Link from 'next/link';
import BrandMark from './BrandMark';

export default function Footer() {
  return (
    <footer className="border-t border-[rgba(15,23,42,0.06)] bg-[#F4EFE8] pb-20 text-[#64748B] md:pb-0">
      <div className="site-container py-14 lg:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link href="/" aria-label="백조오브제 홈" className="inline-flex text-[#17211D]">
              <BrandMark />
            </Link>
            <p className="mt-6 max-w-md text-pretty text-sm leading-7 text-[#334155]">
              반려동물과 함께하는 평범한 하루가 오래도록 아름답도록.
              백조오브제는 성분, 쓰임, 지속 가능성을 살펴 좋은 기준만을 제안합니다.
            </p>
            <div className="mt-7 flex gap-5 text-sm text-[#64748B]">
              <a href="#" className="hover:text-[#17211D] transition-colors">Instagram</a>
              <a href="#" className="hover:text-[#17211D] transition-colors">YouTube</a>
              <Link href="/notices" className="hover:text-[#17211D] transition-colors">Notice</Link>
            </div>
          </div>

          <div>
            <h2 className="font-editorial text-lg text-[#17211D]">Customer care</h2>
            <ul className="mt-5 space-y-2 text-sm leading-6 text-[#64748B]">
              <li className="tabular-nums text-base text-[#17211D] font-semibold">1644-0000</li>
              <li>평일 10:00 — 17:00</li>
              <li>점심 12:00 — 13:00</li>
              <li>주말 및 공휴일 휴무</li>
            </ul>
          </div>

          <div>
            <h2 className="font-editorial text-lg text-[#17211D]">Baekjo Company</h2>
            <ul className="mt-5 space-y-2 text-xs leading-6 text-[#64748B]">
              <li>대표 김백조</li>
              <li>사업자등록번호 123-45-67890</li>
              <li>통신판매업신고 2023-서울강남-1234</li>
              <li>서울특별시 강남구 테헤란로 123</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-[rgba(15,23,42,0.06)] pt-7 text-xs text-[#64748B] md:flex-row md:items-center md:justify-between">
          <div className="flex gap-5">
            <Link href="#" className="hover:text-[#17211D] transition-colors">이용약관</Link>
            <Link href="#" className="font-semibold text-[#334155] hover:text-[#17211D] transition-colors">개인정보처리방침</Link>
          </div>
          <p>© 2026 Baekjo Company. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
