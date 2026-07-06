import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Concern } from '@/types';

interface Props {
  concern: Concern;
}

export default function ConcernCard({ concern }: Props) {
  return (
    <Link
      href={`/concerns/${concern.slug}`}
      className="group flex min-h-48 flex-col justify-between rounded-[18px] bg-[#FBFAF7] border border-[rgba(15,23,42,0.08)] p-5 transition-all duration-500 hover:scale-[1.02] hover:bg-white hover:shadow-[0_10px_28px_rgba(15,23,42,0.06)] sm:p-6"
    >
      <div className="flex items-start justify-between">
        <span className="flex size-11 items-center justify-center rounded-full bg-[#F4EFE8] text-xl shadow-sm">
          {concern.icon}
        </span>
        <ArrowUpRight className="size-4 text-slate-300 transition-colors duration-300 group-hover:text-[#17211D]" />
      </div>
      <div className="mt-8">
        <h3 className="text-balance font-editorial text-xl text-[#17211D] tracking-tight">{concern.title}</h3>
        <p className="mt-2 line-clamp-2 text-pretty text-xs leading-5 text-[#64748B]">
          {concern.shortDescription}
        </p>
      </div>
    </Link>
  );
}
