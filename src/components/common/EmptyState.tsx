import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Feather } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  compact?: boolean;
}

export default function EmptyState({
  icon = <Feather className="size-8 text-[#667368]" />,
  title,
  description,
  actionLabel = '추천 상품 둘러보기',
  actionHref = '/shop',
  compact = false,
}: EmptyStateProps) {
  if (compact) {
    return (
      <div className="flex w-full flex-col items-center justify-center rounded-2xl border border-[#E7E0D5] bg-[#FBFAF7] px-6 py-8 sm:py-10 text-center min-h-[150px]">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[#F3EEE6] text-[#A8742E]">
          {icon}
        </div>
        <h3 className="break-keep text-base font-bold text-[#17211D]">{title}</h3>
        <p className="mt-1 max-w-sm break-keep text-[13px] leading-relaxed text-[#6F766F]">{description}</p>
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[#E7E0D5] bg-white px-4 py-2 text-[13px] font-semibold text-[#17211D] transition-colors hover:bg-[#F3EEE6]"
          >
            {actionLabel}
            <ArrowRight className="size-3" />
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center justify-center border border-dashed border-[#C9C8C0] bg-[#F8F7F2] px-6 py-20 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full border border-[#D8D6CE] bg-[#EFEEE8]">
        {icon}
      </div>
      <h3 className="text-balance font-editorial text-xl text-[#2F3B34]">{title}</h3>
      <p className="mt-2 max-w-sm text-pretty text-sm leading-6 text-[#747B75]">{description}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-7 inline-flex items-center gap-2 bg-[#2F3B34] px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#3C4941]"
        >
          {actionLabel}
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}
