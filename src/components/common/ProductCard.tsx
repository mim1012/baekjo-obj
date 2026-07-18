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
  density?: 'default' | 'compact';
  mobileLayout?: 'vertical' | 'horizontal';
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

export default function ProductCard({
  product,
  variant = 'default',
  density = 'default',
  mobileLayout = 'vertical',
}: ProductCardProps) {
  const mounted = useMounted();
  const [, refreshWishlist] = useState(0);
  const [cartMessage, setCartMessage] = useState('');
  const wishlisted = mounted && isWishlisted(product.id);
  const brandName = product.brandName ?? product.brandId;
  const hasPrice = product.price !== null && product.price !== undefined;
  const isSellable = hasPrice && product.stock > 0;
  const isShopCard = variant === 'shop';
  const isCompact = density === 'compact';
  const isMobileHorizontal = mobileLayout === 'horizontal';
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

      <div className={isMobileHorizontal
        ? "pointer-events-none relative z-10 grid flex-1 grid-cols-[116px_minmax(0,1fr)] grid-rows-[40px_1fr_auto] md:flex md:flex-col"
        : "pointer-events-none relative z-10 flex flex-1 flex-col"
      }>
        <div className={isMobileHorizontal
          ? "col-span-2 row-start-1 flex h-10 shrink-0 flex-nowrap items-center gap-1 overflow-hidden bg-[#FFFEFB] px-3 py-2"
          : isCompact
            ? "flex h-10 shrink-0 flex-nowrap items-center gap-1 overflow-hidden bg-[#FFFEFB] px-3 py-2"
            : "flex h-12 shrink-0 flex-nowrap items-center gap-1 overflow-hidden bg-[#FFFEFB] px-2 py-2 md:h-auto md:min-h-12 md:flex-wrap md:gap-1.5 md:px-4"
        }>
          {product.isBest && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-[#17211D] px-1.5 py-1 text-[9px] font-bold leading-none text-[#FBFAF7] md:px-2.5 md:text-[11px]">
              BEST
            </span>
          )}
          {product.isRecommended && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-[#F3EEE6] px-1.5 py-1 text-[9px] font-bold leading-none text-[#17211D] md:px-2.5 md:text-[11px]">
              SELECTED
            </span>
          )}
          {availabilityLabel && (
            <span className="shrink-0 whitespace-nowrap rounded-full bg-[#FAF8F3] px-1.5 py-1 text-[9px] font-bold leading-none text-[#6F766F] md:px-2.5 md:text-[11px]">
              {availabilityLabel}
            </span>
          )}
        </div>

        <div className={isMobileHorizontal
          ? "relative col-start-1 row-span-2 row-start-2 min-h-[220px] w-full overflow-hidden bg-[#F2EEE6] md:aspect-[4/3] md:min-h-0"
          : `relative w-full overflow-hidden bg-[#F2EEE6] ${isCompact ? 'aspect-[4/3]' : 'aspect-square'}`
        }>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              loading={isMobileHorizontal ? 'eager' : 'lazy'}
              unoptimized={isMobileHorizontal}
              sizes={isMobileHorizontal
                ? '(max-width: 767px) 116px, (max-width: 1279px) 33vw, 25vw'
                : '(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw'
              }
              className={`object-contain transition-transform duration-700 ease-out group-hover:scale-105 ${isCompact ? 'p-3 md:p-4' : 'p-3 md:p-5'}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-[#A39B90]">
                <Package className="h-7 w-7" />
                <span className="text-xs">상품 이미지 준비 중</span>
              </div>
            </div>
          )}
        </div>

        <div className={isMobileHorizontal
          ? "col-start-2 row-start-2 flex min-w-0 flex-col p-3 md:p-4"
          : `flex flex-1 flex-col ${isCompact ? 'p-4' : 'p-4 md:p-6'}`
        }>
          <p className="break-keep text-[11px] leading-[1.5] text-[#858078] md:text-[12px]">{brandName}</p>
          <h3 className={`break-keep font-bold leading-[1.55] text-[#26332D] ${isCompact ? 'mt-1.5 text-[14px]' : 'mt-1.5 text-[13px] md:mt-2 md:text-[15px]'}`}>
            {product.name}
          </h3>

          <div className={`mt-auto ${isCompact ? 'pt-3' : 'pt-3 md:pt-[18px]'}`}>
            <div className="flex flex-wrap items-baseline gap-x-1.5 md:gap-x-2 gap-y-1">
              {hasPrice ? (
                <>
                  {discount > 0 && <span className={`font-bold text-[#A8742E] ${isCompact ? 'text-[13px]' : 'text-[13px] md:text-sm'}`}>{discount}%</span>}
                  <p className={`font-bold tracking-[-0.02em] text-[#17251F] ${isCompact ? 'text-[17px]' : 'text-[15px] md:text-[19px]'}`}>
                    {formatPrice(product.salePrice || product.price!)}
                  </p>
                  {discount > 0 && (
                    <span className={`text-xs tabular-nums text-[#8A918B] line-through ${isCompact ? 'basis-auto' : 'basis-full md:basis-auto'}`}>{formatPrice(product.price!)}</span>
                  )}
                </>
              ) : (
                <p className={`font-bold tracking-[-0.02em] text-[#17251F] ${isCompact ? 'text-[17px]' : 'text-[15px] md:text-[19px]'}`}>가격 협의</p>
              )}
            </div>

            <div className={`flex items-center text-[#6F766F] ${isCompact ? 'mt-2 text-[11px]' : 'mt-[8px] text-[11px] md:mt-[12px] md:text-[13px]'}`}>
              <Star className="size-2.5 md:size-3 fill-[#D8C4A3] text-[#D8C4A3]" aria-hidden="true" />
              <span className="ml-1 font-medium tabular-nums">{product.rating}</span>
              <span className="mx-1.5">·</span>
              <span className="tabular-nums">후기 {product.reviewCount}</span>
            </div>

            {!isShopCard && product.concernTags && product.concernTags.length > 0 && (
              <div className={`mt-3 flex flex-wrap gap-1.5 ${isCompact ? 'min-h-6' : 'min-h-[28px]'}`}>
                {product.concernTags.map((tag) => (
                  <span key={tag} className="flex items-center justify-center rounded-full bg-[#FAF8F3] px-[9px] md:px-[11px] h-[24px] md:h-[28px] text-[11px] md:text-[12px] text-[#6F766F]">
                    {concernLabels[tag] ?? tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={isMobileHorizontal
          ? "pointer-events-auto col-start-2 row-start-3 px-3 pb-3 md:px-4 md:pb-4"
          : `pointer-events-auto ${isCompact ? 'px-4 pb-4' : 'px-4 pb-4 md:px-6 md:pb-6'}`
        }>
          {cartMessage && (
            <div role="status" className="mb-2 rounded-xl bg-[#17211D] px-3 py-2 text-center text-xs font-semibold text-[#FBFAF7]">
              {cartMessage}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                handleCart();
              }}
              disabled={!isSellable}
              className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border border-[#E7E0D5] bg-white px-1.5 font-semibold text-[#17211D] transition-colors duration-300 hover:bg-[#F3EEE6] disabled:cursor-not-allowed disabled:opacity-50 ${isCompact ? 'min-h-10 text-[12px]' : 'min-h-[42px] text-[11px] sm:min-h-[44px] sm:gap-1.5 sm:px-2 sm:text-sm'}`}
            >
              <ShoppingBag className="size-3.5 shrink-0 sm:size-4" />
              <span className="whitespace-nowrap">{isSellable ? '장바구니' : (availabilityLabel ?? '구매 불가')}</span>
            </button>
            <button
              type="button"
              aria-label={wishlisted ? `${product.name} 찜 해제` : `${product.name} 찜하기`}
              onClick={(e) => {
                e.preventDefault();
                handleWishlist();
              }}
              className={`flex shrink-0 items-center justify-center rounded-xl border border-[#E7E0D5] bg-white text-[#17211D] transition-colors duration-300 hover:bg-[#F3EEE6] ${isCompact ? 'size-10' : 'size-[42px] sm:size-[44px]'}`}
            >
              <Heart className={`size-4 ${wishlisted ? 'fill-[#9E3939] text-[#9E3939]' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
