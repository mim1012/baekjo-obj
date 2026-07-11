'use client';

import Link from 'next/link';
import { Heart, ShoppingBag, Star, Check } from 'lucide-react';
import { Product } from '@/types';
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
  // brandName 은 repo 가 조인해 내려준다(콘센트 — src/types/index.ts Product.brandName).
  // 브랜드 전체 목록을 다시 불러올 필요 없이 상품 데이터 자체로 표시한다.
  const brandName = product.brandName ?? product.brandId;

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
    <Link href={`/shop/${product.id}`} className="group block w-full rounded-[16px] bg-card border border-border overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-md">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-sub">
        {product.image ? (
          <img src={product.image} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-3 text-center opacity-50">
            <ShoppingBag className="size-5 text-[#A8742E]/40 mb-1.5" strokeWidth={1.5} />
            <span className="text-[9px] font-semibold uppercase tracking-widest text-[#8A7A64]">BAEKJO SELECTION</span>
          </div>
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.isBest && (
            <span className="bg-navy px-2.5 py-1 text-[9px] font-bold text-white rounded-sm">BEST</span>
          )}
          {product.isRecommended && (
            <span className="bg-card/90 backdrop-blur-sm border border-border px-2.5 py-1 text-[9px] font-bold text-text-sub rounded-sm">
              CURATED
            </span>
          )}
        </div>

        <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            onClick={handleCart}
            aria-label={`${product.name} 장바구니에 담기`}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-text-main shadow-sm hover:bg-bg transition-colors"
          >
            <ShoppingBag className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={`${product.name} 찜하기`}
            className="flex size-10 items-center justify-center rounded-full border border-border bg-card text-text-main shadow-sm hover:bg-bg transition-colors"
          >
            <Heart className={`size-4 ${wishlisted ? 'fill-error text-error' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-4 pt-4">
        <p className="text-[10px] font-medium text-text-sub">
          {brandName} · {product.category}
        </p>
        <h3 className="mt-1 line-clamp-2 min-h-[36px] text-pretty text-[13px] font-medium leading-relaxed text-text-main tracking-tight">
          {product.name}
        </h3>

        <div className="mt-2 flex flex-wrap gap-1">
          {product.concernTags.slice(0, 2).map((tag) => (
            <span key={tag} className="border border-border bg-bg rounded-sm px-2 py-0.5 text-[9px] text-text-sub">
              {concernLabels[tag] ?? tag}
            </span>
          ))}
        </div>

        <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {product.price !== null && product.price !== undefined ? (
            <>
              {discount > 0 && <span className="text-[13px] font-bold text-[#A8742E] tracking-tight">{discount}%</span>}
              <span className="font-semibold tabular-nums text-text-main tracking-tight">
                {formatPrice(product.salePrice || product.price!)}
              </span>
              {discount > 0 && (
                <span className="text-xs tabular-nums text-text-sub line-through tracking-tight">
                  {formatPrice(product.price!)}
                </span>
              )}
            </>
          ) : (
            <span className="font-semibold tabular-nums text-text-main tracking-tight">
              {formatPrice(0)}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-1 text-[11px] text-text-sub">
          <Star className="size-3 fill-slate-300 text-slate-300" />
          <span className="font-medium tabular-nums text-text-sub">{product.rating}</span>
          <span className="tabular-nums">({product.reviewCount})</span>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5 pt-4 border-t border-border">
          {['안전성 검증 완료', '품질 오딧 통과'].map((badge) => (
            <span key={badge} className="inline-flex items-center gap-1 rounded-sm bg-bg border border-border px-1.5 py-0.5 text-[9px] font-medium text-text-sub transition-all duration-300 hover:bg-navy hover:text-white hover:border-navy cursor-default">
              <Check className="size-2.5" />
              {badge}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
