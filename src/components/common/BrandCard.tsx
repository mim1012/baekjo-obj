import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { Brand } from '@/types';

interface Props {
  brand: Brand;
}

export default function BrandCard({ brand }: Props) {
  return (
    <Link
      href={`/brands/${brand.id}`}
      className="group flex min-h-72 flex-col justify-between rounded-[18px] bg-white border border-[rgba(15,23,42,0.08)] p-6 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_10px_28px_rgba(15,23,42,0.06)]"
    >
      <div>
        <div className="flex items-start justify-between">
          <span className="font-editorial text-4xl italic text-slate-300">
            {brand.name.slice(0, 1)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FBFAF7] border border-[rgba(15,23,42,0.08)] px-3 py-1 text-[11px] font-semibold text-[#17211D]">
            <Check className="size-3" />
            Audit {brand.auditGrade}
          </span>
        </div>

        <h3 className="mt-7 text-balance font-editorial text-2xl text-[#17211D] tracking-tight">{brand.name}</h3>
        <p className="mt-3 line-clamp-3 text-pretty text-sm leading-6 text-[#64748B]">
          {brand.description}
        </p>
      </div>

      <div className="mt-8">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#17211D] mb-4 group-hover:text-slate-600 transition-colors">
          브랜드 이야기
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </span>
        <div className="flex flex-wrap gap-2">
          {['성분 안전성 검증', '제조 시설 점검', '오딧 등급 ' + brand.auditGrade].map((badge) => (
            <span key={badge} className="inline-flex items-center gap-1 rounded-sm bg-[#F4EFE8] px-2.5 py-1 text-[10px] font-medium text-[#334155] transition-all duration-300 hover:bg-[#17211D] hover:text-white">
              <Check className="size-3" />
              {badge}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
