import Link from 'next/link';
import BrandMark from './BrandMark';
import { COMPANY } from '@/data/company';

const exploreLinks = [
  { label: '고민별 케어', href: '/concerns' },
  { label: '브랜드', href: '/brands' },
  { label: '셀렉션', href: '/shop' },
  { label: '보험 분석', href: '/insurance' },
];

const storyLinks = [
  { label: '전문가의 기준', href: '/experts' },
  { label: '반려가족 이야기', href: '/reviews' },
  { label: '백조 소식', href: '/notices' },
  { label: '파트너 회원가입', href: '/signup' },
];

export default function Footer() {
  return (
    <footer className="bg-[#202521] pb-20 text-[#FBFAF7]/65 md:pb-0">
      <div className="site-container-wide py-16 lg:py-20">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.5fr_0.7fr_0.7fr_0.9fr]">
          <div>
            <Link href="/" aria-label="백조오브제 홈" className="inline-flex text-[#FBFAF7]">
              <BrandMark inverse />
            </Link>
            <p className="mt-6 max-w-md break-keep text-sm leading-7 text-[#FBFAF7]/70">
              좋은 선택이 오래 함께하는 시간을 만든다고 믿어요. 성분과 쓰임, 브랜드가 지켜 온 태도까지 살펴
              반려생활에 꼭 필요한 것만 차분히 소개합니다.
            </p>
            <p className="mt-6 font-editorial text-sm italic tracking-wide text-[#D8C4A3]">
              Chosen with care, shared with love.
            </p>
          </div>

          <FooterNav title="둘러보기" links={exploreLinks} />
          <FooterNav title="백조 이야기" links={storyLinks} />

          <div>
            <h2 className="text-sm font-semibold text-[#FBFAF7]">도움이 필요하신가요?</h2>
            <p className="mt-5 text-xl font-semibold tabular-nums text-[#FBFAF7]">{COMPANY.tel}</p>
            <ul className="mt-3 space-y-1 text-xs leading-6">
              <li>평일 오전 10시 — 오후 5시</li>
              <li>점심 오후 12시 — 1시</li>
              <li>주말과 공휴일은 쉬어가요</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-6 border-t border-[#FBFAF7]/10 pt-8 text-xs md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Link href="/terms" className="transition-colors duration-500 hover:text-[#FBFAF7]">이용약관</Link>
              <Link href="/privacy" className="font-semibold text-[#FBFAF7]/85 transition-colors duration-500 hover:text-[#FBFAF7]">개인정보처리방침</Link>
              <Link href="/refund-policy" className="transition-colors duration-500 hover:text-[#FBFAF7]">배송·교환·환불 안내</Link>
              <a
                href={COMPANY.businessLookupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors duration-500 hover:text-[#FBFAF7]"
              >
                사업자정보확인
              </a>
            </div>
            <p className="mt-4 max-w-2xl leading-6 text-[#FBFAF7]/45">
              {COMPANY.name} · 대표 {COMPANY.ceo} · 사업자등록번호 {COMPANY.businessNumber} · 통신판매업신고 {COMPANY.mailOrderNumber}
              <br />
              {COMPANY.address} · 고객센터 {COMPANY.tel}
            </p>
          </div>
          <p className="shrink-0 text-[#FBFAF7]/45">© 2026 Baekjo Company.</p>
        </div>
      </div>
    </footer>
  );
}

interface FooterNavProps {
  title: string;
  links: Array<{ label: string; href: string }>;
}

function FooterNav({ title, links }: FooterNavProps) {
  return (
    <nav aria-label={title}>
      <h2 className="text-sm font-semibold text-[#FBFAF7]">{title}</h2>
      <ul className="mt-5 space-y-3 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="transition-colors duration-500 hover:text-[#FBFAF7]">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
