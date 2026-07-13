'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingBag, Star, Package } from 'lucide-react';
import { useState } from 'react';
import { addToCart } from '@/lib/cart';
import { calcDiscount, formatPrice } from '@/lib/format';
import { isWishlisted, toggleWishlist } from '@/lib/storage';
import { useMounted } from '@/lib/useMounted';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'shop';
}

const concernLabels: Record<string, string> = {
  tear: '눈물',
  joint: '관절',
  skin: '피부',
  obesity: '체중',
  picky: '편식',
  digestion: '배변',
  stress: '스트레스',
  senior: '시니어',
  nutrition: '영양',
  oral: '구강',
  grooming: '그루밍',
  living: '생활',
};

export default function ProductCard({ product, variant = 'default' }: ProductCardProps) {
  const mounted = useMounted();
  const [, refreshWishlist] = useState(0);
  const [cartMessage, setCartMessage] = useState('');
  const wishlisted = mounted && isWishlisted(product.id);
  const brandName = product.brandName ?? product.brandId;
  const hasPrice = product.price !== null && product.price !== undefined;
  const isSellable = hasPrice && product.stock > 0;
  const isShopCard = variant === 'shop';
  const discount = hasPrice ? calcDiscount(product.price!, product.salePrice ?? undefined) : 0;
  const detailHref = `/shop/${product.id}`;

  const handleWishlist = () => {
    toggleWishlist(product.id);
    refreshWishlist((version) => version + 1);
  };

  const handleCart = () => {
    if (!isSellable) return;
    addToCart({
      productId: product.id,
      optionId: product.options?.[0]?.id,
      quantity: 1,
    });
    setCartMessage('장바구니에 담았어요.');
    window.setTimeout(() => setCartMessage(''), 1800);
  };

  const availabilityLabel = !hasPrice ? '판매 준비 중' : product.stock <= 0 ? '잠시 품절' : null;

  return (
    <article className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[18px] border border-[#E3DCCF] bg-[#FFFEFB] transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-[#CFC3B1] hover:shadow-[0_8px_24px_rgba(23,37,31,0.05)]">
      <Link href={detailHref} className="absolute inset-0 z-0" aria-label={`${product.name} 상세 보기`} />

      <div className="relative z-10 flex flex-1 flex-col pointer-events-none">
        
        <div className="relative aspect-square w-full overflow-hidden bg-[#F2EEE6]">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw"
              className="object-contain p-5 transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-[#A39B90]">
                <Package className="h-7 w-7" />
                <span className="text-xs">상품 이미지 준비 중</span>
              </div>
            </div>
          )}

          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 pr-3">
            {product.isBest && (
              <span className="rounded-full bg-[#17211D] px-2.5 py-1 text-[10px] md:text-[11px] font-bold text-[#FBFAF7]">
                BEST
              </span>
            )}
            {product.isRecommended && (
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] md:text-[11px] font-bold text-[#17211D]">
                SELECTED
              </span>
            )}
            {availabilityLabel && (
              <span className="rounded-full bg-[#FBFAF7]/95 px-2.5 py-1 text-[10px] md:text-[11px] font-bold text-[#6F766F]">
                {availabilityLabel}
              </span>
            )}
          </div>

          {!isShopCard && (
            <div className="pointer-events-auto absolute bottom-3 right-3 flex gap-2 opacity-100 transition-all duration-300 lg:translate-y-1 lg:opacity-0 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100 lg:group-hover:translate-y-0 lg:group-hover:opacity-100">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleCart();
                }}
                disabled={!isSellable}
                className="flex size-9 items-center justify-center rounded-full border border-[#E7E0D5] bg-white/95 text-[#17211D] shadow-sm transition-colors duration-300 hover:bg-[#F3EEE6] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ShoppingBag className="size-4" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleWishlist();
                }}
                className="flex size-9 items-center justify-center rounded-full border border-[#E7E0D5] bg-white/95 text-[#17211D] shadow-sm transition-colors duration-300 hover:bg-[#F3EEE6]"
              >
                <Heart className={`size-4 ${wishlisted ? 'fill-[#9E3939] text-[#9E3939]' : ''}`} />
              </button>
            </div>
          )}

          {isShopCard && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleWishlist();
              }}
              className="pointer-events-auto absolute right-3 top-3 flex size-[38px] items-center justify-center rounded-full border border-[#E7E0D5] bg-white/90 text-[#17211D] shadow-sm transition-colors duration-300 hover:bg-[#F3EEE6]"
            >
              <Heart className={`size-4 ${wishlisted ? 'fill-[#9E3939] text-[#9E3939]' : ''}`} />
            </button>
          )}

          {cartMessage && (
            <div role="status" className="absolute inset-x-3 bottom-3 rounded-full bg-[#17211D] px-4 py-2 text-center text-xs font-semibold text-[#FBFAF7]">
              {cartMessage}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col p-[14px] md:p-5">
          <p className="truncate text-[12px] leading-none text-[#858078]">{brandName}</p>
          <h3 className="mt-2 min-h-[48px] line-clamp-2 break-keep text-[14px] md:text-[15px] font-medium leading-[1.55] text-[#26332D]">
            {product.name}
          </h3>

          <div className="mt-auto pt-4 md:pt-[18px]">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              {hasPrice ? (
                <>
                  {discount > 0 && <span className="text-sm font-bold text-[#A8742E]">{discount}%</span>}
                  <p className="text-[17px] md:text-[19px] font-bold tracking-[-0.02em] text-[#17251F]">
                    {formatPrice(product.salePrice || product.price!)}
                  </p>
                  {discount > 0 && (
                    <span className="text-xs tabular-nums text-[#8A918B] line-through">{formatPrice(product.price!)}</span>
                  )}
                </>
              ) : (
                <p className="text-[17px] md:text-[19px] font-bold tracking-[-0.02em] text-[#17251F]">{formatPrice(0)}</p>
              )}
            </div>
            
            <div className="mt-[10px] md:mt-[12px] flex items-center text-[12px] md:text-[13px] text-[#6F766F]">
              <Star className="size-3 fill-[#D8C4A3] text-[#D8C4A3]" aria-hidden="true" />
              <span className="ml-1 font-medium tabular-nums">{product.rating}</span>
              <span className="mx-1.5">·</span>
              <span className="tabular-nums">후기 {product.reviewCount}</span>
            </div>
            
            {!isShopCard && product.concernTags && product.concernTags.length > 0 && (
              <div className="mt-3 flex min-h-[28px] flex-wrap gap-1.5">
                {product.concernTags.slice(0, 3).map((tag) => (
                  <span key={tag} className="flex items-center justify-center rounded-full bg-[#FAF8F3] px-[9px] md:px-[11px] h-[24px] md:h-[28px] text-[11px] md:text-[12px] text-[#6F766F]">
                    {concernLabels[tag] ?? tag}
                  </span>
                ))}
                {product.concernTags.length > 3 && (
                  <span className="flex items-center justify-center rounded-full bg-[#FAF8F3] px-[9px] md:px-[11px] h-[24px] md:h-[28px] text-[11px] md:text-[12px] text-[#6F766F]">
                    +{product.concernTags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {isShopCard && (
          <div className="pointer-events-auto px-[14px] md:px-5 pb-[14px] md:pb-5">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleCart();
              }}
              disabled={!isSellable}
              className="flex min-h-[42px] w-full items-center justify-center gap-1.5 rounded-xl border border-[#E7E0D5] bg-white text-sm font-semibold text-[#17211D] transition-colors duration-300 hover:bg-[#F3EEE6] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[44px]"
            >
              <ShoppingBag className="size-4" />
              {isSellable ? '장바구니' : (availabilityLabel ?? '구매 불가')}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
