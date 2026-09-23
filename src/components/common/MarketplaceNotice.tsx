import Link from 'next/link';
import { Scale } from 'lucide-react';
import { MARKETPLACE_NOTICE } from '@/data/customerNotices';

export default function MarketplaceNotice({
  className = '',
  variant = 'light',
}: {
  className?: string;
  variant?: 'light' | 'dark';
}) {
  const isDark = variant === 'dark';

  return (
    <aside
      data-testid="marketplace-notice"
      aria-label="통신판매중개 안내"
      className={`rounded-[16px] border px-5 py-4 ${
        isDark
          ? 'border-[#FBFAF7]/15 bg-[#FBFAF7]/[0.05] text-[#FBFAF7]/75'
          : 'border-[#DED8CC] bg-[#FAF8F3] text-[#59615B]'
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <Scale className={`mt-0.5 size-4 shrink-0 ${isDark ? 'text-[#E5D2B4]' : 'text-[#7A4E1D]'}`} aria-hidden="true" />
        <div className="min-w-0">
          <p className={`text-[13px] font-bold ${isDark ? 'text-[#FBFAF7]' : 'text-[#17211D]'}`}>
            통신판매중개 안내
          </p>
          <p className="mt-1.5 break-keep text-sm leading-6 ">{MARKETPLACE_NOTICE}</p>
          <Link
            href="/terms"
            className={`mt-2 inline-flex min-h-8 items-center text-[12px] font-semibold underline underline-offset-4 ${
              isDark ? 'text-[#FBFAF7]' : 'text-[#2F3B34]'
            }`}
          >
            이용약관에서 자세히 보기
          </Link>
        </div>
      </div>
    </aside>
  );
}
