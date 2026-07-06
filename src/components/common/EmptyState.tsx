import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Feather } from 'lucide-react';

interface Props {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({
  icon = <Feather className="size-8 text-[#667368]" />,
  title,
  description,
  actionLabel = '추천 상품 둘러보기',
  actionHref = '/shop',
}: Props) {
  return (
    <div className="flex w-full flex-col items-center justify-center border border-dashed border-[#C9C8C0] bg-[#F8F7F2] px-6 py-20 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-full border border-[#D8D6CE] bg-[#EFEEE8]">
        {icon}
      </div>
      <h3 className="text-balance font-editorial text-xl text-[#2F3B34]">{title}</h3>
      <p className="mt-2 max-w-sm text-pretty text-sm leading-6 text-[#747B75]">{description}</p>
      <Link
        href={actionHref}
        className="mt-7 inline-flex items-center gap-2 bg-[#2F3B34] px-5 py-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#3C4941]"
      >
        {actionLabel}
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
