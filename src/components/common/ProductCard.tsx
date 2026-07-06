'use client';

import Link from 'next/link';
import { Heart, ShoppingBag, Star, Check } from 'lucide-react';
import { Product } from '@/types';
import { brands } from '@/data/brands';
import { formatPrice, calcDiscount } from '@/lib/format';
import { toggleWishlist, isWishlisted } from '@/lib/storage';
import { addToCart } from '@/lib/cart';
import { useState } from 'react';
import { useMounted } from '@/lib/useMounted';

interface Props {
  product: Product;
}

const concernLabels: Record<string, string> = {
  tear: '눈물',
  joint: '관절',
  skin: '피부',
  obesity: '비만',
  picky: '편식',
  digestion: '배변',
  stress: '스트레스',
  senior: '노령',
};

export default function ProductCard({ product }: Props) {
  const mounted = useMounted();
  const [, refreshWishlist] = useState(0);
  const wishlisted = mounted && isWishlisted(product.id);
  const brandName = brands.find((brand) => brand.id === product.brandId)?.name ?? product.brandId;

  const handleWishlist = (event: React.MouseEvent) => {
    event.preventDefault();
    toggleWishlist(product.id);
    refreshWishlist((version) => version + 1);
  };

  const handleCart = (event: React.MouseEvent) => {
    event.preventDefault();
    addToCart({
      productId: product.id,
      optionId: product.options?.[0]?.id,
      quantity: 1,
    });
    alert('장바구니에 담겼습니다.');
  };

  const discount = product.price !== null && product.price !== undefined 
    ? calcDiscount(product.price!, product.salePrice ?? undefined) 
    : 0;

  return (
    <Link href={`/shop/${product.id}`} className="group block w-full rounded-[16px] bg-white border border-[rgba(15,23,42,0.08)] overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_4px_24px_rgba(15,23,42,0.04)]">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#F4EFE8]">
        <div className="absolute inset-x-[15%] bottom-[12%] top-[14%] border border-[rgba(15,23,42,0.08)] bg-[#FBFAF7] shadow-sm">
          <div className="flex h-full flex-col items-center justify-center px-3 text-center">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">BAEKJO SELECTION</span>
            <span className="mt-1.5 font-editorial text-[9px] italic text-slate-400">Object No. {product.id.replace('p', '0')}</span>
          </div>
        </div>

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.isBest && (
            <span className="bg-[#17211D] px-2.5 py-1 text-[9px] font-bold text-white rounded-sm">BEST</span>
          )}
          {product.isRecommended && (
            <span className="bg-white/90 backdrop-blur-sm border border-[rgba(15,23,42,0.08)] px-2.5 py-1 text-[9px] font-bold text-[#334155] rounded-sm">
              CURATED
            </span>
          )}
        </div>

        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            onClick={handleCart}
            aria-label={`${product.name} 장바구니에 담기`}
            className="flex size-10 items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white text-[#334155] shadow-sm hover:bg-slate-50 transition-colors"
          >
            <ShoppingBag className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={`${product.name} 찜하기`}
            className="flex size-10 items-center justify-center rounded-full border border-[rgba(15,23,42,0.08)] bg-white text-[#334155] shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Heart className={`size-4 ${wishlisted ? 'fill-[#9B5D55] text-[#9B5D55]' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 pt-5">
        <p className="text-[11px] font-medium text-[#64748B]">
          {brandName} · {product.category}
        </p>
        <h3 className="mt-1.5 line-clamp-2 min-h-[40px] text-pretty text-sm font-medium leading-5 text-[#17211D] tracking-tight">
          {product.name}
        </h3>

        <div className="mt-2 flex flex-wrap gap-1">
          {product.concernTags.slice(0, 2).map((tag) => (
            <span key={tag} className="border border-[rgba(15,23,42,0.08)] bg-[#FBFAF7] rounded-sm px-2 py-0.5 text-[9px] text-[#64748B]">
              {concernLabels[tag] ?? tag}
            </span>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {product.price !== null && product.price !== undefined ? (
            <>
              {discount > 0 && <span className="text-sm font-bold text-[#9B5D55] tracking-tight">{discount}%</span>}
              <span className="font-semibold tabular-nums text-[#17211D] tracking-tight">
                {formatPrice(product.salePrice || product.price!)}
              </span>
              {discount > 0 && (
                <span className="text-xs tabular-nums text-[#64748B] line-through tracking-tight">
                  {formatPrice(product.price!)}
                </span>
              )}
            </>
          ) : (
            <span className="font-semibold tabular-nums text-[#A65348] text-sm tracking-tight">
              가격 확인 필요
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1 text-[11px] text-[#64748B]">
          <Star className="size-3 fill-slate-300 text-slate-300" />
          <span className="font-medium tabular-nums text-[#334155]">{product.rating}</span>
          <span className="tabular-nums">({product.reviewCount})</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 pt-4 border-t border-[rgba(15,23,42,0.06)]">
          {['안전성 검증 완료', '품질 오딧 통과'].map((badge) => (
            <span key={badge} className="inline-flex items-center gap-1 rounded-sm bg-[#F4EFE8] px-1.5 py-0.5 text-[9px] font-medium text-[#334155] transition-all duration-300 hover:bg-[#17211D] hover:text-white cursor-default">
              <Check className="size-2.5" />
              {badge}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
