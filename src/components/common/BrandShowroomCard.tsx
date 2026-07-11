import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';
import { Brand, Product } from '@/types';
import { formatPrice } from '@/lib/format';

interface Props {
  brand: Brand;
  products?: Product[];
}

export default function BrandShowroomCard({ brand, products = [] }: Props) {
  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 rounded-[24px] bg-white border border-[rgba(15,23,42,0.06)] p-6 lg:p-10 transition-all hover:shadow-[0_12px_40px_rgba(15,23,42,0.04)] group">
      {/* 1. Brand Visual Placeholder */}
      <div className="w-full lg:w-5/12 aspect-[4/3] lg:aspect-auto lg:h-full bg-[#FBFAF7] rounded-[16px] flex items-center justify-center border border-[rgba(15,23,42,0.04)] overflow-hidden relative">
        <span className="font-editorial text-7xl italic text-slate-200 transition-transform duration-700 group-hover:scale-110">
          {brand.name.slice(0, 1)}
        </span>
      </div>

      {/* 2. Brand Info & Curation */}
      <div className="w-full lg:w-7/12 flex flex-col justify-between py-2">
        <div>
          <div className="mb-4 inline-flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#1D3E2F] bg-[#1D3E2F]/10 px-2.5 py-1 rounded-sm">
              MD&apos;s Pick
            </span>
            <span className="text-[12px] font-medium text-[#64748B]">
              깐깐한 기준을 통과한 신뢰할 수 있는 브랜드
            </span>
          </div>
          
          <h3 className="text-3xl lg:text-4xl font-editorial text-[#17211D] tracking-tight mb-4">
            {brand.name}
          </h3>
          
          <p className="text-sm lg:text-base leading-relaxed text-[#334155] mb-6 line-clamp-3 lg:pr-8">
            {brand.description}
          </p>
        </div>

        {/* 3. Product Previews */}
        {products.length > 0 && (
          <div className="border-t border-[rgba(15,23,42,0.06)] pt-6 mb-8 grid grid-cols-2 gap-4 lg:gap-6">
            {products.map(product => (
              <Link href={`/shop/${product.id}`} key={product.id} className="flex gap-4 group/product">
                <div className="shrink-0 w-20 h-20 bg-[#FBFAF7] rounded-[10px] border border-[rgba(15,23,42,0.04)] flex flex-col items-center justify-center transition-colors group-hover/product:border-[rgba(15,23,42,0.12)]">
                  <span className="font-editorial text-2xl italic text-slate-300">{product.category.slice(0, 1)}</span>
                </div>
                <div className="flex flex-col justify-center min-w-0">
                  <span className="text-[10px] font-bold text-slate-400 mb-1 tracking-wider">REPRESENTATIVE</span>
                  <span className="text-sm font-semibold text-[#17211D] truncate group-hover/product:text-[#1D3E2F] transition-colors">{product.name}</span>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-[#64748B]">
                    <Star className="size-3 fill-current text-slate-300" />
                    <span>{product.rating}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 4. Action */}
        <div>
          <Link
            href={`/brands/${brand.id}`}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(15,23,42,0.1)] bg-white px-8 py-3.5 text-sm font-semibold text-[#17211D] transition-all hover:bg-[#17211D] hover:text-white group w-full sm:w-auto"
          >
            브랜드 쇼룸 둘러보기
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
